const db = wx.cloud.database();
const _ = db.command;
const messages = db.collection("messages");

function now() {
  return new Date();
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
    const result = await messages
      .where({
        card_id: cardId,
        review_status: "approved"
      })
      .orderBy("created_at", "desc")
      .get();
    return result.data || [];
  } catch (error) {
    console.error("读取留言失败", error);
    throw error;
  }
}

async function listPendingMessages() {
  try {
    const result = await messages
      .where({
        card_id: _.exists(true),
        review_status: "pending"
      })
      .orderBy("created_at", "desc")
      .get();
    return result.data || [];
  } catch (error) {
    console.error("读取待审核留言失败", error);
    throw error;
  }
}

async function reviewMessage(id, approved) {
  try {
    await messages.doc(id).update({
      data: {
        review_status: approved ? "approved" : "rejected"
      }
    });
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
