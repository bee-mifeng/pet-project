const db = wx.cloud.database();
const messages = db.collection("messages");

function now() {
  return new Date();
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

async function createMessage(input) {
  try {
    const result = await messages.add({
      data: {
        card_id: input.card_id,
        content: String(input.content || "").trim(),
        openid: input.openid || "",
        visitor_name: String(input.visitor_name || "").trim() || "路过的朋友",
        review_status: "pending",
        created_at: now()
      }
    });
    return result._id;
  } catch (error) {
    console.error("提交留言失败", error);
    throw error;
  }
}

async function listApprovedMessages(cardId) {
  try {
    return await callMemorialApi("listApprovedMessages", { card_id: cardId }) || [];
  } catch (error) {
    console.warn("云函数读取留言失败，改用本地数据库读取", error);
    try {
      const result = await messages
        .where({
          card_id: cardId,
          review_status: "approved"
        })
        .orderBy("created_at", "desc")
        .get();
      return result.data || [];
    } catch (fallbackError) {
      console.error("读取留言失败", fallbackError);
      return [];
    }
  }
}

async function listPendingMessages() {
  try {
    return await callMemorialApi("listPendingMessages") || [];
  } catch (error) {
    console.warn("云函数读取待审核留言失败，改用本地数据库读取", error);
    try {
      const result = await messages
        .where({ review_status: "pending" })
        .orderBy("created_at", "desc")
        .get();
      return result.data || [];
    } catch (fallbackError) {
      console.error("读取待审核留言失败", fallbackError);
      return [];
    }
  }
}

async function reviewMessage(id, approved) {
  try {
    await callMemorialApi("reviewMessage", { id, approved });
  } catch (error) {
    console.error("审核留言失败", error);
    throw error;
  }
}

module.exports = {
  createMessage,
  listApprovedMessages,
  listPendingMessages,
  reviewMessage
};
