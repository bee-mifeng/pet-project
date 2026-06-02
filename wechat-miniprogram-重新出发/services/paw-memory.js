const db = wx.cloud.database();
const pawMemories = db.collection("paw_memories");
const memoryItems = db.collection("memory_items");
const { normalizePetType } = require("../utils/format");

function now() {
  return new Date();
}

function normalizeMediaType(type) {
  return ["image", "video", "none"].includes(type) ? type : "none";
}

function normalizeVisibility(visibility) {
  return visibility === "private" ? "private" : "pending";
}

async function callMemorialApi(action, data) {
  try {
    const result = await wx.cloud.callFunction({
      name: "memorialApi",
      data: {
        action,
        data: data || {}
      }
    });
    return result && result.result ? result.result.data : null;
  } catch (error) {
    error.stage = `memorialApi:${action}`;
    throw error;
  }
}

async function callAdminReview(action, data) {
  const result = await wx.cloud.callFunction({
    name: "adminReview",
    data: {
      action,
      data: data || {}
    }
  });
  return result && result.result ? result.result : null;
}

async function createPawMemory(input) {
  let cloudError = null;
  try {
    return await callMemorialApi("createPawMemory", input);
  } catch (error) {
    cloudError = error;
    if (normalizeVisibility(input.visibility) !== "private") {
      console.error("云函数发布公开小爪记忆失败", error);
      throw error;
    }
    console.warn("云函数发布小爪记忆失败，尝试本地数据库兜底", error);
  }

  try {
    return await createPawMemoryFallback(input);
  } catch (fallbackError) {
    fallbackError.stage = "paw_memories.add";
    fallbackError.cloudError = cloudError;
    throw fallbackError;
  }
}

async function createPawMemoryFallback(input) {
  const createdAt = now();
  const visibility = normalizeVisibility(input.visibility);
  const mediaType = normalizeMediaType(input.media_type);
  const mediaUrl = mediaType === "none" ? "" : input.media_url || input.media_file_id || "";
  const data = {
    owner_openid: input.owner_openid || "",
    owner_key: input.owner_key || "",
    pet_id: input.pet_id || "",
    pet_name: input.pet_name || "",
    pet_type: normalizePetType(input.pet_type),
    pet_avatar: input.pet_avatar || "",
    content: String(input.content || "").trim(),
    media_type: mediaUrl ? mediaType : "none",
    media_file_id: mediaUrl,
    media_url: mediaUrl,
    video_cover: input.video_cover || "",
    review_status: visibility === "private" ? "private" : "pending",
    visibility,
    likes_count: 0,
    paw_lights_count: 0,
    favorites_count: 0,
    comments_count: 0,
    save_to_memory_items: false,
    linked_memory_item_id: "",
    created_at: createdAt,
    updated_at: createdAt
  };

  try {
    const result = await pawMemories.add({ data });
    return {
      _id: result._id,
      ...data
    };
  } catch (error) {
    if (!isCollectionMissing(error)) throw error;
    return await createMemoryItemFallback(input, data);
  }
}

function isCollectionMissing(error) {
  const text = [
    error && error.errCode,
    error && error.errMsg,
    error && error.message
  ].filter(Boolean).join(" ");

  return text.indexOf("DATABASE_COLLECTION_NOT_EXIST") >= 0 ||
    text.indexOf("collection not exists") >= 0 ||
    text.indexOf("Db or Table not exist") >= 0;
}

async function createMemoryItemFallback(input, pawData) {
  const createdAt = pawData.created_at || now();
  const visibility = normalizeVisibility(input.visibility);
  const mediaType = pawData.media_type === "video" ? "video" : "photo";
  const data = {
    memorial_id: input.pet_id || "",
    owner_openid: input.owner_openid || "",
    owner_key: input.owner_key || "",
    item_type: mediaType,
    media_url: pawData.media_url || "",
    media_file_id: pawData.media_file_id || pawData.media_url || "",
    cover_url: pawData.video_cover || "",
    title: "小爪记忆",
    content: pawData.content || "",
    memory_date: createdAt.toISOString ? createdAt.toISOString().slice(0, 10) : "",
    visibility,
    likes_count: 0,
    paw_lights_count: 0,
    favorites_count: 0,
    comments_count: 0,
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await memoryItems.add({ data });
  return {
    _id: result._id,
    source_type: "memory_item",
    ...pawData,
    linked_memory_item_id: result._id
  };
}

async function listPublic(filter) {
  try {
    return await callMemorialApi("listPublicPawMemories", filter || {}) || [];
  } catch (error) {
    console.warn("读取小爪记忆失败，暂时显示为空", error);
    return [];
  }
}

async function listMine() {
  try {
    return await callMemorialApi("listMyPawMemories") || [];
  } catch (error) {
    console.warn("读取我的小爪记忆失败，暂时显示为空", error);
    return [];
  }
}

async function listPending() {
  try {
    return await callMemorialApi("listPendingPawMemories") || [];
  } catch (error) {
    console.warn("读取待审核小爪记忆失败，暂时显示为空", error);
    return [];
  }
}

async function getPawMemory(input) {
  return await callMemorialApi("getPawMemory", input || {});
}

async function listApprovedComments(pawMemoryId, options) {
  try {
    return await callMemorialApi("listApprovedPawMemoryComments", {
      paw_memory_id: pawMemoryId,
      ...(options || {})
    }) || [];
  } catch (error) {
    console.warn("读取小爪记忆留言失败，暂时显示为空", error);
    return [];
  }
}

async function listPendingComments() {
  try {
    return await callMemorialApi("listPendingPawMemoryComments") || [];
  } catch (error) {
    console.warn("读取待审核小爪记忆留言失败，暂时显示为空", error);
    return [];
  }
}

async function createComment(input) {
  return await callMemorialApi("createPawMemoryComment", input);
}

async function replyComment(input) {
  return await callMemorialApi("replyPawMemoryComment", input);
}

async function likeComment(input) {
  const result = await wx.cloud.callFunction({
    name: "memorialApi",
    data: {
      action: "addPawMemoryCommentLike",
      data: input || {}
    }
  });
  return result && result.result
    ? result.result
    : { added: false, removed: false };
}

async function addInteraction(input) {
  const result = await wx.cloud.callFunction({
    name: "memorialApi",
    data: {
      action: "addPawMemoryInteraction",
      data: input || {}
    }
  });
  return result && result.result
    ? result.result
    : { added: false, removed: false };
}

async function hidePawMemory(input) {
  return await callMemorialApi("hidePawMemory", input || {});
}

async function deletePawMemory(input) {
  return await callMemorialApi("deletePawMemory", input || {});
}

async function reviewPawMemory(id, approved, sourceType) {
  const result = await callAdminReview(
    approved ? "approvePawMemory" : "rejectPawMemory",
    { id, source_type: sourceType || "paw_memory" }
  );
  if (result && result.ok === false) throw new Error(result.error || "REVIEW_FAILED");
  return result;
}

async function reviewPawMemoryComment(id, approved) {
  const result = await callAdminReview(
    approved ? "approvePawMemoryComment" : "rejectPawMemoryComment",
    { id }
  );
  if (result && result.ok === false) throw new Error(result.error || "REVIEW_FAILED");
  return result;
}

module.exports = {
  createPawMemory,
  getPawMemory,
  listPublic,
  listMine,
  listPending,
  listApprovedComments,
  listPendingComments,
  createComment,
  replyComment,
  likeComment,
  addInteraction,
  hidePawMemory,
  deletePawMemory,
  reviewPawMemory,
  reviewPawMemoryComment
};
