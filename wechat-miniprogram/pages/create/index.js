const memorialService = require("../../services/memorial");
const uploadService = require("../../services/upload");

Page({
  data: {
    petTypes: [
      { label: "猫咪", value: "cat" },
      { label: "狗狗", value: "dog" },
      { label: "其他", value: "other" }
    ],
    petTypeIndex: -1,
    form: {
      pet_name: "",
      pet_type: "",
      birth_or_adopted_date: "",
      passed_date: "",
      story: "",
      message: "",
      apply_public: false,
      allow_messages: true
    },
    photoPath: "",
    submitting: false
  },

  inputText(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },

  changePetType(event) {
    const index = Number(event.detail.value);
    this.setData({
      petTypeIndex: index,
      "form.pet_type": this.data.petTypes[index].value
    });
  },

  changeDate(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
    });
  },

  switchChange(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`form.${key}`]: event.detail.value
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
      this.setData({ photoPath: result.tempFiles[0].tempFilePath });
    } catch (error) {
      wx.showToast({ title: "没有选择照片", icon: "none" });
    }
  },

  validate() {
    if (!this.data.form.pet_name.trim()) {
      wx.showToast({ title: "请填写它的名字", icon: "none" });
      return false;
    }
    if (!this.data.form.pet_type) {
      wx.showToast({ title: "请选择它是猫咪、狗狗或其他", icon: "none" });
      return false;
    }
    if (!this.data.photoPath) {
      wx.showToast({ title: "请上传一张照片", icon: "none" });
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
      const photoUrl = await uploadService.uploadPetPhoto(this.data.photoPath, ownerKey);
      const created = await memorialService.createMemorial({
        ...this.data.form,
        owner_key: ownerKey,
        photo_url: photoUrl
      });
      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "success" });
      wx.navigateTo({
        url: `/pages/memorial/index?id=${created._id}`
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "保存失败，请检查云开发配置", icon: "none" });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
