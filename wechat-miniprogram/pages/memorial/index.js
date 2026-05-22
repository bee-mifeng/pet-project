const memorialService = require("../../services/memorial");
const messageService = require("../../services/message");
const { formatYears, petTypeLabel, statusLabel } = require("../../utils/format");

Page({
  data: {
    id: "",
    slug: "",
    loading: true,
    memorial: null,
    messages: [],
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
    this.loadMemorial();
  },

  async loadMemorial() {
    this.setData({ loading: true });
    try {
      const memorial = await memorialService.getMemorial({
        id: this.data.id,
        slug: this.data.slug
      });

      if (!memorial) {
        this.setData({ memorial: null, messages: [], loading: false });
        return;
      }

      const messages = await messageService.listApprovedMessages(memorial._id);
      this.setData({
        memorial: {
          ...memorial,
          pet_type_label: petTypeLabel(memorial.pet_type),
          status_label: statusLabel(memorial.review_status),
          years: formatYears(memorial)
        },
        messages,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "加载失败，请检查云开发配置", icon: "none" });
    }
  },

  async applyPublic() {
    if (!this.data.memorial) return;
    wx.showLoading({ title: "正在提交" });
    try {
      await memorialService.applyPublic(this.data.memorial._id);
      wx.hideLoading();
      wx.showToast({ title: "申请已提交", icon: "success" });
      this.loadMemorial();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "提交失败", icon: "none" });
    }
  },

  async interact(event) {
    if (!this.data.memorial) return;
    const type = event.currentTarget.dataset.type;
    const app = getApp();
    const visitorKey = app.globalData.userKey || app.ensureUserKey();

    try {
      const ok = await memorialService.addInteraction(this.data.memorial._id, type, visitorKey);
      if (!ok) {
        wx.showToast({ title: "你已经为它留下过祝福了", icon: "none" });
        return;
      }
      wx.showToast({ title: type === "flower" ? "已献花" : "已点亮", icon: "success" });
      this.loadMemorial();
    } catch (error) {
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  inputMessage(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`comment.${key}`]: event.detail.value
    });
  },

  async submitMessage() {
    if (!this.data.memorial || this.data.submittingMessage) return;
    if (!this.data.comment.content.trim()) {
      wx.showToast({ title: "请写下想留下的祝福", icon: "none" });
      return;
    }

    const app = getApp();
    const visitorKey = app.globalData.userKey || app.ensureUserKey();
    this.setData({ submittingMessage: true });

    try {
      await messageService.createMessage({
        memorial_id: this.data.memorial._id,
        visitor_key: visitorKey,
        visitor_name: this.data.comment.visitor_name.trim(),
        content: this.data.comment.content.trim()
      });
      this.setData({
        comment: { visitor_name: "", content: "" }
      });
      wx.showToast({ title: "留言已提交，审核后显示", icon: "none" });
    } catch (error) {
      wx.showToast({ title: "留言失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ submittingMessage: false });
    }
  },

  showQrPlaceholder() {
    wx.showModal({
      title: "二维码纪念卡",
      content: "第一版先保留入口，后续会生成适合保存与分享的纪念卡。",
      showCancel: false
    });
  },

  onShareAppMessage() {
    const memorial = this.data.memorial;
    return {
      title: memorial ? `我为${memorial.pet_name}留下了一页纪念` : "PawsMeadow 毛孩子记忆花园",
      path: memorial ? `/pages/memorial/index?id=${memorial._id}` : "/pages/index/index"
    };
  }
});
