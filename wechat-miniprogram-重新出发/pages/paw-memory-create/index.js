const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const uploadService = require("../../services/upload");
const pawMemoryService = require("../../services/paw-memory");
const cardGate = require("../../utils/card-gate");
const { decorateCard } = require("../../utils/format");

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_DURATION = 30;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

function errorText(error) {
  if (!error) return "未知错误";
  const parts = [
    error.stage,
    error.errCode,
    error.errMsg,
    error.message
  ].filter(Boolean);

  if (error.cloudError) {
    parts.push("cloud:");
    parts.push(error.cloudError.stage);
    parts.push(error.cloudError.errCode);
    parts.push(error.cloudError.errMsg);
    parts.push(error.cloudError.message);
  }

  return parts.join(" | ") || String(error);
}

Page({
  data: {
    cards: [],
    selectedCardIndex: -1,
    selectedCard: null,
    content: "",
    visibility: "pending",
    mediaType: "none",
    mediaPath: "",
    videoCoverPath: "",
    mediaSize: 0,
    videoDuration: 0,
    loading: true,
    loadFailed: false,
    submitting: false
  },

  onLoad() {
    this.loadCards();
  },

  async loadCards() {
    this.setData({ loading: true, loadFailed: false });

    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const cards = await cardService.listMine(openid);
      const withMedia = await mediaService.attachMediaUrls(cards || []);

      this.setData({
        cards: withMedia.map(decorateCard),
        selectedCardIndex: withMedia.length > 0 ? 0 : -1,
        selectedCard: withMedia.length > 0 ? decorateCard(withMedia[0]) : null,
        loading: false
      });
    } catch (error) {
      this.setData({ cards: [], selectedCardIndex: -1, selectedCard: null, loading: false, loadFailed: true });
      wx.showToast({ title: "读取毛孩子档案失败", icon: "none" });
    }
  },

  changePet(event) {
    const index = Number(event.detail.value);
    this.setData({
      selectedCardIndex: index,
      selectedCard: this.data.cards[index] || null
    });
  },

  inputContent(event) {
    this.setData({ content: event.detail.value });
  },

  switchVisibility(event) {
    this.setData({
      visibility: event.detail.value ? "pending" : "private"
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
        wx.showToast({ title: "图片建议小于 2MB", icon: "none" });
        return;
      }

      this.setData({
        mediaType: "image",
        mediaPath: file.tempFilePath,
        videoCoverPath: "",
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
        wx.showToast({ title: "视频建议 30 秒以内", icon: "none" });
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        wx.showToast({ title: "视频暂不超过 30MB", icon: "none" });
        return;
      }

      this.setData({
        mediaType: "video",
        mediaPath: file.tempFilePath,
        videoCoverPath: file.thumbTempFilePath || "",
        mediaSize: file.size || 0,
        videoDuration: duration
      });
    } catch (error) {
      wx.showToast({ title: "没有选择视频", icon: "none" });
    }
  },

  removeMedia() {
    this.setData({
      mediaType: "none",
      mediaPath: "",
      videoCoverPath: "",
      mediaSize: 0,
      videoDuration: 0
    });
  },

  validate() {
    if (this.data.selectedCardIndex < 0 || !this.data.cards[this.data.selectedCardIndex]) {
      wx.showToast({ title: "请先选择毛孩子", icon: "none" });
      return false;
    }

    if (!this.data.content.trim()) {
      wx.showToast({ title: "请写下今天的小瞬间", icon: "none" });
      return false;
    }

    if (this.data.content.trim().length > 300) {
      wx.showToast({ title: "内容不能超过 300 字", icon: "none" });
      return false;
    }

    if (this.data.mediaType === "image" && this.data.mediaSize > MAX_PHOTO_SIZE) {
      wx.showToast({ title: "图片建议小于 2MB", icon: "none" });
      return false;
    }

    if (this.data.mediaType === "video" && this.data.videoDuration > MAX_VIDEO_DURATION) {
      wx.showToast({ title: "视频建议 30 秒以内", icon: "none" });
      return false;
    }

    return true;
  },

  async submitForm() {
    if (!this.validate() || this.data.submitting) return;

    const app = getApp();
    const ownerKey = app.globalData.userKey || app.ensureUserKey();
    const selectedCard = this.data.selectedCard;

    this.setData({ submitting: true });
    wx.showLoading({ title: "正在提交" });

    try {
      const openid = await app.getOpenId();
      if (!openid) {
        wx.hideLoading();
        wx.showToast({ title: "身份获取失败", icon: "none" });
        return;
      }

      let mediaUrl = "";
      let videoCover = "";
      if (this.data.mediaType === "image") {
        mediaUrl = await uploadService.uploadPawMemoryPhoto(this.data.mediaPath, openid || ownerKey);
      } else if (this.data.mediaType === "video") {
        mediaUrl = await uploadService.uploadPawMemoryVideo(this.data.mediaPath, openid || ownerKey);
        if (this.data.videoCoverPath) {
          try {
            videoCover = await uploadService.uploadPawMemoryVideoCover(this.data.videoCoverPath, openid || ownerKey);
          } catch (coverError) {
            console.warn("上传小爪记忆视频封面失败，继续发布视频", coverError);
          }
        }
      }

      await pawMemoryService.createPawMemory({
        owner_openid: openid,
        owner_key: ownerKey,
        pet_id: selectedCard._id,
        pet_name: selectedCard.pet_name,
        pet_type: selectedCard.pet_type,
        pet_avatar: selectedCard.photo_url,
        content: this.data.content,
        media_type: mediaUrl ? this.data.mediaType : "none",
        media_file_id: mediaUrl,
        media_url: mediaUrl,
        video_cover: videoCover,
        visibility: this.data.visibility,
        save_to_memory_items: false
      });

      wx.hideLoading();
      wx.showToast({
        title: this.data.visibility === "pending" ? "已提交审核" : "已保存",
        icon: "none"
      });
      setTimeout(() => {
        wx.switchTab({
          url: this.data.visibility === "pending"
            ? "/pages/paw-memory/index"
            : "/pages/mine/index"
        });
      }, 900);
    } catch (error) {
      console.error("发布小爪记忆失败", error);
      wx.hideLoading();
      wx.showModal({
        title: "发布失败",
        content: errorText(error).slice(0, 500),
        showCancel: false,
        confirmText: "知道了"
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  goCreateCard() {
    cardGate.goCreateCardPage();
  }
});
