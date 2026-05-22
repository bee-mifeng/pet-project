App({
  globalData: {
    userKey: ""
  },

  onLaunch() {
    wx.cloud.init({
      env: "pawsmeadow-d4gah5qxh7a003f24",
      traceUser: true
    });

    this.globalData.userKey = this.ensureUserKey();
  },

  ensureUserKey() {
    let userKey = wx.getStorageSync("pawsmeadow_user_key");
    if (!userKey) {
      userKey = `user-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      wx.setStorageSync("pawsmeadow_user_key", userKey);
    }
    return userKey;
  }
});
