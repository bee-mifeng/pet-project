const db = wx.cloud.database();
const messages = db.collection("messages");

function now() {
  return new Date();
}

async function createMessage(input) {
  const result = await messages.add({
    data: {
      memorial_id: input.memorial_id,
      visitor_key: input.visitor_key,
      visitor_openid: "",
      visitor_name: input.visitor_name || "路过的朋友",
      content: input.content,
      review_status: "pending",
      created_at: now()
    }
  });
  return result._id;
}

async function listApprovedMessages(memorialId) {
  const result = await messages
    .where({
      memorial_id: memorialId,
      review_status: "approved"
    })
    .orderBy("created_at", "desc")
    .get();
  return result.data;
}

async function listPendingMessages() {
  const result = await messages.where({ review_status: "pending" }).orderBy("created_at", "desc").get();
  return result.data;
}

async function reviewMessage(id, approved) {
  await messages.doc(id).update({
    data: {
      review_status: approved ? "approved" : "rejected"
    }
  });
}

module.exports = {
  createMessage,
  listApprovedMessages,
  listPendingMessages,
  reviewMessage
};
