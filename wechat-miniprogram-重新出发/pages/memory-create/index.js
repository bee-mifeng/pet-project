const cardService = require("../../services/card");
const memoryItemService = require("../../services/memory-item");
const uploadService = require("../../services/upload");

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;

Page({
  data: {
    memorialId: "",
    card: null,
    form: {
      memory_date: "",
      title: "",
      content: "",
      visibility: "private"
    },
    mediaType: "",
    mediaPath: "",
    mediaSize: 0,
    videoDuration: 0,
    isOwner: false,
    submitting: false,
    loading: true,
    loadFailed: false
  },

  onLoad(options) {
    this.setData({ memorialId: options.memorial_id || "" });
    this.loadCard();
  },

  async loadCard() {
    if (!this.data.memorialId) {
      this.setData({ loading: false, loadFailed: true });
      return;
    }

    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const card = await cardService.getCard({ id: this.data.memorialId });
      const isOwner = !!card && !!openid && card.owner_openid === openid;
      this.setData({
        card,
        isOwner,
        loading: false,
        loadFailed: !card || !isOwner
      });
    } catch (error) {
      this.setData({ card: null, isOwner: false, loading: false, loadFailed: true });
      wx.showToast({ title: "记忆卡读取失败", icon: "none" });
    }
  },

  inputText(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  changeDate(event) {
    this.setData({ "form.memory_date": event.detail.value });
  },

  switchVisibility(event) {
    this.setData({
      "form.visibility": event.detail.value ? "pending" : "private"
    });
  },

  async choosePhoto() {
    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ["image"],
        sourceType: ["album", "camera"],
        sizeType: ["compressed"]
      });
      const file = result.tempFiles[0];
      if (file.size > MAX_PHOTO_SIZE) {
        wx.showToast({ title: "图片不能超过 2MB", icon: "none" });
        return;
      }

      this.setData({
        mediaType: "photo",
        mediaPath: file.tempFilePath,
        mediaSize: file.size || 0,
        videoDuration: 0
      });
    } catch (error) {
      wx.showToast({ title: "没有选择照片", icon: "none" });
    }
  },

  async chooseVideo() {
    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ["video"],
        sourceType: ["album", "camera"],
        maxDuration: MAX_VIDEO_DURATION,
        camera: "back"
      });
      const file = result.tempFiles[0];
      const duration = Math.ceil(file.duration || 0);

      if (duration > MAX_VIDEO_DURATION) {
        wx.showToast({ title: "视频不能超过30秒", icon: "none" });
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        wx.showToast({ title: "视频建议不超过20MB", icon: "none" });
        return;
      }

      this.setData({
        mediaType: "video",
        mediaPath: file.tempFilePath,
        mediaSize: file.size || 0,
        videoDuration: duration
      });
    } catch (error) {
      wx.showToast({ title: "没有选择视频", icon: "none" });
    }
  },

  removeMedia() {
    this.setData({
      mediaType: "",
      mediaPath: "",
      mediaSize: 0,
      videoDuration: 0
    });
  },

  validate() {
    if (!this.data.card || !this.data.memorialId || !this.data.isOwner) {
      wx.showToast({ title: "没有找到对应记忆卡", icon: "none" });
      return false;
    }
    if (!this.data.form.memory_date) {
      wx.showToast({ title: "请选择记忆日期", icon: "none" });
      return false;
    }
    if (!this.data.mediaPath) {
      wx.showToast({ title: "请选择照片或视频", icon: "none" });
      return false;
    }
    if (!this.data.form.title.trim()) {
      wx.showToast({ title: "请写一句标题", icon: "none" });
      return false;
    }
    return true;
  },

  async submitForm() {
    if (!this.validate() || this.data.submitting) return;

    const app = getApp();
    const ownerKey = app.globalData.userKey || app.ensureUserKey();
    this.setData({ submitting: true });
    wx.showLoading({ title: "正在保存" });

    try {
      const openid = await app.getOpenId();
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: "身份获取失败", icon: "none" });
        return;
      }

      const mediaUrl = this.data.mediaType === "video"
        ? await uploadService.uploadMemoryVideo(this.data.mediaPath, openid || ownerKey)
        : await uploadService.uploadMemoryPhoto(this.data.mediaPath, openid || ownerKey);

      await memoryItemService.createMemoryItem({
        memorial_id: this.data.memorialId,
        owner_openid: openid,
        owner_key: ownerKey,
        item_type: this.data.mediaType,
        media_url: mediaUrl,
        media_file_id: mediaUrl,
        title: this.data.form.title,
        content: this.data.form.content,
        memory_date: this.data.form.memory_date,
        visibility: this.data.form.visibility
      });

      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "none" });
      wx.redirectTo({ url: `/pages/card/index?id=${this.data.memorialId}` });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
