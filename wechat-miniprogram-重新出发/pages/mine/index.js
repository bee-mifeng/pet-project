const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const { decorateCard } = require("../../utils/format");
const { isAdminOpenId, normalizeOpenId } = require("../../config/admin");

Page({
  data: {
    cards: [],
    loading: true,
    loadFailed: false,
    openid: "",
    isAdmin: false
  },

  onShow() {
    this.loadMine();
  },

  async loadMine() {
    this.setData({ loading: true, loadFailed: false });

    const app = getApp();
    const openid = await app.getOpenId();
    const currentOpenId = normalizeOpenId(openid);
    const isAdmin = isAdminOpenId(currentOpenId);

    this.setData({
      openid: currentOpenId,
      isAdmin
    });

    try {
      const cards = await cardService.listMine(currentOpenId);
      const cardsWithMedia = await mediaService.attachMediaUrls(cards);
      this.setData({
        cards: cardsWithMedia.map(decorateCard),
        loading: false
      });
    } catch (error) {
      this.setData({ cards: [], loading: false, loadFailed: true });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  goCreate() {
    wx.switchTab({ url: "/pages/create/index" });
  },

  openCard(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/card/index?id=${id}` });
  },

  goAdmin() {
    wx.navigateTo({ url: "/pages/admin/index" });
  },

  noop() {},

  choosePetStatus(event) {
    const { id, status } = event.currentTarget.dataset;
    wx.showActionSheet({
      itemList: status === "star" ? ["陪伴中"] : ["选择去星星上的日子"],
      success: async (res) => {
        if (status === "star") {
          this.confirmLivingStatus(id);
          return;
        }

        wx.showToast({ title: "请点日期选择器选择日子", icon: "none" });
      }
    });
  },

  confirmLivingStatus(id) {
    wx.showModal({
      title: "改为陪伴中",
      content: "确认后会清空“去星星上的日子”。",
      confirmText: "确认修改",
      confirmColor: "#5B5F97",
      success: async (res) => {
        if (!res.confirm) return;
        this.updatePetStatus(id, "living", "");
      }
    });
  },

  changeMineStarDate(event) {
    const id = event.currentTarget.dataset.id;
    this.updatePetStatus(id, "star", event.detail.value);
  },

  async updatePetStatus(id, status, starDate) {
    wx.showLoading({ title: "正在保存" });
    try {
      await cardService.updatePetStatus(id, status, starDate);
      wx.hideLoading();
      wx.showToast({ title: "状态已更新", icon: "none" });
      this.loadMine();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "更新失败，请稍后再试", icon: "none" });
    }
  }
});
