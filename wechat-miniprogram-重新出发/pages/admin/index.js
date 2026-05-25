const cardService = require("../../services/card");
const messageService = require("../../services/message");
const mediaService = require("../../services/media");
const { decorateCard } = require("../../utils/format");

const ADMIN_OPENIDS = [
  "o-GlI3auJGArAyOt-pbA5x_pu4Kg",
  "o-GII3auJGArAyOt-pbA5x_pu4Kg",
  "o-GI13auJGArAyOt-pbA5x_pu4Kg",
  "o-GIl3auJGArAyOt-pbA5x_pu4Kg"
];
const DEV_FORCE_ADMIN = false;

Page({
  data: {
    openid: "",
    isAdmin: false,
    authChecked: false,
    activeTab: "cards",
    pendingCards: [],
    pendingMessages: [],
    loading: false
  },

  onShow() {
    this.checkAdminAndLoad();
  },

  async checkAdminAndLoad() {
    this.setData({ authChecked: false, isAdmin: false });

    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const currentOpenId = String(openid || "").trim();
      const isAdmin =
        DEV_FORCE_ADMIN ||
        ADMIN_OPENIDS.map(id => String(id).trim()).includes(currentOpenId);

      console.log("当前 openid:", currentOpenId);
      console.log("管理员列表:", ADMIN_OPENIDS);
      console.log("是否管理员:", isAdmin);

      this.setData({
        openid: currentOpenId,
        isAdmin,
        authChecked: true
      });

      if (isAdmin) this.loadAll();
    } catch (error) {
      this.setData({ openid: "", isAdmin: false, authChecked: true });
      wx.showToast({ title: "身份校验失败", icon: "none" });
    }
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  async loadAll() {
    if (!this.data.isAdmin) return;

    this.setData({ loading: true });
    try {
      const [cards, messages] = await Promise.all([
        cardService.listPendingCards(),
        messageService.listPendingMessages()
      ]);
      const cardsWithMedia = await mediaService.attachMediaUrls(cards);

      this.setData({
        pendingCards: cardsWithMedia.map(decorateCard),
        pendingMessages: messages || [],
        loading: false
      });
    } catch (error) {
      this.setData({ pendingCards: [], pendingMessages: [], loading: false });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  async reviewCard(event) {
    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await cardService.reviewCard(id, approved);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "success" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  async reviewMessage(event) {
    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await messageService.reviewMessage(id, approved);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "success" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  openCard(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/card/index?id=${id}` });
  }
});
