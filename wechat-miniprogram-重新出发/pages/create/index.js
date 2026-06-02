const cardService = require("../../services/card");
const uploadService = require("../../services/upload");
const { PET_TYPE_OPTIONS, normalizePetType } = require("../../utils/format");

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const MAX_VIDEO_DURATION = 20;
const MAX_VIDEO_SIZE = 30 * 1024 * 1024;

Page({
  data: {
    petTypes: PET_TYPE_OPTIONS,
    petTypeIndex: -1,
    form: {
      pet_name: "",
      pet_type: "",
      pet_status: "living",
      birth_or_adopted_date: "",
      star_date: "",
      story: "",
      message: "",
      visibility: "private",
      allow_messages: true
    },
    photoPath: "",
    photoSize: 0,
    videoPath: "",
    videoDuration: 0,
    videoSize: 0,
    submitting: false
  },

  inputText(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  changePetType(event) {
    const index = Number(event.detail.value);
    this.setData({
      petTypeIndex: index,
      "form.pet_type": normalizePetType(this.data.petTypes[index].value)
    });
  },

  changePetStatus(event) {
    const status = event.currentTarget.dataset.status;
    this.setData({
      "form.pet_status": status,
      "form.star_date": status === "living" ? "" : this.data.form.star_date
    });
  },

  changeDate(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
  },

  switchChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: event.detail.value });
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
        photoPath: file.tempFilePath,
        photoSize: file.size || 0
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
        wx.showToast({ title: "视频不能超过20秒", icon: "none" });
        return;
      }
      if (file.size > MAX_VIDEO_SIZE) {
        wx.showToast({ title: "视频不能超过30MB", icon: "none" });
        return;
      }

      this.setData({
        videoPath: file.tempFilePath,
        videoDuration: duration,
        videoSize: file.size || 0
      });
    } catch (error) {
      wx.showToast({ title: "没有选择视频", icon: "none" });
    }
  },

  removeVideo() {
    this.setData({
      videoPath: "",
      videoDuration: 0,
      videoSize: 0
    });
  },

  validate() {
    if (!this.data.form.pet_name.trim()) {
      wx.showToast({ title: "请填写它的名字", icon: "none" });
      return false;
    }
    if (!this.data.form.pet_type) {
      wx.showToast({ title: "请选择宠物类型", icon: "none" });
      return false;
    }
    if (!this.data.photoPath) {
      wx.showToast({ title: "请上传一张照片", icon: "none" });
      return false;
    }
    if (this.data.photoSize > MAX_PHOTO_SIZE) {
      wx.showToast({ title: "图片不能超过 2MB", icon: "none" });
      return false;
    }
    if (this.data.videoDuration > MAX_VIDEO_DURATION) {
      wx.showToast({ title: "视频不能超过20秒", icon: "none" });
      return false;
    }
    if (this.data.videoSize > MAX_VIDEO_SIZE) {
      wx.showToast({ title: "视频不能超过30MB", icon: "none" });
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
        wx.showToast({ title: "身份获取失败，请稍后再试", icon: "none" });
        return;
      }

      const photoUrl = await uploadService.uploadPetPhoto(this.data.photoPath, openid || ownerKey);
      const videoUrl = this.data.videoPath
        ? await uploadService.uploadPetVideo(this.data.videoPath, openid || ownerKey)
        : "";
      const created = await cardService.createCard({
        ...this.data.form,
        owner_openid: openid,
        owner_key: ownerKey,
        photo_url: photoUrl,
        video_url: videoUrl,
        video_duration: this.data.videoDuration,
        video_size: this.data.videoSize
      });

      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "none" });
      wx.navigateTo({ url: `/pages/card/index?id=${created._id}` });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败，请检查云开发配置", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
