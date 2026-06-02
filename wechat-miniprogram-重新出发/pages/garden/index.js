const cardService = require("../../services/card");
const interactionService = require("../../services/interaction");
const mediaService = require("../../services/media");
const cardGate = require("../../utils/card-gate");
const { PET_TYPE_FILTERS, decorateCard } = require("../../utils/format");

const INTERACTION_STORAGE_KEY = "pawsmeadow_garden_interactions";

function readInteractionMap() {
  return wx.getStorageSync(INTERACTION_STORAGE_KEY) || {};
}

function interactionKey(type, cardId) {
  return `${type}:${cardId}`;
}

function rememberInteraction(type, cardId) {
  const map = readInteractionMap();
  map[interactionKey(type, cardId)] = true;
  wx.setStorageSync(INTERACTION_STORAGE_KEY, map);
}

function forgetInteraction(type, cardId) {
  const map = readInteractionMap();
  delete map[interactionKey(type, cardId)];
  wx.setStorageSync(INTERACTION_STORAGE_KEY, map);
}

function attachLocalInteractionState(card) {
  const map = readInteractionMap();
  return {
    ...card,
    has_liked: typeof card.has_liked === "boolean"
      ? card.has_liked
      : !!map[interactionKey("like", card._id)]
  };
}

Page({
  data: {
    petTypeFilters: PET_TYPE_FILTERS,
    statusFilters: [
      { label: "全部", value: "all" },
      { label: "陪伴中", value: "living" },
      { label: "在星星上", value: "star" }
    ],
    activePetType: "all",
    activePetStatus: "all",
    cards: [],
    loading: true,
    loadFailed: false,
    interacting: false
  },

  onShow() {
    this.loadCards();
  },

  async loadCards() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const cards = await cardService.listPublicCards({
        petType: this.data.activePetType,
        petStatus: this.data.activePetStatus,
        userKey
      });
      const cardsWithMedia = await mediaService.attachMediaUrls(cards);
      this.setData({
        cards: cardsWithMedia.map(decorateCard).map(attachLocalInteractionState),
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
  },

  async interact(event) {
    if (this.data.interacting) return;

    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;
    const index = this.data.cards.findIndex((card) => card._id === id);
    if (index < 0) return;

    const visitorCard = await cardGate.ensureHasCard();
    if (!visitorCard) return;

    this.setData({ interacting: true });
    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const result = await interactionService.addInteraction({
        card_id: id,
        type,
        openid,
        user_key: userKey
      });

      if (!(result && (result.added || result.removed))) {
        this.setData({
          [`cards[${index}].has_liked`]: this.data.cards[index].has_liked
        });
        wx.showToast({ title: "你已经留下过心意了", icon: "none" });
        return;
      }

      const card = this.data.cards[index];
      const nextCount = result.removed
        ? Math.max(0, (card.like_count || 0) - 1)
        : (card.like_count || 0) + 1;
      if (type === "like") {
        if (result.removed) {
          forgetInteraction(type, id);
        } else {
          rememberInteraction(type, id);
        }
      }
      this.setData({
        [`cards[${index}].like_count`]: nextCount,
        [`cards[${index}].has_liked`]: !result.removed,
        [`cards[${index}].primary_interaction_count`]: nextCount
      });
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ interacting: false });
    }
  }
});
