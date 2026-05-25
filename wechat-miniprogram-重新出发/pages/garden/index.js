const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const { decorateCard } = require("../../utils/format");

Page({
  data: {
    petTypeFilters: [
      { label: "全部", value: "all" },
      { label: "猫咪", value: "cat" },
      { label: "狗狗", value: "dog" },
      { label: "其他", value: "other" }
    ],
    statusFilters: [
      { label: "全部", value: "all" },
      { label: "陪伴中", value: "living" },
      { label: "在星星上", value: "star" }
    ],
    activePetType: "all",
    activePetStatus: "all",
    cards: [],
    loading: true,
    loadFailed: false
  },

  onShow() {
    this.loadCards();
  },

  async loadCards() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const cards = await cardService.listPublicCards({
        petType: this.data.activePetType,
        petStatus: this.data.activePetStatus
      });
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

  changePetTypeFilter(event) {
    const filter = event.currentTarget.dataset.filter;
    this.setData({ activePetType: filter });
    this.loadCards();
  },

  changeStatusFilter(event) {
    const filter = event.currentTarget.dataset.filter;
    this.setData({ activePetStatus: filter });
    this.loadCards();
  },

  openCard(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/card/index?id=${id}` });
  }
});
