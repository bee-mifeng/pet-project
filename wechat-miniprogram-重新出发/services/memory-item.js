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
  try {
    return await callMemorialApi("createMemoryItem", input);
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
