const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const cards = db.collection("memorials");
const messages = db.collection("messages");
const interactions = db.collection("interactions");
const memoryItems = db.collection("memory_items");

const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];

const countFieldMap = {
  like: "like_count",
  flower: "flower_count",
  paw_light: "paw_lights_count"
};

function now() {
  return new Date();
}

function normalizeOpenId(value) {
  return String(value || "").trim();
}

function isAdminOpenId(openid) {
  return ADMIN_OPENIDS.map(normalizeOpenId).includes(normalizeOpenId(openid));
}

function normalizePetType(type) {
  return ["cat", "dog", "other"].includes(type) ? type : "";
}

function normalizePetStatus(status) {
  return ["living", "star"].includes(status) ? status : "";
}

function isCloudFile(fileID) {
  return typeof fileID === "string" && fileID.indexOf("cloud://") === 0;
}

function requireAdmin(openid) {
  if (!isAdminOpenId(openid)) {
    throw new Error("NO_ADMIN_PERMISSION");
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

async function listPublicCards(input) {
  const where = { visibility: "public" };
  const filter = input.filter || {};
  const petType = normalizePetType(filter.petType);
  const petStatus = normalizePetStatus(filter.petStatus);

  if (petType) where.pet_type = petType;
  if (petStatus) where.pet_status = petStatus;

  const result = await cards.where(where).orderBy("created_at", "desc").get();
  return await attachMediaUrls(result.data || []);
}

async function getCard(input, openid) {
  const card = await getCardByIdOrSlug(input);
  if (!canReadCard(card, openid)) return null;

  const list = await attachMediaUrls([card]);
  return list[0] || null;
}

async function listPendingCards(openid) {
  requireAdmin(openid);
  const result = await cards.where({ visibility: "pending" }).orderBy("created_at", "desc").get();
  return await attachMediaUrls(result.data || []);
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
  return result.data || [];
}

async function listMemoryItems(input, openid) {
  const memorialId = String(input.memorial_id || "").trim();
  if (!memorialId) return [];

  const card = await getCardByIdOrSlug({ id: memorialId });
  if (!canReadCard(card, openid)) return [];

  const isOwner = card.owner_openid === openid;
  const where = isOwner || isAdminOpenId(openid)
    ? { memorial_id: memorialId }
    : { memorial_id: memorialId, visibility: "public" };

  const result = await memoryItems.where(where).limit(100).get();
  return await attachMemoryItemMediaUrls(sortMemoryItems(result.data || []));
}

async function listPendingMemoryItems(openid) {
  requireAdmin(openid);
  const result = await memoryItems.where({ visibility: "pending" }).limit(100).get();
  return await attachMemoryItemMediaUrls(sortMemoryItems(result.data || []));
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

  if (dedupeKey) {
    const existed = await interactions
      .where({
        dedupe_key: dedupeKey
      })
      .limit(1)
      .get();

    if (existed.data.length > 0) return { added: false };
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

  return { added: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = normalizeOpenId(wxContext.OPENID);
  const action = event && event.action;
  const data = event && event.data ? event.data : {};

  switch (action) {
    case "listPublicCards":
      return { data: await listPublicCards(data) };
    case "getCard":
      return { data: await getCard(data, openid) };
    case "listPendingCards":
      return { data: await listPendingCards(openid) };
    case "reviewCard":
      return await reviewCard(data, openid);
    case "listApprovedMessages":
      return { data: await listApprovedMessages(data, openid) };
    case "listPendingMessages":
      return { data: await listPendingMessages(openid) };
    case "listMemoryItems":
      return { data: await listMemoryItems(data, openid) };
    case "listPendingMemoryItems":
      return { data: await listPendingMemoryItems(openid) };
    case "reviewMessage":
      return await reviewMessage(data, openid);
    case "addInteraction":
      return await addInteraction(data, openid);
    default:
      throw new Error("UNKNOWN_ACTION");
  }
};
