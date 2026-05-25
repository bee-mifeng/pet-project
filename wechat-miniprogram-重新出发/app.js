const { CLOUD_ENV_ID } = require("./config/env");

App({
  globalData: {
    openid: "",
    userKey: ""
  },

  onLaunch() {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true
    });

    this.globalData.userKey = this.ensureUserKey();
    this.getOpenId();
  },

  ensureUserKey() {
    let userKey = wx.getStorageSync("pawsmeadow_memory_user_key");
    if (!userKey) {
      userKey = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      wx.setStorageSync("pawsmeadow_memory_user_key", userKey);
    }
    return userKey;
  },

  async getOpenId() {
    if (this.globalData.openid) return this.globalData.openid;

    try {
      const result = await wx.cloud.callFunction({ name: "login" });
      const openid = result && result.result ? result.result.openid || "" : "";
      this.globalData.openid = openid;
      return openid;
    } catch (error) {
      console.error("获取 openid 失败", error);
      return "";
    }
  }
});
