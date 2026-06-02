const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const pawMemoryService = require("../../services/paw-memory");
const cardGate = require("../../utils/card-gate");
const { decorateCard, normalizePetType, petTypeLabel, visibilityLabel } = require("../../utils/format");
const { isAdminOpenId, normalizeOpenId } = require("../../config/admin");

function decoratePawMemory(memory) {
  const petType = normalizePetType(memory.pet_type);
  return {
    ...memory,
    pet_type: petType,
    pet_type_label: petTypeLabel(petType),
    visibility_label: visibilityLabel(memory.visibility),
    visibility_class: memory.visibility || "pending",
    likes_count: memory.likes_count || 0,
    comments_count: memory.comments_count || 0,
    paw_lights_count: memory.paw_lights_count || 0
  };
}

Page({
  data: {
    cards: [],
    pawMemories: [],
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
      let pawMemoriesWithMedia = [];

      try {
        const pawMemories = await pawMemoryService.listMine();
        pawMemoriesWithMedia = await mediaService.attachPawMemoryUrls(pawMemories);
      } catch (pawMemoryError) {
        console.warn("我的小爪记忆加载失败，暂时显示为空", pawMemoryError);
      }

      const decoratedCards = cardsWithMedia.map(decorateCard);
      const decoratedPawMemories = pawMemoriesWithMedia.map(decoratePawMemory);

      this.setData({
        cards: decoratedCards,
        pawMemories: decoratedPawMemories,
        loading: false
      });
    } catch (error) {
      this.setData({
        cards: [],
        pawMemories: [],
        loading: false,
        loadFailed: true
      });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  goCreate() {
    cardGate.goCreateCardPage();
  },

  openCard(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/card/index?id=${id}` });
  },

  goAdmin() {
    wx.navigateTo({ url: "/pages/admin/index" });
  },

  async goPawMemoryCreate() {
    if (this.data.cards.length === 0) {
      const card = await cardGate.ensureHasCard({
        content: "创建毛孩子记忆卡后，就可以发布它的小爪记忆。"
      });
      if (!card) return;
    }

    wx.navigateTo({ url: "/pages/paw-memory-create/index" });
  },

  openPawMemory(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/paw-memory-detail/index?id=${id}` });
  },

  openPawMemoryCard(event) {
    const petId = event.currentTarget.dataset.petId;
    if (!petId) {
      wx.showToast({ title: "暂时没有找到对应记忆卡", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/card/index?id=${petId}` });
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
