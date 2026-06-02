const cardService = require("../../services/card");
const messageService = require("../../services/message");
const mediaService = require("../../services/media");
const pawMemoryService = require("../../services/paw-memory");
const { decorateCard, formatDate, normalizePetType, petTypeLabel } = require("../../utils/format");
const { isAdminOpenId, normalizeOpenId } = require("../../config/admin");

const AI_REVIEW_STATUS_TEXT = {
  block: "AI 高风险",
  review: "AI 建议复核",
  failed: "AI 检测失败",
  skipped: "AI 未执行",
  pass: "AI 已通过"
};

const AI_REVIEW_PRIORITY = {
  block: 1,
  review: 2,
  failed: 3,
  skipped: 4,
  pass: 5
};

function normalizeAiReviewStatus(status) {
  return ["block", "review", "failed", "skipped", "pass"].includes(status)
    ? status
    : "";
}

function decorateAiReview(item) {
  const status = normalizeAiReviewStatus(item.ai_review_status);
  const score = Number(item.ai_review_score || 0);
  return {
    ...item,
    ai_review_status_class: status || "unknown",
    ai_review_status_label: status ? AI_REVIEW_STATUS_TEXT[status] : "",
    ai_review_score_label: score > 0 ? `${score}分` : "",
    ai_reviewed_label: formatDate(item.ai_reviewed_at) || "",
    ai_review_reason: item.ai_review_reason || ""
  };
}

function sortAiReviewList(list) {
  return (list || []).slice().sort((left, right) => {
    const leftPriority = AI_REVIEW_PRIORITY[left.ai_review_status] || 9;
    const rightPriority = AI_REVIEW_PRIORITY[right.ai_review_status] || 9;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return 0;
  });
}

function decoratePawMemory(item) {
  const petType = normalizePetType(item.pet_type);
  return {
    ...item,
    pet_type: petType,
    pet_type_label: petTypeLabel(petType),
    created_label: formatDate(item.memory_date || item.created_at) || "刚刚",
    source_label: item.source_label || "小爪记忆"
  };
}

Page({
  data: {
    openid: "",
    isAdmin: false,
    authChecked: false,
    activeTab: "cards",
    pendingCards: [],
    pendingMessages: [],
    pendingPawMemories: [],
    pendingPawMemoryComments: [],
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
      const [cards, messages, pawMemories, pawMemoryComments] = await Promise.all([
        cardService.listPendingCards(),
        messageService.listPendingMessages(),
        pawMemoryService.listPending(),
        pawMemoryService.listPendingComments()
      ]);
      const cardsWithMedia = await mediaService.attachMediaUrls(cards || []);
      const pawMemoriesWithMedia = await mediaService.attachPawMemoryUrls(pawMemories || []);

      this.setData({
        pendingCards: sortAiReviewList(cardsWithMedia.map((item) => decorateAiReview(decorateCard(item)))),
        pendingMessages: sortAiReviewList((messages || []).map(decorateAiReview)),
        pendingPawMemories: sortAiReviewList(pawMemoriesWithMedia.map((item) => decorateAiReview(decoratePawMemory(item)))),
        pendingPawMemoryComments: sortAiReviewList((pawMemoryComments || []).map(decorateAiReview)),
        loading: false
      });
    } catch (error) {
      this.setData({
        pendingCards: [],
        pendingMessages: [],
        pendingPawMemories: [],
        pendingPawMemoryComments: [],
        loading: false
      });
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

  async reviewPawMemory(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";
    const sourceType = event.currentTarget.dataset.sourceType || "paw_memory";

    try {
      await pawMemoryService.reviewPawMemory(id, approved, sourceType);
      wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "none" });
      this.loadAll();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  async reviewPawMemoryComment(event) {
    if (!this.data.isAdmin) return;

    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";

    try {
      await pawMemoryService.reviewPawMemoryComment(id, approved);
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
