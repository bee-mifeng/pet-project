const cardService = require("../../services/card");
const messageService = require("../../services/message");
const interactionService = require("../../services/interaction");
const memoryItemService = require("../../services/memory-item");
const mediaService = require("../../services/media");
const { decorateCard, formatDate, visibilityLabel } = require("../../utils/format");

function decorateMemoryItem(item) {
  return {
    ...item,
    visibility_label: visibilityLabel(item.visibility),
    memory_date_label: formatDate(item.memory_date) || "没有写日期"
  };
}

Page({
  data: {
    id: "",
    slug: "",
    openid: "",
    card: null,
    memoryItems: [],
    messages: [],
    loading: true,
    loadFailed: false,
    isOwner: false,
    comment: {
      visitor_name: "",
      content: ""
    },
    submittingMessage: false
  },

  onLoad(options) {
    this.setData({
      id: options.id || "",
      slug: options.slug || ""
    });
    this.loadCard();
  },

  async loadCard() {
    this.setData({ loading: true, loadFailed: false });
    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const card = await cardService.getCard({ id: this.data.id, slug: this.data.slug });

      if (!card) {
        this.setData({ card: null, memoryItems: [], messages: [], loading: false });
        return;
      }

      const [cardWithMedia, memoryItems, messages] = await Promise.all([
        mediaService.attachMediaUrl(card),
        memoryItemService.listByMemorial(card._id),
        messageService.listApprovedMessages(card._id)
      ]);
      this.setData({
        openid,
        card: decorateCard(cardWithMedia),
        memoryItems: (memoryItems || []).map(decorateMemoryItem),
        messages,
        isOwner: !!openid && openid === card.owner_openid,
        loading: false
      });
    } catch (error) {
      this.setData({ card: null, memoryItems: [], messages: [], loading: false, loadFailed: true });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  async applyPublic() {
    if (!this.data.card) return;

    wx.showLoading({ title: "正在提交" });
    try {
      await cardService.applyPublic(this.data.card._id);
      wx.hideLoading();
      wx.showToast({ title: "申请已提交", icon: "none" });
      this.loadCard();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "提交失败，请稍后再试", icon: "none" });
    }
  },

  async makePrivate() {
    if (!this.data.card) return;

    const isPublic = this.data.card.visibility === "public";
    wx.showModal({
      title: isPublic ? "取消公开展示" : "撤回公开申请",
      content: isPublic
        ? "取消后，这张记忆卡将不再出现在记忆花园，但私密链接仍可打开。"
        : "撤回后，这张记忆卡会回到私密状态，不再进入审核列表。",
      confirmText: isPublic ? "取消公开" : "撤回申请",
      confirmColor: "#5B5F97",
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: "正在处理" });
        try {
          await cardService.makePrivate(this.data.card._id);
          wx.hideLoading();
          wx.showToast({ title: "已改为私密", icon: "none" });
          this.loadCard();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: "处理失败，请稍后再试", icon: "none" });
        }
      }
    });
  },

  async changeOwnerPetStatus(event) {
    if (!this.data.card) return;
    const status = event.currentTarget.dataset.status;
    if (status === this.data.card.pet_status) return;

    if (status === "living") {
      wx.showModal({
        title: "改为陪伴中",
        content: "确认后会清空“去星星上的日子”。",
        confirmText: "确认修改",
        confirmColor: "#5B5F97",
        success: (res) => {
          if (!res.confirm) return;
          this.updatePetStatus("living", "");
        }
      });
      return;
    }

    wx.showToast({ title: "请选择去星星上的日子", icon: "none" });
  },

  changeOwnerStarDate(event) {
    if (!this.data.card) return;
    this.updatePetStatus("star", event.detail.value);
  },

  async updatePetStatus(status, starDate) {
    if (!this.data.card) return;

    wx.showLoading({ title: "正在保存" });
    try {
      await cardService.updatePetStatus(this.data.card._id, status, starDate);
      wx.hideLoading();
      wx.showToast({ title: "状态已更新", icon: "none" });
      this.loadCard();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "更新失败，请稍后再试", icon: "none" });
    }
  },

  goCreateMemoryItem() {
    if (!this.data.card) return;
    wx.navigateTo({ url: `/pages/memory-create/index?memorial_id=${this.data.card._id}` });
  },

  async interact(event) {
    if (!this.data.card) return;
    const type = event.currentTarget.dataset.type;
    const app = getApp();
    const openid = this.data.openid || (await app.getOpenId());
    const userKey = app.globalData.userKey || app.ensureUserKey();

    try {
      const ok = await interactionService.addInteraction({
        card_id: this.data.card._id,
        type,
        openid,
        user_key: userKey
      });
      if (!ok) {
        wx.showToast({ title: "你已经留下过心意了", icon: "none" });
        return;
      }
      wx.showToast({ title: "已记录", icon: "none" });
      this.loadCard();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  inputMessage(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`comment.${key}`]: event.detail.value });
  },

  async submitMessage() {
    if (!this.data.card || this.data.submittingMessage) return;
    if (!this.data.comment.content.trim()) {
      wx.showToast({ title: "请写下想留下的话", icon: "none" });
      return;
    }

    this.setData({ submittingMessage: true });
    try {
      const app = getApp();
      const openid = this.data.openid || (await app.getOpenId());
      await messageService.createMessage({
        card_id: this.data.card._id,
        openid,
        visitor_name: this.data.comment.visitor_name,
        content: this.data.comment.content
      });
      this.setData({ comment: { visitor_name: "", content: "" } });
      wx.showToast({ title: "留言已提交，审核后显示", icon: "none" });
    } catch (error) {
      wx.showToast({ title: "留言失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ submittingMessage: false });
    }
  },

  onShareAppMessage() {
    const card = this.data.card;
    return {
      title: card ? `我为${card.pet_name}保存了一页记忆` : "PawsMeadow 毛孩子记忆册",
      path: card ? `/pages/card/index?id=${card._id}` : "/pages/index/index"
    };
  }
});
