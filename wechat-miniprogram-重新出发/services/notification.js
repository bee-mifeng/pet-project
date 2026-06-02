async function callMemorialApi(action, data) {
  const result = await wx.cloud.callFunction({
    name: "memorialApi",
    data: {
      action,
      data: data || {}
    }
  });
  return result && result.result ? result.result.data || result.result : null;
}

async function listNotifications(input) {
  try {
    return await callMemorialApi("listNotifications", input || {}) || [];
  } catch (error) {
    console.warn("读取动态通知失败", error);
    return [];
  }
}

async function getUnreadCount(input) {
  try {
    const result = await callMemorialApi("getUnreadNotificationCount", input || {});
    return result && typeof result.count === "number" ? result.count : 0;
  } catch (error) {
    console.warn("读取未读动态通知失败", error);
    return 0;
  }
}

async function markRead(input) {
  try {
    return await callMemorialApi("markNotificationsRead", input || {});
  } catch (error) {
    console.warn("标记动态通知已读失败", error);
    return { ok: false };
  }
}

module.exports = {
  listNotifications,
  getUnreadCount,
  markRead
};
