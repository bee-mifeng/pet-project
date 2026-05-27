const db = wx.cloud.database();
const memoryItems = db.collection("memory_items");

function now() {
  return new Date();
}

function normalizeVisibility(visibility) {
  return ["private", "pending", "public", "rejected"].includes(visibility) ? visibility : "private";
}

function normalizeItemType(type) {
  return type === "video" ? "video" : "photo";
}

async function callMemorialApi(action, data) {
  const result = await wx.cloud.callFunction({
    name: "memorialApi",
    data: {
      action,
      data: data || {}
    }
  });
  return result && result.result ? result.result.data : null;
}

async function callAdminReview(action, data) {
  await wx.cloud.callFunction({
    name: "adminReview",
    data: {
      action,
      data: data || {}
    }
  });
}

async function createMemoryItem(input) {
  const createdAt = now();
  const data = {
    memorial_id: input.memorial_id || "",
    owner_openid: input.owner_openid || "",
    owner_key: input.owner_key || "",
    item_type: normalizeItemType(input.item_type),
    media_url: input.media_url || "",
    media_file_id: input.media_file_id || input.media_url || "",
    cover_url: input.cover_url || "",
    title: String(input.title || "").trim(),
    content: String(input.content || "").trim(),
    memory_date: input.memory_date || "",
    visibility: normalizeVisibility(input.visibility),
    created_at: createdAt,
    updated_at: createdAt
  };

  try {
    const result = await memoryItems.add({ data });
    return {
      _id: result._id,
      ...data
    };
  } catch (error) {
    console.error("创建记忆片段失败", error);
    throw error;
  }
}

async function listByMemorial(memorialId) {
  try {
    return await callMemorialApi("listMemoryItems", { memorial_id: memorialId }) || [];
  } catch (error) {
    console.warn("读取记忆片段失败，暂时显示为空", error);
    return [];
  }
}

async function listPending() {
  try {
    return await callMemorialApi("listPendingMemoryItems") || [];
  } catch (error) {
    console.warn("读取待审核记忆片段失败，暂时显示为空", error);
    return [];
  }
}

async function reviewMemoryItem(id, approved) {
  try {
    await callAdminReview(approved ? "approveMemoryItem" : "rejectMemoryItem", { id });
  } catch (error) {
    console.error("审核记忆片段失败", error);
    throw error;
  }
}

module.exports = {
  createMemoryItem,
  listByMemorial,
  listPending,
  reviewMemoryItem
};
