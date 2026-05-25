const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const { decorateCard } = require("../../utils/format");

function isValidDateText(text) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(text || "").trim());
}

Page({
  data: {
    cards: [],
    loading: true,
    loadFailed: false,
    openid: ""
  },

  onShow() {
    this.loadMine();
  },

  async loadMine() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const cards = await cardService.listMine(openid);
      const cardsWithMedia = await mediaService.attachMediaUrls(cards);
      this.setData({
        openid,
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

  choosePetStatus(event) {
    const { id, status, starDate } = event.currentTarget.dataset;
    wx.showActionSheet({
      itemList: ["陪伴中", "在星星上"],
      success: async (res) => {
        const nextStatus = res.tapIndex === 0 ? "living" : "star";
        if (nextStatus === status) return;

        if (nextStatus === "living") {
          this.confirmLivingStatus(id);
          return;
        }

        this.promptStarDate(id, starDate);
      }
    });
  },

  confirmLivingStatus(id) {
    wx.showModal({
      title: "改为陪伴中",
      content: "确认后会清空“去星星上的日子”。",
      confirmText: "确认修改",
      confirmColor: "#2F4B38",
      success: async (res) => {
        if (!res.confirm) return;
        this.updatePetStatus(id, "living", "");
      }
    });
  },

  promptStarDate(id, oldDate) {
    wx.showModal({
      title: "去星星上的日子",
      content: oldDate || "",
      editable: true,
      placeholderText: "请输入日期，如 2026-05-25",
      confirmText: "保存",
      confirmColor: "#2F4B38",
      success: async (res) => {
        if (!res.confirm) return;
        const starDate = String(res.content || "").trim();
        if (!isValidDateText(starDate)) {
          wx.showToast({ title: "请按 YYYY-MM-DD 填写日期", icon: "none" });
          return;
        }
        this.updatePetStatus(id, "star", starDate);
      }
    });
  },

  async updatePetStatus(id, status, starDate) {
    wx.showLoading({ title: "正在保存" });
    try {
      await cardService.updatePetStatus(id, status, starDate);
      wx.hideLoading();
      wx.showToast({ title: "状态已更新", icon: "success" });
      this.loadMine();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "更新失败，请稍后再试", icon: "none" });
    }
  }
});
