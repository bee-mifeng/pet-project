const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const memoryItems = db.collection("memory_items");

const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];

function normalizeOpenId(value) {
  return String(value || "").trim();
}

function isAdminOpenId(openid) {
  return ADMIN_OPENIDS.map(normalizeOpenId).includes(normalizeOpenId(openid));
}

function requireAdmin(openid) {
  if (!isAdminOpenId(openid)) {
    throw new Error("NO_ADMIN_PERMISSION");
  }
}

function now() {
  return new Date();
}

async function reviewMemoryItem(id, visibility) {
  if (!id) throw new Error("MISSING_MEMORY_ITEM_ID");

  await memoryItems.doc(id).update({
    data: {
      visibility,
      updated_at: now()
    }
  });

  return { ok: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = normalizeOpenId(wxContext.OPENID);
  const action = event && event.action;
  const data = event && event.data ? event.data : {};

  requireAdmin(openid);

  switch (action) {
    case "approveMemoryItem":
      return await reviewMemoryItem(data.id, "public");
    case "rejectMemoryItem":
      return await reviewMemoryItem(data.id, "rejected");
    default:
      throw new Error("UNKNOWN_ACTION");
  }
};
