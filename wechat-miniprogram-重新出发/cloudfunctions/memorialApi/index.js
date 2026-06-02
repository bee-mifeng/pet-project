const cloud = require("wx-server-sdk");
const crypto = require("crypto");
const https = require("https");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const cards = db.collection("memorials");
const messages = db.collection("messages");
const interactions = db.collection("interactions");
const memoryItems = db.collection("memory_items");
const pawMemories = db.collection("paw_memories");
const pawMemoryComments = db.collection("paw_memory_comments");
const notifications = db.collection("notifications");

const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];
const AI_REVIEW_PROVIDER = "volcengine-doubao-review";
const AI_REVIEW_PRIORITY = {
  block: 1,
  review: 2,
  failed: 3,
  skipped: 4,
  pass: 5
};


const countFieldMap = {
  like: "like_count",
  flower: "flower_count",
  paw_light: "paw_lights_count"
};

const pawMemoryCountFieldMap = {
  like: "likes_count",
  paw: "paw_lights_count",
  favorite: "favorites_count"
};

function now() {
  return new Date();
}

function randomText(length) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function generateSlug() {
  return `memory-${Date.now().toString(36)}-${randomText(6)}`;
}

function normalizeOpenId(value) {
  return String(value || "").trim();
}

function isAdminOpenId(openid) {
  return ADMIN_OPENIDS.map(normalizeOpenId).includes(normalizeOpenId(openid));
}

const petTypeAliases = {
  cat: "cat",
  "猫": "cat",
  "猫咪": "cat",
  "英短": "cat",
  "美短": "cat",
  "布偶": "cat",
  "狸花猫": "cat",
  "橘猫": "cat",
  "三花猫": "cat",
  dog: "dog",
  "狗": "dog",
  "狗狗": "dog",
  "泰迪": "dog",
  "比熊": "dog",
  "柯基": "dog",
  "柴犬": "dog",
  "金毛": "dog",
  "拉布拉多": "dog",
  "中华田园犬": "dog",
  smallPet: "smallPet",
  "小宠": "smallPet",
  "兔子": "smallPet",
  "仓鼠": "smallPet",
  "龙猫": "smallPet",
  "豚鼠": "smallPet",
  "刺猬": "smallPet",
  exoticPet: "exoticPet",
  "异宠": "exoticPet",
  "鸟": "exoticPet",
  "鹦鹉": "exoticPet",
  "鱼": "exoticPet",
  "乌龟": "exoticPet",
  "龟": "exoticPet",
  "蜥蜴": "exoticPet",
  "蛇": "exoticPet",
  "蛙": "exoticPet",
  "昆虫": "exoticPet",
  "蜘蛛": "exoticPet",
  other: "other",
  "其他": "other",
  "其他小动物": "other"
};

function normalizePetType(type) {
  const value = String(type || "").trim();
  return petTypeAliases[value] || "other";
}

function normalizePetTypeFilter(type) {
  const value = String(type || "").trim();
  if (!value || value === "all" || value === "全部") return "";
  return normalizePetType(value);
}

function normalizePetStatus(status) {
  return ["living", "star"].includes(status) ? status : "";
}

function normalizeVisibility(visibility) {
  return ["private", "pending", "public", "rejected"].includes(visibility)
    ? visibility
    : "private";
}

function normalizeMemoryItemType(type) {
  return type === "video" ? "video" : "photo";
}

function normalizePawMemoryMediaType(type) {
  return ["image", "video", "none"].includes(type) ? type : "none";
}

function normalizePawMemoryVisibility(visibility) {
  return visibility === "private" ? "private" : "pending";
}

function todayDateText() {
  return now().toISOString().slice(0, 10);
}

function toDateText(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value.toDate === "function") return value.toDate().toISOString();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

function sortPawMemories(list) {
  return (list || []).sort((a, b) => {
    const aTime = toDateText(a.memory_date || a.created_at);
    const bTime = toDateText(b.memory_date || b.created_at);
    return bTime.localeCompare(aTime);
  });
}

function isDeletedDoc(item) {
  return !!item && (
    item.is_deleted === true ||
    !!item.deleted_at ||
    item.visibility === "deleted" ||
    item.review_status === "deleted"
  );
}

function isCloudFile(fileID) {
  return typeof fileID === "string" && fileID.indexOf("cloud://") === 0;
}

function requireAdmin(openid) {
  if (!isAdminOpenId(openid)) {
    throw new Error("NO_ADMIN_PERMISSION");
  }
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    const text = `${error && error.errCode || ""} ${error && error.errMsg || ""} ${error && error.message || ""}`;
    if (
      text.indexOf("DATABASE_COLLECTION_ALREADY_EXIST") >= 0 ||
      text.indexOf("collection already exists") >= 0 ||
      text.indexOf("already exists") >= 0
    ) {
      return;
    }
    throw error;
  }
}

async function getTempUrlMap(fileIDs) {
  const uniqueFileIDs = Array.from(new Set((fileIDs || []).filter(isCloudFile)));
  if (uniqueFileIDs.length === 0) return {};

  const result = await cloud.getTempFileURL({ fileList: uniqueFileIDs });
  const list = result && Array.isArray(result.fileList) ? result.fileList : [];

  return list.reduce((map, item) => {
    if (item.fileID && item.tempFileURL) {
      map[item.fileID] = item.tempFileURL;
    }
    return map;
  }, {});
}

function envValue(name) {
  return String(process.env && process.env[name] || "").trim();
}

function isAiReviewEnabled() {
  const value = envValue("AI_REVIEW_ENABLED").toLowerCase();
  return value === "true" || value === "1" || value === "yes" || value === "on";
}

function makeAiReviewResult(status, reason, extra) {
  const input = extra || {};
  return {
    status,
    label: input.label || status,
    score: typeof input.score === "number" ? input.score : 0,
    reason: reason || input.reason || "",
    provider: AI_REVIEW_PROVIDER,
    reviewed_at: now()
  };
}

function aiReviewFields(result) {
  const review = result || makeAiReviewResult("skipped", "未执行 AI 初审");
  return {
    ai_review_status: review.status,
    ai_review_label: review.label || review.status,
    ai_review_score: typeof review.score === "number" ? review.score : 0,
    ai_review_reason: review.reason || "",
    ai_review_provider: review.provider || AI_REVIEW_PROVIDER,
    ai_reviewed_at: review.reviewed_at || now()
  };
}

function isAiReviewPass(result) {
  return !!result && result.status === "pass";
}

function normalizeAiStatus(value) {
  const status = String(value || "").toLowerCase();
  if (status === "pass") return "pass";
  if (status === "review") return "review";
  if (status === "block") return "block";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  return "review";
}

function normalizeReviewScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function uniqueText(list) {
  const seen = {};
  return (list || []).filter((item) => {
    const value = String(item || "").trim();
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function extractImageAuditReason(response) {
  const parts = [];
  const input = response || {};
  const result = input.Result || input;

  if (result.Advice) parts.push(result.Advice);
  if (result.ImageType) parts.push(result.ImageType);
  if (result.Label) {
    if (Array.isArray(result.Label)) {
      parts.push(...result.Label);
    } else {
      parts.push(result.Label);
    }
  }
  if (result.SubLabel) {
    if (Array.isArray(result.SubLabel)) {
      parts.push(...result.SubLabel);
    } else {
      parts.push(result.SubLabel);
    }
  }

  return uniqueText(parts).slice(0, 6).join(" / ");
}

function normalizeImageAuditResult(response, fallbackLabel) {
  const result = response && response.Result ? response.Result : response || {};
  let status = normalizeAiStatus(result.Advice);
  if (result.ImageType === "normal" && !result.Advice) status = "pass";
  if (result.ImageType === "normal" && result.Advice === "pass") status = "pass";
  if (result.ImageType === "problem" && status === "pass") status = "review";

  const labelText = Array.isArray(result.Label)
    ? result.Label.join("/")
    : String(result.Label || "").trim();
  const label = labelText || fallbackLabel || status;
  const reason = extractImageAuditReason(response) || (
    status === "pass" ? "未发现明显风险" : "火山图片审核返回需复核"
  );

  return makeAiReviewResult(status, reason, {
    label,
    score: status === "pass" ? 0 : 80
  });
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value || "").digest("hex");
}

function hmacSha256(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function utcDateParts() {
  const text = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    xDate: text,
    shortDate: text.slice(0, 8)
  };
}

function encodeQueryValue(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function buildCanonicalQuery(query) {
  return Object.keys(query || {})
    .sort()
    .map((key) => `${encodeQueryValue(key)}=${encodeQueryValue(query[key])}`)
    .join("&");
}

function signVolcengineRequest(input) {
  const method = input.method || "POST";
  const host = input.host;
  const path = input.path || "/";
  const query = input.query || {};
  const body = input.body || "";
  const region = input.region || "cn-beijing";
  const service = input.service;
  const accessKeyId = input.accessKeyId;
  const secretAccessKey = input.secretAccessKey;
  const { xDate, shortDate } = utcDateParts();
  const payloadHash = sha256Hex(body);
  const canonicalQuery = buildCanonicalQuery(query);
  const signedHeaders = "content-type;host;x-content-sha256;x-date";
  const canonicalHeaders = [
    "content-type:application/json",
    `host:${host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${xDate}`
  ].join("\n") + "\n";
  const canonicalRequest = [
    method,
    path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    xDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");
  const kDate = hmacSha256(secretAccessKey, shortDate);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "request");
  const signature = hmacSha256(kSigning, stringToSign, "hex");
  const authorization = [
    `HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(", ");

  return {
    queryString: canonicalQuery,
    headers: {
      "Content-Type": "application/json",
      "Host": host,
      "X-Content-Sha256": payloadHash,
      "X-Date": xDate,
      "Authorization": authorization
    }
  };
}

function httpsRequestJson(options, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (error) {
          data = { raw: text };
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(data);
          return;
        }
        const error = new Error(`HTTP_${response.statusCode}`);
        error.response = data;
        reject(error);
      });
    });

    request.setTimeout(20000, () => {
      request.destroy(new Error("REQUEST_TIMEOUT"));
    });
    request.on("error", reject);
    if (body) request.write(body);
    request.end();
  });
}

function parseJsonObject(text) {
  const value = String(text || "").trim();
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch (parseError) {
      return null;
    }
  }
}

function normalizeDoubaoReviewResult(parsed) {
  const input = parsed || {};
  const status = normalizeAiStatus(input.status);
  const reason = String(input.reason || "").trim() || (
    status === "pass" ? "未发现明显风险" : "豆包建议人工复核"
  );

  return makeAiReviewResult(status, reason, {
    label: String(input.label || status).trim(),
    score: normalizeReviewScore(input.score)
  });
}

function normalizeReviewTextParts(parts) {
  return uniqueText(parts)
    .join("\n")
    .trim()
    .slice(0, 10000);
}

async function reviewTextContent(textParts) {
  const content = normalizeReviewTextParts(textParts || []);
  if (!content) return makeAiReviewResult("skipped", "没有需要审核的文字");

  try {
    const apiKey = envValue("VOLCENGINE_ARK_API_KEY");
    const model = envValue("VOLCENGINE_ARK_MODEL") || envValue("VOLCENGINE_ARK_ENDPOINT_ID");
    const host = envValue("VOLCENGINE_ARK_HOST") || "ark.cn-beijing.volces.com";

    if (!apiKey || !model) {
      throw new Error("MISSING_VOLCENGINE_ARK_CONFIG");
    }

    const body = JSON.stringify({
      model,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "你是 PawsMeadow 的温和内容审核器，只判断用户内容是否适合公开展示。",
            "请只输出 JSON，不要输出 Markdown。",
            "JSON 字段必须是 status、label、score、reason。",
            "status 只能是 pass、review、block。",
            "pass 表示明确安全；review 表示不确定或轻微风险；block 表示明显违规、广告、色情、违法、辱骂、仇恨、诈骗、联系方式引流或二维码引流。",
            "score 为 0 到 100 的整数，风险越高分数越高。"
          ].join("\n")
        },
        {
          role: "user",
          content: `请审核以下准备公开展示的内容：\n${content}`
        }
      ]
    });
    const response = await httpsRequestJson({
      hostname: host,
      path: "/api/v3/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(body)
      }
    }, body);
    const message = response && response.choices && response.choices[0] && response.choices[0].message;
    const parsed = parseJsonObject(message && message.content);
    if (!parsed) throw new Error("INVALID_DOUBAO_REVIEW_JSON");
    return normalizeDoubaoReviewResult(parsed);
  } catch (error) {
    console.warn("AI 文本审核失败", error);
    return makeAiReviewResult("failed", "文本审核调用失败", {
      label: "text_failed"
    });
  }
}

async function getModerationImageUrls(fileIDs) {
  const list = uniqueText(fileIDs || []);
  if (list.length === 0) return [];

  const cloudFileIDs = list.filter(isCloudFile);
  const tempUrlMap = await getTempUrlMap(cloudFileIDs);

  return list.map((fileID) => {
    if (tempUrlMap[fileID]) return tempUrlMap[fileID];
    if (/^https?:\/\//i.test(fileID)) return fileID;
    return "";
  }).filter(Boolean);
}

async function reviewSingleImage(url) {
  try {
    const accessKeyId = envValue("VOLCENGINE_ACCESS_KEY_ID");
    const secretAccessKey = envValue("VOLCENGINE_SECRET_ACCESS_KEY");
    const region = envValue("VOLCENGINE_REGION") || "cn-beijing";
    const host = envValue("VOLCENGINE_IMAGE_HOST") || "imagex.volcengineapi.com";
    const serviceId = envValue("VOLCENGINE_IMAGE_SERVICE_ID");
    const auditTemplate = envValue("VOLCENGINE_IMAGE_AUDIT_TEMPLATE");

    if (!accessKeyId || !secretAccessKey || !serviceId) {
      throw new Error("MISSING_VOLCENGINE_IMAGEX_CONFIG");
    }

    const bodyObject = {
      AuditAbility: 1,
      AuditDimensions: auditTemplate
        ? auditTemplate.split(",").map((item) => item.trim()).filter(Boolean)
        : ["porn", "sexy", "ad", "govern", "terror", "illegal"],
      AuditTextDimensions: ["ad", "charillegal"],
      EnableLargeImageDetect: true,
      ImageUri: url,
      DataId: `pawsmeadow-${Date.now()}-${randomText(6)}`
    };
    const body = JSON.stringify(bodyObject);
    const query = {
      Action: "SingleImageAudit",
      Version: "2023-05-01",
      ServiceId: serviceId
    };
    const signed = signVolcengineRequest({
      method: "POST",
      host,
      path: "/",
      query,
      body,
      region,
      service: "imagex",
      accessKeyId,
      secretAccessKey
    });
    const response = await httpsRequestJson({
      hostname: host,
      path: `/?${signed.queryString}`,
      method: "POST",
      headers: {
        ...signed.headers,
        "Content-Length": Buffer.byteLength(body)
      }
    }, body);
    return normalizeImageAuditResult(response, "image");
  } catch (error) {
    console.warn("AI 图片审核失败", error);
    return makeAiReviewResult("failed", "图片审核调用失败", {
      label: "image_failed"
    });
  }
}

function mergeAiReviewResults(results) {
  const list = (results || []).filter(Boolean);
  if (list.length === 0) {
    return makeAiReviewResult("skipped", "没有需要 AI 初审的内容");
  }

  const reviewableList = list.filter((item) => item.status !== "skipped");
  const decisionList = reviewableList.length > 0 ? reviewableList : list;
  const chosen = decisionList.slice().sort((left, right) => (
    (AI_REVIEW_PRIORITY[left.status] || 9) - (AI_REVIEW_PRIORITY[right.status] || 9)
  ))[0];

  const reasons = uniqueText(decisionList
    .filter((item) => item.status !== "pass")
    .map((item) => item.reason || item.label));
  const maxScore = decisionList.reduce((score, item) => Math.max(score, item.score || 0), 0);

  if (chosen.status === "pass") {
    return makeAiReviewResult("pass", "未发现明显风险", {
      label: chosen.label || "pass",
      score: maxScore
    });
  }

  return makeAiReviewResult(chosen.status, reasons.join("；") || chosen.reason, {
    label: chosen.label || chosen.status,
    score: maxScore
  });
}

async function reviewImageContent(fileIDs) {
  const urls = await getModerationImageUrls(fileIDs || []);
  if (urls.length === 0) return makeAiReviewResult("skipped", "没有需要审核的图片");

  const results = await Promise.all(urls.map(reviewSingleImage));
  return mergeAiReviewResults(results);
}

async function runAiReview(input) {
  if (!isAiReviewEnabled()) {
    return makeAiReviewResult("skipped", "AI_REVIEW_ENABLED 未开启");
  }

  const reviewInput = input || {};
  const [textResult, imageResult] = await Promise.all([
    reviewTextContent(reviewInput.texts || []),
    reviewImageContent(reviewInput.images || [])
  ]);

  return mergeAiReviewResults([textResult, imageResult]);
}

function sortByAiReviewPriority(list) {
  return (Array.isArray(list) ? list : []).sort((left, right) => {
    const leftPriority = AI_REVIEW_PRIORITY[left.ai_review_status] || 9;
    const rightPriority = AI_REVIEW_PRIORITY[right.ai_review_status] || 9;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return toDateText(right.created_at || right.updated_at).localeCompare(toDateText(left.created_at || left.updated_at));
  });
}

async function attachMediaUrls(cardList) {
  const list = Array.isArray(cardList) ? cardList : [];
  const fileIDs = [];

  list.forEach((card) => {
    if (card.photo_url) fileIDs.push(card.photo_url);
    if (card.video_url) fileIDs.push(card.video_url);
  });

  const urlMap = await getTempUrlMap(fileIDs);

  return list.map((card) => ({
    ...card,
    photo_src: urlMap[card.photo_url] || card.photo_url || "",
    video_src: urlMap[card.video_url] || card.video_url || ""
  }));
}

async function attachInteractionState(cardList, openid, userKey) {
  const list = Array.isArray(cardList) ? cardList : [];
  const markerValue = normalizeOpenId(openid) || String(userKey || "").trim();

  if (!markerValue || list.length === 0) {
    return list.map((card) => ({
      ...card,
      has_liked: false
    }));
  }

  const keys = list.map((card) => `like:${card._id}:${markerValue}`);

  const result = await interactions
    .where({
      dedupe_key: _.in(keys)
    })
    .limit(keys.length)
    .get();
  const touched = new Set((result.data || []).map((item) => item.dedupe_key));

  return list.map((card) => ({
    ...card,
    has_liked: touched.has(`like:${card._id}:${markerValue}`)
  }));
}

async function attachMemoryItemMediaUrls(itemList) {
  const list = Array.isArray(itemList) ? itemList : [];
  const fileIDs = [];

  list.forEach((item) => {
    if (item.media_url) fileIDs.push(item.media_url);
    if (item.cover_url) fileIDs.push(item.cover_url);
  });

  const urlMap = await getTempUrlMap(fileIDs);

  return list.map((item) => ({
    ...item,
    media_src: urlMap[item.media_url] || item.media_url || "",
    cover_src: urlMap[item.cover_url] || item.cover_url || ""
  }));
}

async function attachPawMemoryMediaUrls(memoryList) {
  const list = Array.isArray(memoryList) ? memoryList : [];
  const fileIDs = [];

  list.forEach((memory) => {
    if (memory.pet_avatar) fileIDs.push(memory.pet_avatar);
    if (memory.media_url) fileIDs.push(memory.media_url);
    if (memory.media_file_id) fileIDs.push(memory.media_file_id);
    if (memory.video_cover) fileIDs.push(memory.video_cover);
  });

  const urlMap = await getTempUrlMap(fileIDs);

  return list.map((memory) => ({
    ...memory,
    pet_avatar_src: urlMap[memory.pet_avatar] || memory.pet_avatar || "",
    media_src: urlMap[memory.media_url] || urlMap[memory.media_file_id] || memory.media_url || memory.media_file_id || "",
    video_cover_src: urlMap[memory.video_cover] || memory.video_cover || ""
  }));
}

async function attachPawMemoryInteractionState(memoryList, openid, ownerKey) {
  const list = Array.isArray(memoryList) ? memoryList : [];
  const markerValue = normalizeOpenId(openid) || String(ownerKey || "").trim();

  if (!markerValue || list.length === 0) {
    return list.map((memory) => ({
      ...memory,
      has_liked: false,
      has_pawed: false,
      has_favorited: false
    }));
  }

  const keys = [];
  list.forEach((memory) => {
    keys.push(`paw_memory:like:${memory._id}:${markerValue}`);
    keys.push(`paw_memory:paw:${memory._id}:${markerValue}`);
    keys.push(`paw_memory:favorite:${memory._id}:${markerValue}`);
  });

  const result = await interactions
    .where({
      dedupe_key: _.in(keys)
    })
    .limit(keys.length)
    .get();
  const touched = new Set((result.data || []).map((item) => item.dedupe_key));

  return list.map((memory) => ({
    ...memory,
    has_liked: touched.has(`paw_memory:like:${memory._id}:${markerValue}`),
    has_pawed: touched.has(`paw_memory:paw:${memory._id}:${markerValue}`),
    has_favorited: touched.has(`paw_memory:favorite:${memory._id}:${markerValue}`)
  }));
}

async function attachPawMemoryCommentCounts(memoryList) {
  const list = Array.isArray(memoryList) ? memoryList : [];
  if (list.length === 0) return list;

  const counts = await Promise.all(list.map(async (memory) => {
    if (!memory || !memory._id) return memory && memory.comments_count || 0;

    try {
      const result = await pawMemoryComments
        .where({
          paw_memory_id: memory._id,
          review_status: "approved"
        })
        .count();
      return result && typeof result.total === "number"
        ? result.total
        : (memory.comments_count || 0);
    } catch (error) {
      console.warn("统计小爪记忆留言数失败", memory._id, error);
      return memory.comments_count || 0;
    }
  }));

  return list.map((memory, index) => ({
    ...memory,
    comments_count: counts[index] || 0
  }));
}

async function getCardsByIds(cardIds) {
  const uniqueIds = Array.from(new Set((cardIds || []).filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 20) {
    chunks.push(uniqueIds.slice(i, i + 20));
  }

  const results = await Promise.all(chunks.map((ids) => (
    cards.where({ _id: _.in(ids) }).get()
  )));

  return results.reduce((map, result) => {
    (result.data || []).forEach((card) => {
      map[card._id] = card;
    });
    return map;
  }, {});
}

async function getVisitorCard(openid, ownerKey) {
  const normalizedOpenId = normalizeOpenId(openid);
  const normalizedOwnerKey = String(ownerKey || "").trim();

  if (normalizedOpenId) {
    const result = await cards
      .where({ owner_openid: normalizedOpenId })
      .orderBy("created_at", "desc")
      .limit(1)
      .get();
    if (result.data && result.data[0]) return result.data[0];
  }

  if (normalizedOwnerKey) {
    const result = await cards
      .where({ owner_key: normalizedOwnerKey })
      .orderBy("created_at", "desc")
      .limit(1)
      .get();
    if (result.data && result.data[0]) return result.data[0];
  }

  return null;
}

function normalizeNotificationCategory(category) {
  return ["comment", "dynamic", "reaction"].includes(category) ? category : "";
}

function notificationRecipientKey(openid, ownerKey, cardId) {
  return [
    normalizeOpenId(openid),
    String(ownerKey || "").trim(),
    String(cardId || "").trim()
  ].join("|");
}

function isSameNotificationPerson(left, right) {
  if (!left || !right) return false;

  const leftOpenId = normalizeOpenId(left.openid);
  const rightOpenId = normalizeOpenId(right.openid);
  if (leftOpenId && rightOpenId && leftOpenId === rightOpenId) return true;

  const leftOwnerKey = String(left.owner_key || "").trim();
  const rightOwnerKey = String(right.owner_key || "").trim();
  if (leftOwnerKey && rightOwnerKey && leftOwnerKey === rightOwnerKey) return true;

  const leftCardId = String(left.card_id || "").trim();
  const rightCardId = String(right.card_id || "").trim();
  return !!leftCardId && !!rightCardId && leftCardId === rightCardId;
}

function memoryNotificationTarget(memory) {
  const data = memory && memory.data ? memory.data : memory || {};
  return {
    target_title: data.pet_name || data.title || "小爪记忆",
    target_preview: data.content || "",
    target_image: data.media_type === "video"
      ? data.video_cover || data.pet_avatar || ""
      : data.media_url || data.media_file_id || data.pet_avatar || ""
  };
}

async function createNotification(input) {
  const recipientOpenId = normalizeOpenId(input.recipient_openid);
  const recipientOwnerKey = String(input.recipient_owner_key || "").trim();
  const recipientCardId = String(input.recipient_card_id || "").trim();
  const actorOpenId = normalizeOpenId(input.actor_openid);
  const actorOwnerKey = String(input.actor_owner_key || "").trim();
  const actorCardId = String(input.actor_card_id || "").trim();

  if (!recipientOpenId && !recipientOwnerKey && !recipientCardId) return null;
  if (isSameNotificationPerson(
    { openid: recipientOpenId, owner_key: recipientOwnerKey, card_id: recipientCardId },
    { openid: actorOpenId, owner_key: actorOwnerKey, card_id: actorCardId }
  )) {
    return null;
  }

  await ensureCollection("notifications");

  const uniqueKey = String(input.unique_key || "").trim();
  if (uniqueKey) {
    const existed = await notifications.where({ unique_key: uniqueKey }).limit(1).get();
    if (existed.data && existed.data.length > 0) return existed.data[0];
  }

  const createdAt = now();
  const data = {
    unique_key: uniqueKey,
    recipient_openid: recipientOpenId,
    recipient_owner_key: recipientOwnerKey,
    recipient_card_id: recipientCardId,
    actor_openid: actorOpenId,
    actor_owner_key: actorOwnerKey,
    actor_card_id: actorCardId,
    actor_name: input.actor_name || "毛孩子",
    actor_avatar: input.actor_avatar || "",
    type: input.type || "paw_memory_like",
    category: input.category || "reaction",
    target_type: input.target_type || "paw_memory",
    target_id: input.target_id || "",
    paw_memory_id: input.paw_memory_id || "",
    comment_id: input.comment_id || "",
    content_preview: String(input.content_preview || "").slice(0, 80),
    target_title: input.target_title || "小爪记忆",
    target_preview: String(input.target_preview || "").slice(0, 80),
    target_image: input.target_image || "",
    read_at: null,
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await notifications.add({ data });
  return { _id: result._id, ...data };
}

async function notifyPawMemoryLike(memory, actorCard, openid, ownerKey) {
  if (!memory || !memory.data || !actorCard || !actorCard._id) return;
  const target = memoryNotificationTarget(memory);

  await createNotification({
    unique_key: `paw_memory_like:${memory.source_type}:${memory.data._id}:${actorCard._id}`,
    recipient_openid: memory.data.owner_openid || "",
    recipient_owner_key: memory.data.owner_key || "",
    recipient_card_id: memory.data.pet_id || "",
    actor_openid: openid,
    actor_owner_key: ownerKey,
    actor_card_id: actorCard._id,
    actor_name: actorCard.pet_name || "毛孩子",
    actor_avatar: actorCard.photo_url || "",
    type: "paw_memory_like",
    category: "reaction",
    target_type: memory.source_type || "paw_memory",
    target_id: memory.data._id,
    paw_memory_id: memory.data._id,
    content_preview: target.target_preview,
    ...target
  });
}

async function notifyCardLike(card, actorCard, openid, ownerKey) {
  if (!card || !card._id) return;

  const actorKey = actorCard && actorCard._id || normalizeOpenId(openid) || String(ownerKey || "").trim();
  if (!actorKey) return;

  await createNotification({
    unique_key: `card_like:${card._id}:${actorKey}`,
    recipient_openid: card.owner_openid || "",
    recipient_owner_key: card.owner_key || "",
    recipient_card_id: card._id,
    actor_openid: openid,
    actor_owner_key: ownerKey,
    actor_card_id: actorCard && actorCard._id || "",
    actor_name: actorCard && actorCard.pet_name || "毛孩子",
    actor_avatar: actorCard && actorCard.photo_url || "",
    type: "card_like",
    category: "reaction",
    target_type: "card",
    target_id: card._id,
    content_preview: card.message || card.story || "",
    target_title: card.pet_name || "记忆卡",
    target_preview: card.story || card.message || "",
    target_image: card.photo_url || ""
  });
}

async function notifyPawMemoryCommentLike(comment, memory, actorCard, openid, ownerKey) {
  if (!comment || !actorCard || !actorCard._id) return;
  const target = memoryNotificationTarget(memory);

  await createNotification({
    unique_key: `paw_memory_comment_like:${comment._id}:${actorCard._id}`,
    recipient_openid: comment.owner_openid || "",
    recipient_owner_key: comment.owner_key || "",
    recipient_card_id: comment.visitor_card_id || "",
    actor_openid: openid,
    actor_owner_key: ownerKey,
    actor_card_id: actorCard._id,
    actor_name: actorCard.pet_name || "毛孩子",
    actor_avatar: actorCard.photo_url || "",
    type: "paw_memory_comment_like",
    category: "reaction",
    target_type: "paw_memory_comment",
    target_id: comment._id,
    paw_memory_id: comment.paw_memory_id || "",
    comment_id: comment._id,
    content_preview: comment.content || "",
    ...target
  });
}

function mergeUniqueById(list) {
  const map = {};
  (list || []).forEach((item) => {
    if (item && item._id) map[item._id] = item;
  });
  return Object.keys(map).map((id) => map[id]);
}

async function getRecipientCardIds(openid, ownerKey) {
  const normalizedOpenId = normalizeOpenId(openid);
  const normalizedOwnerKey = String(ownerKey || "").trim();
  const queries = [];

  if (normalizedOpenId) {
    queries.push(cards.where({ owner_openid: normalizedOpenId }).limit(100).get());
  }
  if (normalizedOwnerKey) {
    queries.push(cards.where({ owner_key: normalizedOwnerKey }).limit(100).get());
  }
  if (queries.length === 0) return [];

  const results = await Promise.all(queries);
  const ids = {};
  results.forEach((result) => {
    (result.data || []).forEach((card) => {
      const id = card && card._id;
      if (id) ids[id] = true;
    });
  });
  return Object.keys(ids);
}

async function queryRecipientNotifications(openid, ownerKey, options) {
  await ensureCollection("notifications");

  const normalizedOpenId = normalizeOpenId(openid);
  const normalizedOwnerKey = String(ownerKey || "").trim();
  const recipientCardIds = await getRecipientCardIds(normalizedOpenId, normalizedOwnerKey);
  const category = normalizeNotificationCategory(options && options.category);
  const unreadOnly = !!(options && options.unread_only);
  const limit = Math.min(Math.max(Number(options && options.limit) || 50, 1), 100);
  const queries = [];

  function buildWhere(base) {
    return {
      ...base,
      ...(category ? { category } : {}),
      ...(unreadOnly ? { read_at: null } : {})
    };
  }

  if (normalizedOpenId) {
    queries.push(notifications.where(buildWhere({ recipient_openid: normalizedOpenId })).orderBy("created_at", "desc").limit(limit).get());
  }
  if (normalizedOwnerKey) {
    queries.push(notifications.where(buildWhere({ recipient_owner_key: normalizedOwnerKey })).orderBy("created_at", "desc").limit(limit).get());
  }
  if (recipientCardIds.length > 0) {
    queries.push(notifications.where(buildWhere({ recipient_card_id: _.in(recipientCardIds) })).orderBy("created_at", "desc").limit(limit).get());
  }
  if (queries.length === 0) return [];

  const results = await Promise.all(queries);
  return mergeUniqueById(results.flatMap((result) => result.data || []))
    .sort((a, b) => toDateText(b.created_at).localeCompare(toDateText(a.created_at)))
    .slice(0, limit);
}

async function attachNotificationMediaUrls(notificationList) {
  const list = Array.isArray(notificationList) ? notificationList : [];
  const fileIDs = [];

  list.forEach((item) => {
    if (item.actor_avatar) fileIDs.push(item.actor_avatar);
    if (item.target_image) fileIDs.push(item.target_image);
  });

  const urlMap = await getTempUrlMap(fileIDs);
  return list.map((item) => ({
    ...item,
    actor_avatar_src: urlMap[item.actor_avatar] || item.actor_avatar || "",
    target_image_src: urlMap[item.target_image] || item.target_image || ""
  }));
}

async function listNotifications(input, openid) {
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const list = await queryRecipientNotifications(openid, ownerKey, {
    category: input.category,
    limit: input.limit
  });
  return await attachNotificationMediaUrls(list);
}

async function getUnreadNotificationCount(input, openid) {
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const list = await queryRecipientNotifications(openid, ownerKey, {
    unread_only: true,
    limit: 100
  });
  return { count: list.length };
}

async function markNotificationsRead(input, openid) {
  await ensureCollection("notifications");

  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const normalizedOpenId = normalizeOpenId(openid);
  const normalizedOwnerKey = String(ownerKey || "").trim();
  const recipientCardIds = await getRecipientCardIds(normalizedOpenId, normalizedOwnerKey);
  const readAt = now();
  const tasks = [];

  if (normalizedOpenId) {
    tasks.push(notifications.where({ recipient_openid: normalizedOpenId, read_at: null }).update({
      data: { read_at: readAt, updated_at: readAt }
    }));
  }
  if (normalizedOwnerKey) {
    tasks.push(notifications.where({ recipient_owner_key: normalizedOwnerKey, read_at: null }).update({
      data: { read_at: readAt, updated_at: readAt }
    }));
  }
  if (recipientCardIds.length > 0) {
    tasks.push(notifications.where({ recipient_card_id: _.in(recipientCardIds), read_at: null }).update({
      data: { read_at: readAt, updated_at: readAt }
    }));
  }

  if (tasks.length > 0) await Promise.all(tasks);
  return { ok: true };
}

async function mapMemoryItemsToPawMemories(itemList) {
  const list = Array.isArray(itemList) ? itemList : [];
  const cardMap = await getCardsByIds(list.map((item) => item.memorial_id));

  return list.map((item) => {
    const card = cardMap[item.memorial_id] || {};
    const mediaUrl = item.media_url || item.media_file_id || "";
    const itemType = item.item_type === "video" ? "video" : "image";

    return {
      _id: item._id,
      source_type: "memory_item",
      source_label: "记忆卡小爪记忆",
      owner_openid: item.owner_openid || card.owner_openid || "",
      owner_key: item.owner_key || "",
      pet_id: item.memorial_id || "",
      pet_name: card.pet_name || item.pet_name || "毛孩子",
      pet_type: normalizePetType(card.pet_type || item.pet_type) || "other",
      pet_avatar: card.photo_url || item.pet_avatar || "",
      title: item.title || "",
      content: item.content || "",
      memory_date: item.memory_date || "",
      media_type: mediaUrl ? itemType : "none",
      media_file_id: item.media_file_id || mediaUrl,
      media_url: mediaUrl,
      video_cover: item.cover_url || "",
      review_status: item.visibility === "public" ? "approved" : item.visibility,
      visibility: item.visibility || "private",
      likes_count: item.likes_count || 0,
      paw_lights_count: item.paw_lights_count || 0,
      favorites_count: item.favorites_count || 0,
      comments_count: item.comments_count || 0,
      ai_review_status: item.ai_review_status || "",
      ai_review_label: item.ai_review_label || "",
      ai_review_score: item.ai_review_score || 0,
      ai_review_reason: item.ai_review_reason || "",
      ai_review_provider: item.ai_review_provider || "",
      ai_reviewed_at: item.ai_reviewed_at || null,
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  });
}

function mapPawMemoriesToMemoryItems(memoryList) {
  return (Array.isArray(memoryList) ? memoryList : []).map((memory) => ({
    _id: memory._id,
    source_type: "paw_memory",
    memorial_id: memory.pet_id || "",
    owner_openid: memory.owner_openid || "",
    owner_key: memory.owner_key || "",
    item_type: memory.media_type === "video" ? "video" : "photo",
    media_url: memory.media_url || memory.media_file_id || "",
    media_file_id: memory.media_file_id || memory.media_url || "",
    cover_url: memory.video_cover || "",
    title: memory.title || "小爪记忆",
    content: memory.content || "",
    memory_date: "",
    visibility: memory.visibility || "private",
    likes_count: memory.likes_count || 0,
    paw_lights_count: memory.paw_lights_count || 0,
    favorites_count: memory.favorites_count || 0,
    comments_count: memory.comments_count || 0,
    ai_review_status: memory.ai_review_status || "",
    ai_review_label: memory.ai_review_label || "",
    ai_review_score: memory.ai_review_score || 0,
    ai_review_reason: memory.ai_review_reason || "",
    ai_review_provider: memory.ai_review_provider || "",
    ai_reviewed_at: memory.ai_reviewed_at || null,
    created_at: memory.created_at,
    updated_at: memory.updated_at
  }));
}

function sortMemoryItems(list) {
  return (list || []).sort((a, b) => {
    const aTime = a.memory_date || (a.created_at && a.created_at.toISOString ? a.created_at.toISOString() : String(a.created_at || ""));
    const bTime = b.memory_date || (b.created_at && b.created_at.toISOString ? b.created_at.toISOString() : String(b.created_at || ""));
    return bTime.localeCompare(aTime);
  });
}

async function getCardByIdOrSlug(input) {
  if (input.id) {
    const result = await cards.doc(input.id).get();
    return result.data ? { ...result.data, _id: result.data._id || input.id } : null;
  }

  if (!input.slug) return null;

  const result = await cards.where({ slug: input.slug }).limit(1).get();
  return result.data[0] || null;
}

function canReadCard(card, openid) {
  return !!card && (
    card.visibility === "public" ||
    card.owner_openid === openid ||
    isAdminOpenId(openid)
  );
}

async function listPublicCards(input, openid) {
  const where = { visibility: "public" };
  const filter = input.filter || {};
  const petType = normalizePetTypeFilter(filter.petType);
  const petStatus = normalizePetStatus(filter.petStatus);
  const userKey = String(input.user_key || "").trim();

  if (petStatus) where.pet_status = petStatus;

  const result = await cards.where(where).orderBy("created_at", "desc").get();
  const list = (result.data || []).map((card) => ({
    ...card,
    pet_type: normalizePetType(card.pet_type)
  }));
  const filteredList = petType
    ? list.filter((card) => card.pet_type === petType)
    : list;
  const cardsWithMedia = await attachMediaUrls(filteredList);
  return await attachInteractionState(cardsWithMedia, openid, userKey);
}

async function getCard(input, openid) {
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const card = await getCardByIdOrSlug(input);
  if (!canReadCard(card, openid)) return null;

  const list = await attachMediaUrls([card]);
  const withInteraction = await attachInteractionState(list, openid, ownerKey);
  return withInteraction[0] || null;
}

async function getMyPrimaryCard(input, openid) {
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const card = await getVisitorCard(openid, ownerKey);
  if (!card) return null;

  const list = await attachMediaUrls([card]);
  return list[0] || null;
}

async function createCard(input, openid) {
  const petName = String(input.pet_name || "").trim();
  const petType = normalizePetType(input.pet_type);
  const petStatus = normalizePetStatus(input.pet_status);
  const requestedVisibility = normalizeVisibility(input.visibility);
  const ownerKey = String(input.owner_key || "").trim();

  if (!openid) throw new Error("MISSING_OPENID");
  if (!petName) throw new Error("MISSING_PET_NAME");
  if (!petType) throw new Error("MISSING_PET_TYPE");
  if (!String(input.photo_url || "").trim()) throw new Error("MISSING_PHOTO");

  const createdAt = now();
  const shouldReview = requestedVisibility === "pending" || requestedVisibility === "public";
  const aiReview = shouldReview
    ? await runAiReview({
      texts: [petName, input.story, input.message],
      images: [input.photo_url]
    })
    : makeAiReviewResult("skipped", "私密内容不送审");
  const autoApproved = shouldReview && isAiReviewPass(aiReview);
  const data = {
    slug: generateSlug(),
    pet_name: petName,
    pet_type: petType,
    pet_status: petStatus,
    birth_or_adopted_date: input.birth_or_adopted_date || "",
    star_date: petStatus === "star" ? input.star_date || "" : "",
    photo_url: input.photo_url || "",
    video_url: input.video_url || "",
    video_duration: input.video_duration || 0,
    video_size: input.video_size || 0,
    story: input.story || "",
    message: input.message || "",
    visibility: shouldReview
      ? (autoApproved ? "public" : "pending")
      : "private",
    allow_messages: input.allow_messages !== false,
    owner_openid: openid,
    owner_key: ownerKey,
    like_count: 0,
    flower_count: 0,
    paw_lights_count: 0,
    ...aiReviewFields(aiReview),
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await cards.add({ data });
  return {
    _id: result._id,
    ...data
  };
}

async function applyPublic(input, openid) {
  const cardId = String(input.id || input.card_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!cardId) throw new Error("MISSING_CARD_ID");

  const card = await getCardByIdOrSlug({ id: cardId });
  if (!card) throw new Error("CARD_NOT_FOUND");

  const canUpdate = card.owner_openid === openid || (!!ownerKey && card.owner_key === ownerKey);
  if (!canUpdate && !isAdminOpenId(openid)) {
    throw new Error("NO_UPDATE_PERMISSION");
  }

  const aiReview = await runAiReview({
    texts: [card.pet_name, card.story, card.message],
    images: [card.photo_url]
  });
  const visibility = isAiReviewPass(aiReview) ? "public" : "pending";
  const data = {
    visibility,
    ...aiReviewFields(aiReview),
    updated_at: now()
  };

  await cards.doc(cardId).update({ data });
  return {
    ok: true,
    visibility,
    ai_review_status: data.ai_review_status
  };
}

async function listPendingCards(openid) {
  requireAdmin(openid);
  const result = await cards.where({ visibility: "pending" }).orderBy("created_at", "desc").get();
  return await attachMediaUrls(sortByAiReviewPriority(result.data || []));
}

async function reviewCard(input, openid) {
  requireAdmin(openid);
  await cards.doc(input.id).update({
    data: {
      visibility: input.approved ? "public" : "rejected",
      updated_at: now()
    }
  });
  return { ok: true };
}

async function listApprovedMessages(input, openid) {
  const card = await getCardByIdOrSlug({ id: input.card_id });
  if (!canReadCard(card, openid)) return [];

  const result = await messages
    .where({
      card_id: input.card_id,
      review_status: "approved"
    })
    .orderBy("created_at", "desc")
    .get();
  return result.data || [];
}

async function listPendingMessages(openid) {
  requireAdmin(openid);
  const result = await messages
    .where({
      card_id: _.exists(true),
      review_status: "pending"
    })
    .orderBy("created_at", "desc")
    .get();
  return sortByAiReviewPriority(result.data || []);
}

async function createMessage(input, openid) {
  const cardId = String(input.card_id || "").trim();
  const content = String(input.content || "").trim();
  const visitorName = String(input.visitor_name || "").trim() || "路过的朋友";

  if (!cardId) throw new Error("MISSING_CARD_ID");
  if (!content) throw new Error("MISSING_CONTENT");
  if (content.length > 160) throw new Error("MESSAGE_TOO_LONG");

  const card = await getCardByIdOrSlug({ id: cardId });
  if (!canReadCard(card, openid)) throw new Error("CARD_NOT_ACCESSIBLE");
  if (card.allow_messages === false) throw new Error("MESSAGES_CLOSED");

  const aiReview = await runAiReview({
    texts: [visitorName, content],
    images: []
  });
  const reviewStatus = isAiReviewPass(aiReview) ? "approved" : "pending";
  const createdAt = now();
  const data = {
    card_id: cardId,
    content,
    openid,
    visitor_name: visitorName,
    review_status: reviewStatus,
    ...aiReviewFields(aiReview),
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await messages.add({ data });
  return {
    _id: result._id,
    ...data
  };
}

async function listMemoryItems(input, openid) {
  const memorialId = String(input.memorial_id || "").trim();
  if (!memorialId) return [];

  await ensureCollection("paw_memory_comments");

  const card = await getCardByIdOrSlug({ id: memorialId });
  if (!canReadCard(card, openid)) return [];

  const isOwner = card.owner_openid === openid;
  const where = isOwner || isAdminOpenId(openid)
    ? { memorial_id: memorialId }
    : { memorial_id: memorialId, visibility: "public" };

  const pawWhere = isOwner || isAdminOpenId(openid)
    ? { pet_id: memorialId }
    : { pet_id: memorialId, review_status: "approved", visibility: "public" };

  const [itemResult, pawResult] = await Promise.all([
    memoryItems.where(where).limit(100).get(),
    pawMemories.where(pawWhere).limit(100).get()
  ]);
  const items = (itemResult.data || []).filter((item) => !isDeletedDoc(item));
  const linkedItemIds = new Set(items.map((item) => item._id));
  const pawItems = mapPawMemoriesToMemoryItems(
    (pawResult.data || []).filter((memory) => (
      !isDeletedDoc(memory) &&
      (!memory.linked_memory_item_id || !linkedItemIds.has(memory.linked_memory_item_id))
    ))
  );
  const listWithCounts = await attachPawMemoryCommentCounts(sortMemoryItems([...items, ...pawItems]));

  return await attachMemoryItemMediaUrls(listWithCounts);
}

async function listPendingMemoryItems(openid) {
  requireAdmin(openid);
  const result = await memoryItems.where({ visibility: "pending" }).limit(100).get();
  const list = sortByAiReviewPriority(sortMemoryItems((result.data || []).filter((item) => !isDeletedDoc(item))));
  return await attachMemoryItemMediaUrls(list);
}

async function createMemoryItem(input, openid) {
  const memorialId = String(input.memorial_id || "").trim();
  const title = String(input.title || "").trim();
  const content = String(input.content || "").trim();
  const ownerKey = String(input.owner_key || "").trim();
  const requestedVisibility = normalizeVisibility(input.visibility);

  if (!openid) throw new Error("MISSING_OPENID");
  if (!memorialId) throw new Error("MISSING_MEMORIAL_ID");
  if (!title) throw new Error("MISSING_TITLE");

  const card = await getCardByIdOrSlug({ id: memorialId });
  const canWrite = !!card && (
    card.owner_openid === openid ||
    (!!ownerKey && card.owner_key === ownerKey)
  );
  if (!canWrite) throw new Error("MEMORIAL_NOT_ACCESSIBLE");

  const itemType = normalizeMemoryItemType(input.item_type);
  const mediaUrl = String(input.media_url || input.media_file_id || "").trim();
  const coverUrl = String(input.cover_url || "").trim();
  const shouldReview = requestedVisibility === "pending" || requestedVisibility === "public";
  const aiReview = shouldReview
    ? await runAiReview({
      texts: [title, content],
      images: [itemType === "video" ? coverUrl : mediaUrl]
    })
    : makeAiReviewResult("skipped", "私密内容不送审");
  const visibility = shouldReview
    ? (isAiReviewPass(aiReview) ? "public" : "pending")
    : "private";
  const createdAt = now();
  const data = {
    memorial_id: memorialId,
    owner_openid: openid,
    owner_key: ownerKey,
    item_type: itemType,
    media_url: mediaUrl,
    media_file_id: mediaUrl,
    cover_url: coverUrl,
    title,
    content,
    memory_date: input.memory_date || "",
    visibility,
    likes_count: 0,
    paw_lights_count: 0,
    favorites_count: 0,
    comments_count: 0,
    is_deleted: false,
    deleted_at: null,
    ...aiReviewFields(aiReview),
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await memoryItems.add({ data });
  return {
    _id: result._id,
    ...data
  };
}

async function reviewMessage(input, openid) {
  requireAdmin(openid);
  await messages.doc(input.id).update({
    data: {
      review_status: input.approved ? "approved" : "rejected"
    }
  });
  return { ok: true };
}

async function createPawMemory(input, openid) {
  const petId = String(input.pet_id || "").trim();
  const content = String(input.content || "").trim();

  if (!openid) throw new Error("MISSING_OPENID");
  if (!petId) throw new Error("MISSING_PET_ID");
  if (!content) throw new Error("MISSING_CONTENT");
  if (content.length > 300) throw new Error("CONTENT_TOO_LONG");

  const card = await getCardByIdOrSlug({ id: petId });
  const ownerKey = String(input.owner_key || "").trim();
  const canWriteForPet = !!card && (
    card.owner_openid === openid ||
    (!!ownerKey && card.owner_key === ownerKey)
  );

  if (!canWriteForPet) {
    throw new Error("PET_NOT_ACCESSIBLE");
  }

  await ensureCollection("paw_memories");

  const createdAt = now();
  const mediaType = normalizePawMemoryMediaType(input.media_type);
  const mediaUrl = mediaType === "none" ? "" : String(input.media_url || input.media_file_id || "").trim();
  const requestedVisibility = normalizePawMemoryVisibility(input.visibility);
  const shouldReview = requestedVisibility === "pending";
  const aiReview = shouldReview
    ? await runAiReview({
      texts: [content],
      images: [mediaType === "video" ? input.video_cover : mediaUrl]
    })
    : makeAiReviewResult("skipped", "私密内容不送审");
  const autoApproved = shouldReview && isAiReviewPass(aiReview);
  const data = {
    owner_openid: openid,
    owner_key: ownerKey,
    pet_id: petId,
    pet_name: card.pet_name || "",
    pet_type: normalizePetType(card.pet_type) || "other",
    pet_avatar: card.photo_url || "",
    content,
    media_type: mediaUrl ? mediaType : "none",
    media_file_id: mediaUrl,
    media_url: mediaUrl,
    video_cover: input.video_cover || "",
    review_status: requestedVisibility === "private"
      ? "private"
      : (autoApproved ? "approved" : "pending"),
    visibility: requestedVisibility === "private"
      ? "private"
      : (autoApproved ? "public" : "pending"),
    likes_count: 0,
    paw_lights_count: 0,
    favorites_count: 0,
    comments_count: 0,
    save_to_memory_items: input.save_to_memory_items === true,
    linked_memory_item_id: "",
    is_deleted: false,
    deleted_at: null,
    ...aiReviewFields(aiReview),
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await pawMemories.add({ data });
  const pawMemoryId = result._id;

  if (data.save_to_memory_items) {
    try {
      const memoryItem = await memoryItems.add({
        data: {
          memorial_id: petId,
          owner_openid: openid,
          owner_key: ownerKey,
          item_type: data.media_type === "video" ? "video" : "photo",
          media_url: data.media_url,
          media_file_id: data.media_file_id,
          cover_url: data.video_cover,
          title: "小爪记忆",
          content,
          memory_date: todayDateText(),
          visibility: "private",
          likes_count: 0,
          paw_lights_count: 0,
          favorites_count: 0,
          comments_count: 0,
          is_deleted: false,
          deleted_at: null,
          created_at: createdAt,
          updated_at: createdAt
        }
      });

      await pawMemories.doc(pawMemoryId).update({
        data: {
          linked_memory_item_id: memoryItem._id,
          updated_at: now()
        }
      });
      data.linked_memory_item_id = memoryItem._id;
    } catch (error) {
      console.warn("同步保存到记忆片段失败", error);
    }
  }

  return {
    _id: pawMemoryId,
    ...data
  };
}

async function listPublicPawMemories(input, openid) {
  await ensureCollection("paw_memories");
  await ensureCollection("paw_memory_comments");

  const where = {
    review_status: "approved",
    visibility: "public"
  };
  const petType = normalizePetTypeFilter(input.pet_type || input.petType);
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  const [pawResult, itemResult] = await Promise.all([
    pawMemories.where(where).orderBy("created_at", "desc").get(),
    memoryItems.where({ visibility: "public" }).limit(100).get()
  ]);
  const itemMemories = await mapMemoryItemsToPawMemories(
    (itemResult.data || []).filter((item) => !isDeletedDoc(item))
  );
  const filteredItems = petType
    ? itemMemories.filter((item) => item.pet_type === petType)
    : itemMemories;
  const pawItems = (pawResult.data || []).filter((item) => !isDeletedDoc(item)).map((item) => ({
    ...item,
    pet_type: normalizePetType(item.pet_type),
    source_type: item.source_type || "paw_memory",
    source_label: item.source_label || "小爪记忆"
  }));
  const filteredPawItems = petType
    ? pawItems.filter((item) => item.pet_type === petType)
    : pawItems;
  const listWithCounts = await attachPawMemoryCommentCounts(sortPawMemories([
    ...filteredPawItems,
    ...filteredItems
  ]));
  const listWithMedia = await attachPawMemoryMediaUrls(listWithCounts);
  const listWithState = await attachPawMemoryInteractionState(listWithMedia, openid, ownerKey);
  return listWithState.map((memory) => ({
    ...memory,
    is_owner: isUnifiedPawMemoryOwner(
      { data: memory, source_type: memory.source_type || "paw_memory" },
      openid,
      ownerKey
    )
  }));
}

async function listMyPawMemories(openid) {
  if (!openid) return [];
  await ensureCollection("paw_memories");
  await ensureCollection("paw_memory_comments");

  const [pawResult, itemResult] = await Promise.all([
    pawMemories
      .where({ owner_openid: openid })
      .orderBy("created_at", "desc")
      .get(),
    memoryItems
      .where({ owner_openid: openid })
      .limit(100)
      .get()
  ]);
  const itemMemories = await mapMemoryItemsToPawMemories(
    (itemResult.data || []).filter((item) => !isDeletedDoc(item))
  );
  const listWithCounts = await attachPawMemoryCommentCounts(sortPawMemories([
    ...(pawResult.data || []).filter((item) => !isDeletedDoc(item)).map((item) => ({
      ...item,
      pet_type: normalizePetType(item.pet_type),
      source_type: item.source_type || "paw_memory",
      source_label: item.source_label || "小爪记忆"
    })),
    ...itemMemories
  ]));
  return await attachPawMemoryMediaUrls(listWithCounts);
}

async function listPendingPawMemories(openid) {
  requireAdmin(openid);
  await ensureCollection("paw_memories");

  const [pawResult, itemResult] = await Promise.all([
    pawMemories
      .where({
        review_status: "pending",
        visibility: "pending"
      })
      .orderBy("created_at", "desc")
      .get(),
    memoryItems.where({ visibility: "pending" }).limit(100).get()
  ]);
  const itemMemories = await mapMemoryItemsToPawMemories(
    (itemResult.data || []).filter((item) => !isDeletedDoc(item))
  );
  return await attachPawMemoryMediaUrls(sortByAiReviewPriority(sortPawMemories([
    ...(pawResult.data || []).filter((item) => !isDeletedDoc(item)).map((item) => ({
      ...item,
      pet_type: normalizePetType(item.pet_type),
      source_type: item.source_type || "paw_memory",
      source_label: item.source_label || "小爪记忆"
    })),
    ...itemMemories
  ])));
}

async function getDocData(collection, id) {
  try {
    const result = await collection.doc(id).get();
    return result.data || null;
  } catch (error) {
    return null;
  }
}

async function getUnifiedPawMemory(pawMemoryId) {
  const pawMemory = await getDocData(pawMemories, pawMemoryId);
  if (pawMemory) {
    return {
      data: {
        ...pawMemory,
        _id: pawMemory._id || pawMemoryId
      },
      source_type: "paw_memory",
      collection: pawMemories
    };
  }

  const memoryItem = await getDocData(memoryItems, pawMemoryId);
  if (memoryItem) {
    return {
      data: {
        ...memoryItem,
        _id: memoryItem._id || pawMemoryId
      },
      source_type: "memory_item",
      collection: memoryItems
    };
  }

  return null;
}

function isUnifiedPawMemoryPublic(memory) {
  if (!memory || !memory.data) return false;
  if (isDeletedDoc(memory.data)) return false;
  if (memory.source_type === "memory_item") {
    return memory.data.visibility === "public";
  }
  return memory.data.review_status === "approved" && memory.data.visibility === "public";
}

function isUnifiedPawMemoryOwner(memory, openid, ownerKey) {
  if (!memory || !memory.data) return false;

  const normalizedOpenId = normalizeOpenId(openid);
  const normalizedOwnerKey = String(ownerKey || "").trim();

  return (
    (!!normalizedOpenId && memory.data.owner_openid === normalizedOpenId) ||
    (!!normalizedOwnerKey && memory.data.owner_key === normalizedOwnerKey)
  );
}

function canReadUnifiedPawMemory(memory, openid, ownerKey) {
  if (!memory || !memory.data || isDeletedDoc(memory.data)) return false;
  return (
    isUnifiedPawMemoryPublic(memory) ||
    isUnifiedPawMemoryOwner(memory, openid, ownerKey) ||
    isAdminOpenId(openid)
  );
}

async function normalizeUnifiedPawMemory(memory) {
  if (!memory || !memory.data) return null;

  if (memory.source_type === "memory_item") {
    const mapped = await mapMemoryItemsToPawMemories([memory.data]);
    return mapped[0] || null;
  }

  return {
    ...memory.data,
    pet_type: normalizePetType(memory.data.pet_type),
    source_type: "paw_memory",
    source_label: memory.data.source_label || "小爪记忆"
  };
}

async function getPawMemory(input, openid) {
  const pawMemoryId = String(input.id || input.paw_memory_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!pawMemoryId) return null;

  await ensureCollection("paw_memories");
  await ensureCollection("paw_memory_comments");

  const memory = await getUnifiedPawMemory(pawMemoryId);
  if (!canReadUnifiedPawMemory(memory, openid, ownerKey)) return null;

  const normalized = await normalizeUnifiedPawMemory(memory);
  if (!normalized) return null;

  const withCounts = await attachPawMemoryCommentCounts([normalized]);
  const withMedia = await attachPawMemoryMediaUrls(withCounts);
  const withInteraction = await attachPawMemoryInteractionState(withMedia, openid, ownerKey);
  const isOwner = isUnifiedPawMemoryOwner(memory, openid, ownerKey);

  return {
    ...(withInteraction[0] || normalized),
    is_owner: isOwner,
    can_reply_comments: isOwner
  };
}

async function hidePawMemory(input, openid) {
  const pawMemoryId = String(input.id || input.paw_memory_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!pawMemoryId) throw new Error("MISSING_PAW_MEMORY_ID");

  const memory = await getUnifiedPawMemory(pawMemoryId);
  if (!memory || isDeletedDoc(memory.data)) throw new Error("PAW_MEMORY_NOT_FOUND");
  if (!isUnifiedPawMemoryOwner(memory, openid, ownerKey) && !isAdminOpenId(openid)) {
    throw new Error("NO_UPDATE_PERMISSION");
  }

  const updatedAt = now();
  const data = memory.source_type === "memory_item"
    ? { visibility: "private", updated_at: updatedAt }
    : { visibility: "private", review_status: "private", updated_at: updatedAt };

  await memory.collection.doc(pawMemoryId).update({ data });
  return { ok: true };
}

async function deletePawMemory(input, openid) {
  const pawMemoryId = String(input.id || input.paw_memory_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!pawMemoryId) throw new Error("MISSING_PAW_MEMORY_ID");

  const memory = await getUnifiedPawMemory(pawMemoryId);
  if (!memory || isDeletedDoc(memory.data)) throw new Error("PAW_MEMORY_NOT_FOUND");
  if (!isUnifiedPawMemoryOwner(memory, openid, ownerKey) && !isAdminOpenId(openid)) {
    throw new Error("NO_DELETE_PERMISSION");
  }

  const deletedAt = now();
  await memory.collection.doc(pawMemoryId).update({
    data: {
      visibility: "deleted",
      ...(memory.source_type === "paw_memory" ? { review_status: "deleted" } : {}),
      is_deleted: true,
      deleted_at: deletedAt,
      updated_at: deletedAt
    }
  });

  return { ok: true };
}

async function listApprovedPawMemoryComments(input, openid) {
  const pawMemoryId = String(input.paw_memory_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!pawMemoryId) return [];
  await ensureCollection("paw_memory_comments");

  const memory = await getUnifiedPawMemory(pawMemoryId);
  if (!canReadUnifiedPawMemory(memory, openid, ownerKey)) return [];

  const result = await pawMemoryComments
    .where({
      paw_memory_id: pawMemoryId,
      review_status: "approved"
    })
    .orderBy("created_at", "desc")
    .get();
  const commentsWithState = await attachPawMemoryCommentState(result.data || [], openid, ownerKey);
  return await attachPawMemoryCommentVisitorMediaUrls(commentsWithState);
}

async function attachPawMemoryCommentState(commentList, openid, ownerKey) {
  const list = Array.isArray(commentList) ? commentList : [];
  const markerValue = normalizeOpenId(openid) || String(ownerKey || "").trim();

  if (!markerValue || list.length === 0) {
    return list.map((comment) => ({
      ...comment,
      likes_count: comment.likes_count || 0,
      has_liked: false,
      author_liked: !!comment.author_liked
    }));
  }

  const keys = list.map((comment) => `paw_memory_comment:like:${comment._id}:${markerValue}`);
  const result = await interactions
    .where({ dedupe_key: _.in(keys) })
    .limit(keys.length)
    .get();
  const touched = new Set((result.data || []).map((item) => item.dedupe_key));

  return list.map((comment) => ({
    ...comment,
    likes_count: comment.likes_count || 0,
    has_liked: touched.has(`paw_memory_comment:like:${comment._id}:${markerValue}`),
    author_liked: !!comment.author_liked
  }));
}

async function attachPawMemoryCommentVisitorMediaUrls(commentList) {
  const list = Array.isArray(commentList) ? commentList : [];
  const fileIDs = [];

  list.forEach((comment) => {
    if (comment.visitor_card_photo) fileIDs.push(comment.visitor_card_photo);
  });

  const urlMap = await getTempUrlMap(fileIDs);

  return list.map((comment) => ({
    ...comment,
    visitor_card_photo_src: urlMap[comment.visitor_card_photo] || comment.visitor_card_photo || ""
  }));
}

async function listPendingPawMemoryComments(openid) {
  requireAdmin(openid);
  await ensureCollection("paw_memory_comments");

  const result = await pawMemoryComments
    .where({ review_status: "pending" })
    .orderBy("created_at", "desc")
    .get();
  return sortByAiReviewPriority(result.data || []);
}

async function notifyApprovedPawMemoryComment(comment, memory) {
  if (!comment || !comment._id || !memory || !memory.data) return;

  const target = memoryNotificationTarget(memory);
  const memoryOwner = {
    openid: memory.data.owner_openid || "",
    owner_key: memory.data.owner_key || "",
    card_id: memory.data.pet_id || memory.data.memorial_id || ""
  };
  const actorBase = {
    actor_openid: comment.owner_openid || "",
    actor_owner_key: comment.owner_key || "",
    actor_card_id: comment.visitor_card_id || "",
    actor_name: comment.visitor_card_name || comment.visitor_name || "毛孩子",
    actor_avatar: comment.visitor_card_photo || ""
  };
  const targetBase = {
    target_type: memory.source_type || "paw_memory",
    target_id: memory.data._id || comment.paw_memory_id || "",
    paw_memory_id: memory.data._id || comment.paw_memory_id || "",
    comment_id: comment._id,
    content_preview: comment.content || "",
    ...target
  };

  const replyToId = comment.reply_to_comment_id || comment.parent_comment_id || "";
  if (replyToId) {
    let replyTarget = null;
    try {
      const replyResult = await pawMemoryComments.doc(replyToId).get();
      replyTarget = replyResult && replyResult.data
        ? { ...replyResult.data, _id: replyResult.data._id || replyToId }
        : null;
    } catch (error) {
      replyTarget = null;
    }

    if (replyTarget) {
      const replyRecipient = {
        openid: replyTarget.owner_openid || "",
        owner_key: replyTarget.owner_key || "",
        card_id: replyTarget.visitor_card_id || ""
      };

      await createNotification({
        unique_key: `paw_memory_comment_reply:${comment._id}:${replyTarget._id}`,
        recipient_openid: replyRecipient.openid,
        recipient_owner_key: replyRecipient.owner_key,
        recipient_card_id: replyRecipient.card_id,
        type: "paw_memory_comment_reply",
        category: "comment",
        ...actorBase,
        ...targetBase
      });

      if (!isSameNotificationPerson(replyRecipient, memoryOwner)) {
        await createNotification({
          unique_key: `paw_memory_reply:${comment._id}:${memory.data._id || comment.paw_memory_id}`,
          recipient_openid: memoryOwner.openid,
          recipient_owner_key: memoryOwner.owner_key,
          recipient_card_id: memoryOwner.card_id,
          type: "paw_memory_reply",
          category: "comment",
          ...actorBase,
          ...targetBase
        });
      }
      return;
    }
  }

  await createNotification({
    unique_key: `paw_memory_comment:${comment._id}:${memory.data._id || comment.paw_memory_id}`,
    recipient_openid: memoryOwner.openid,
    recipient_owner_key: memoryOwner.owner_key,
    recipient_card_id: memoryOwner.card_id,
    type: "paw_memory_comment",
    category: "comment",
    ...actorBase,
    ...targetBase
  });
}

async function applyApprovedPawMemoryCommentSideEffects(comment, memory) {
  if (!comment || !memory || !memory.collection) return;

  await memory.collection.doc(comment.paw_memory_id).update({
    data: {
      comments_count: _.inc(1),
      updated_at: now()
    }
  });

  await notifyApprovedPawMemoryComment(comment, memory);
}

async function createPawMemoryComment(input, openid) {
  const pawMemoryId = String(input.paw_memory_id || "").trim();
  const content = String(input.content || "").trim();
  const ownerKey = String(input.owner_key || "").trim();
  const parentCommentId = String(input.parent_comment_id || input.reply_to_comment_id || "").trim();

  if (!pawMemoryId) throw new Error("MISSING_PAW_MEMORY_ID");
  if (!content) throw new Error("MISSING_CONTENT");
  if (content.length > 160) throw new Error("COMMENT_TOO_LONG");
  await ensureCollection("paw_memory_comments");

  const memory = await getUnifiedPawMemory(pawMemoryId);
  if (!isUnifiedPawMemoryPublic(memory)) {
    throw new Error("PAW_MEMORY_NOT_PUBLIC");
  }

  const visitorCard = await getVisitorCard(openid, ownerKey);
  if (!visitorCard || !visitorCard._id) {
    throw new Error("MISSING_VISITOR_CARD");
  }

  let parentComment = null;
  let rootCommentId = "";
  if (parentCommentId) {
    const parentResult = await pawMemoryComments.doc(parentCommentId).get();
    parentComment = parentResult.data;
    if (
      !parentComment ||
      parentComment.review_status !== "approved" ||
      parentComment.paw_memory_id !== pawMemoryId
    ) {
      throw new Error("REPLY_TARGET_NOT_FOUND");
    }
    rootCommentId = parentComment.parent_comment_id || parentComment._id || parentCommentId;
  }

  const createdAt = now();
  const aiReview = await runAiReview({
    texts: [visitorCard.pet_name, content],
    images: []
  });
  const reviewStatus = isAiReviewPass(aiReview) ? "approved" : "pending";
  const data = {
    paw_memory_id: pawMemoryId,
    target_type: memory.source_type,
    owner_openid: openid,
    owner_key: ownerKey,
    visitor_card_id: visitorCard._id,
    visitor_card_name: visitorCard.pet_name || "毛孩子",
    visitor_card_photo: visitorCard.photo_url || "",
    visitor_card_pet_type: normalizePetType(visitorCard.pet_type) || "other",
    visitor_name: visitorCard.pet_name || "毛孩子",
    parent_comment_id: rootCommentId,
    reply_to_comment_id: parentCommentId,
    reply_to_card_id: parentComment ? parentComment.visitor_card_id || "" : "",
    reply_to_name: parentComment
      ? parentComment.visitor_card_name || parentComment.visitor_name || parentComment.nickname || "路过的朋友"
      : "",
    content,
    review_status: reviewStatus,
    likes_count: 0,
    author_liked: false,
    ...aiReviewFields(aiReview),
    created_at: createdAt,
    updated_at: createdAt
  };
  const result = await pawMemoryComments.add({
    data
  });

  const comment = {
    _id: result._id,
    ...data
  };
  if (reviewStatus === "approved") {
    await applyApprovedPawMemoryCommentSideEffects(comment, memory);
  }

  return comment;
}

async function replyPawMemoryComment(input, openid) {
  const commentId = String(input.id || input.comment_id || "").trim();
  const content = String(input.content || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();

  if (!commentId) throw new Error("MISSING_COMMENT_ID");
  if (!content) throw new Error("MISSING_REPLY_CONTENT");
  if (content.length > 160) throw new Error("REPLY_TOO_LONG");

  await ensureCollection("paw_memory_comments");

  const result = await pawMemoryComments.doc(commentId).get();
  const comment = result.data
    ? { ...result.data, _id: result.data._id || commentId }
    : null;
  if (!comment || !comment.paw_memory_id) throw new Error("COMMENT_NOT_FOUND");
  if (comment.review_status !== "approved") throw new Error("COMMENT_NOT_APPROVED");

  const memory = await getUnifiedPawMemory(comment.paw_memory_id);
  if (!isUnifiedPawMemoryOwner(memory, openid, ownerKey) && !isAdminOpenId(openid)) {
    throw new Error("NO_REPLY_PERMISSION");
  }

  const updatedAt = now();
  await pawMemoryComments.doc(commentId).update({
    data: {
      author_reply: content,
      author_reply_openid: openid,
      author_reply_owner_key: ownerKey,
      author_reply_created_at: comment.author_reply_created_at || updatedAt,
      author_reply_updated_at: updatedAt,
      updated_at: updatedAt
    }
  });

  const actorCard = await getVisitorCard(openid, ownerKey);
  const target = memoryNotificationTarget(memory);
  await createNotification({
    unique_key: `paw_memory_author_reply:${commentId}`,
    recipient_openid: comment.owner_openid || "",
    recipient_owner_key: comment.owner_key || "",
    recipient_card_id: comment.visitor_card_id || "",
    actor_openid: openid,
    actor_owner_key: ownerKey,
    actor_card_id: actorCard && actorCard._id || memory.data.pet_id || "",
    actor_name: actorCard && actorCard.pet_name || memory.data.pet_name || "毛孩子",
    actor_avatar: actorCard && actorCard.photo_url || memory.data.pet_avatar || "",
    type: "paw_memory_author_reply",
    category: "comment",
    target_type: "paw_memory_comment",
    target_id: commentId,
    paw_memory_id: comment.paw_memory_id || "",
    comment_id: commentId,
    content_preview: content,
    ...target
  });

  return { ok: true };
}

async function addPawMemoryCommentLike(input, openid) {
  const commentId = String(input.id || input.comment_id || "").trim();
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const markerValue = normalizeOpenId(openid) || ownerKey;

  if (!commentId) throw new Error("MISSING_COMMENT_ID");
  if (!markerValue) throw new Error("MISSING_VISITOR_KEY");

  await ensureCollection("paw_memory_comments");

  const result = await pawMemoryComments.doc(commentId).get();
  const comment = result.data
    ? { ...result.data, _id: result.data._id || commentId }
    : null;
  if (!comment || !comment.paw_memory_id) throw new Error("COMMENT_NOT_FOUND");
  if (comment.review_status !== "approved") throw new Error("COMMENT_NOT_APPROVED");

  const memory = await getUnifiedPawMemory(comment.paw_memory_id);
  if (!canReadUnifiedPawMemory(memory, openid, ownerKey)) {
    throw new Error("PAW_MEMORY_NOT_ACCESSIBLE");
  }

  const visitorCard = await getVisitorCard(openid, ownerKey);
  if (!visitorCard || !visitorCard._id) {
    throw new Error("MISSING_VISITOR_CARD");
  }

  const isAuthor = isUnifiedPawMemoryOwner(memory, openid, ownerKey);
  const dedupeKey = `paw_memory_comment:like:${commentId}:${markerValue}`;
  const existed = await interactions
    .where({ dedupe_key: dedupeKey })
    .limit(1)
    .get();

  if (existed.data.length > 0) {
    await interactions.where({ dedupe_key: dedupeKey }).remove();
    await pawMemoryComments.doc(commentId).update({
      data: {
        likes_count: Math.max(0, (comment.likes_count || 0) - 1),
        ...(isAuthor ? { author_liked: false } : {}),
        updated_at: now()
      }
    });
    return {
      added: false,
      removed: true,
      author_liked: isAuthor ? false : !!comment.author_liked
    };
  }

  await interactions.add({
    data: {
      target_type: "paw_memory_comment",
      target_id: commentId,
      paw_memory_id: comment.paw_memory_id,
      type: "like",
      owner_openid: openid,
      owner_key: ownerKey,
      openid,
      user_key: ownerKey,
      dedupe_key: dedupeKey,
      created_at: now()
    }
  });

  await pawMemoryComments.doc(commentId).update({
    data: {
      likes_count: _.inc(1),
      ...(isAuthor ? { author_liked: true } : {}),
      updated_at: now()
    }
  });

  await notifyPawMemoryCommentLike(comment, memory, visitorCard, openid, ownerKey);

  return { added: true, removed: false, author_liked: isAuthor };
}

async function addPawMemoryInteraction(input, openid) {
  const type = pawMemoryCountFieldMap[input.type] ? input.type : "paw";
  const pawMemoryId = String(input.target_id || input.paw_memory_id || "").trim();

  if (!pawMemoryId) throw new Error("MISSING_PAW_MEMORY_ID");

  const memory = await getUnifiedPawMemory(pawMemoryId);

  if (!isUnifiedPawMemoryPublic(memory)) {
    throw new Error("PAW_MEMORY_NOT_PUBLIC");
  }

  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const markerValue = openid || ownerKey;
  const dedupeKey = markerValue ? `paw_memory:${type}:${pawMemoryId}:${markerValue}` : "";
  let visitorCard = null;

  if (type === "like" || type === "favorite") {
    visitorCard = await getVisitorCard(openid, ownerKey);
    if (!visitorCard || !visitorCard._id) {
      throw new Error("MISSING_VISITOR_CARD");
    }
  }

  if (dedupeKey) {
    const existed = await interactions
      .where({ dedupe_key: dedupeKey })
      .limit(1)
      .get();

    if (existed.data.length > 0) {
      if (type === "like" || type === "favorite") {
        await interactions.where({ dedupe_key: dedupeKey }).remove();
        await memory.collection.doc(pawMemoryId).update({
          data: {
            [pawMemoryCountFieldMap[type]]: _.inc(-1),
            updated_at: now()
          }
        });
        return { added: false, removed: true };
      }

      return { added: false, removed: false };
    }
  }

  await interactions.add({
    data: {
      target_type: memory.source_type,
      target_id: pawMemoryId,
      type,
      owner_openid: openid,
      owner_key: ownerKey,
      openid,
      user_key: ownerKey,
      dedupe_key: dedupeKey,
      created_at: now()
    }
  });

  await memory.collection.doc(pawMemoryId).update({
    data: {
      [pawMemoryCountFieldMap[type]]: _.inc(1),
      updated_at: now()
    }
  });

  if (type === "like") {
    await notifyPawMemoryLike(memory, visitorCard, openid, ownerKey);
  }

  return { added: true, removed: false };
}

async function addInteraction(input, openid) {
  const type = countFieldMap[input.type] ? input.type : "paw_light";
  const cardId = String(input.card_id || "").trim();

  if (!cardId) {
    throw new Error("MISSING_CARD_ID");
  }

  const card = await getCardByIdOrSlug({ id: cardId });

  if (!canReadCard(card, openid)) {
    throw new Error("CARD_NOT_ACCESSIBLE");
  }

  const userKey = String(input.user_key || "").trim();
  const markerValue = openid || userKey;
  const dedupeKey = markerValue ? `${type}:${cardId}:${markerValue}` : "";
  let visitorCard = null;

  if (type === "like") {
    if (!markerValue) throw new Error("MISSING_VISITOR_KEY");
    visitorCard = await getVisitorCard(openid, userKey);
  }

  if (dedupeKey) {
    const existed = await interactions
      .where({
        dedupe_key: dedupeKey
      })
      .limit(1)
      .get();

    if (existed.data.length > 0) {
      if (type === "like") {
        await interactions.where({ dedupe_key: dedupeKey }).remove();
        await cards.doc(cardId).update({
          data: {
            like_count: Math.max(0, (card.like_count || 0) - 1),
            updated_at: now()
          }
        });
        return { added: false, removed: true };
      }

      return { added: false, removed: false };
    }
  }

  await interactions.add({
    data: {
      card_id: cardId,
      type,
      openid,
      user_key: userKey,
      dedupe_key: dedupeKey,
      created_at: now()
    }
  });

  await cards.doc(cardId).update({
    data: {
      [countFieldMap[type]]: _.inc(1),
      updated_at: now()
    }
  });

  if (type === "like") {
    await notifyCardLike(card, visitorCard, openid, userKey);
  }

  return { added: true, removed: false };
}

async function recordCardView(input, openid) {
  const cardId = String(input.card_id || "").trim();

  if (!cardId) {
    throw new Error("MISSING_CARD_ID");
  }

  const card = await getCardByIdOrSlug({ id: cardId });

  if (!canReadCard(card, openid)) {
    throw new Error("CARD_NOT_ACCESSIBLE");
  }

  const userKey = String(input.user_key || "").trim();
  const markerValue = openid || userKey;
  const type = "paw_light";
  const dedupeKey = markerValue ? `${type}:${cardId}:${markerValue}` : "";

  if (dedupeKey) {
    const existed = await interactions
      .where({
        dedupe_key: dedupeKey
      })
      .limit(1)
      .get();

    if (existed.data.length > 0) return { viewed: false };
  }

  await interactions.add({
    data: {
      card_id: cardId,
      type,
      openid,
      user_key: userKey,
      dedupe_key: dedupeKey,
      created_at: now()
    }
  });

  await cards.doc(cardId).update({
    data: {
      paw_lights_count: _.inc(1),
      updated_at: now()
    }
  });

  return { viewed: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = normalizeOpenId(wxContext.OPENID);
  const action = event && event.action;
  const data = event && event.data ? event.data : {};

  switch (action) {
    case "listPublicCards":
      return { data: await listPublicCards(data, openid) };
    case "getCard":
      return { data: await getCard(data, openid) };
    case "getMyPrimaryCard":
      return { data: await getMyPrimaryCard(data, openid) };
    case "createCard":
      return { data: await createCard(data, openid) };
    case "applyPublic":
      return await applyPublic(data, openid);
    case "listPendingCards":
      return { data: await listPendingCards(openid) };
    case "reviewCard":
      return await reviewCard(data, openid);
    case "listApprovedMessages":
      return { data: await listApprovedMessages(data, openid) };
    case "createMessage":
      return { data: await createMessage(data, openid) };
    case "listPendingMessages":
      return { data: await listPendingMessages(openid) };
    case "listMemoryItems":
      return { data: await listMemoryItems(data, openid) };
    case "createMemoryItem":
      return { data: await createMemoryItem(data, openid) };
    case "listPendingMemoryItems":
      return { data: await listPendingMemoryItems(openid) };
    case "reviewMessage":
      return await reviewMessage(data, openid);
    case "createPawMemory":
      return { data: await createPawMemory(data, openid) };
    case "getPawMemory":
      return { data: await getPawMemory(data, openid) };
    case "hidePawMemory":
      return { data: await hidePawMemory(data, openid) };
    case "deletePawMemory":
      return { data: await deletePawMemory(data, openid) };
    case "listPublicPawMemories":
      return { data: await listPublicPawMemories(data, openid) };
    case "listMyPawMemories":
      return { data: await listMyPawMemories(openid) };
    case "listPendingPawMemories":
      return { data: await listPendingPawMemories(openid) };
    case "listApprovedPawMemoryComments":
      return { data: await listApprovedPawMemoryComments(data, openid) };
    case "listPendingPawMemoryComments":
      return { data: await listPendingPawMemoryComments(openid) };
    case "createPawMemoryComment":
      return { data: await createPawMemoryComment(data, openid) };
    case "replyPawMemoryComment":
      return await replyPawMemoryComment(data, openid);
    case "addPawMemoryCommentLike":
      return await addPawMemoryCommentLike(data, openid);
    case "addPawMemoryInteraction":
      return await addPawMemoryInteraction(data, openid);
    case "listNotifications":
      return { data: await listNotifications(data, openid) };
    case "getUnreadNotificationCount":
      return { data: await getUnreadNotificationCount(data, openid) };
    case "markNotificationsRead":
      return await markNotificationsRead(data, openid);
    case "addInteraction":
      return await addInteraction(data, openid);
    case "recordCardView":
      return await recordCardView(data, openid);
    default:
      throw new Error("UNKNOWN_ACTION");
  }
};
