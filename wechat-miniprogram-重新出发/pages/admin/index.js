const cardService = require("../../services/card");
const messageService = require("../../services/message");
const mediaService = require("../../services/media");
const memoryItemService = require("../../services/memory-item");
const { decorateCard, formatDate } = require("../../utils/format");
const { isAdminOpenId, normalizeOpenId } = require("../../config/admin");

function decorateMemoryItem(item) {
  return {
    ...item,
    memory_date_label: formatDate(item.memory_date) || "没有写日期"
  };
}

Page({
  data: {
    openid: "",
    isAdmin: false,
    authChecked: false,
    activeTab: "cards",
    pendingCards: [],
    pendingMemoryItems: [],
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
      const currentOpenId = normalizeOpenId(openid);
      const isAdmin = isAdminOpenId(currentOpenId);

      this.setData({
        openid: currentOpenId,
        isAdmin,
        authChecked: true
      });

      if (isAdmin) this.loadAll();
    } catch (error) {
      console.error("管理员身份校验失败", error);
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
      const [cards, memoryItems, messages] = await Promise.all([
        cardService.listPendingCards(),
        memoryItemService.listPending(),
        messageService.listPendingMessages()
      ]);
      const cardsWithMedia = await mediaService.attachMediaUrls(cards || []);

      this.setData({
        pendingCards: cardsWithMedia.map(decorateCard),
        pendingMemoryItems: (memoryItems || []).map(decorateMemoryItem),
        pendingMessages: messages || [],
        loading: false
      });
    } catch (error) {
      this.setData({ pendingCards: [], pendingMemoryItems: [], pendingMessages: [], loading: false });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  async reviewCard(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await cardService.reviewCard(id, approved);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "none" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  async reviewMessage(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await messageService.reviewMessage(id, approved);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "none" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  async reviewMemoryItem(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await memoryItemService.reviewMemoryItem(id, approved);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "none" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  openCard(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/card/index?id=${id}` });
  }
});
