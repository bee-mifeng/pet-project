const memorialService = require("../../services/memorial");
const { formatYears, petTypeLabel, statusLabel, brief } = require("../../utils/format");

Page({
  data: {
    openid: "",
    loading: false,
    memorials: []
  },

  onShow() {
    this.getOpenId();
    this.loadMine();
  },

  async getOpenId() {
    try {
      const result = await wx.cloud.callFunction({ name: "login" });
      this.setData({
        openid: result.result.openid || ""
      });
    } catch (error) {
      this.setData({ openid: "获取失败，请检查 login 云函数" });
    }
  },

  async loadMine() {
    const app = getApp();
    const ownerKey = app.globalData.userKey || app.ensureUserKey();
    this.setData({ loading: true });

    try {
      const list = await memorialService.listMine(ownerKey);
      this.setData({
        memorials: list.map((item) => ({
          ...item,
          pet_type_label: petTypeLabel(item.pet_type),
          status_label: statusLabel(item.review_status),
          years: formatYears(item),
          brief_story: brief(item.story, 46),
          messages_count: 0
        }))
      });
    } catch (error) {
      wx.showToast({ title: "加载失败，请检查云开发配置", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  openMemorial(event) {
    wx.navigateTo({
      url: `/pages/memorial/index?id=${event.detail.id}`
    });
  },

  confirmDelete(event) {
    const id = event.currentTarget.dataset.id;
    wx.showModal({
      title: "删除纪念档案",
      content: "删除后将无法在小程序内继续查看这页记忆，请确认是否删除。",
      confirmColor: "#9E6F66",
      success: async (result) => {
        if (!result.confirm) return;
        try {
          await memorialService.deleteMemorial(id);
          wx.showToast({ title: "已删除", icon: "success" });
          this.loadMine();
        } catch (error) {
          wx.showToast({ title: "删除失败", icon: "none" });
        }
      }
    });
  },

  goCreate() {
    wx.switchTab({ url: "/pages/create/index" });
  },

  showPolicy(event) {
    const title = event.currentTarget.dataset.title;
    wx.showModal({
      title,
      content: "第一版为规则入口占位。上线前需要补充正式文本、删除内容说明和举报处理流程。",
      showCancel: false
    });
  }
});
