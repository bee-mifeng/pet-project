const memorialService = require("../../services/memorial");
const messageService = require("../../services/message");
const { formatYears, petTypeLabel, statusLabel, brief } = require("../../utils/format");

const DEV_FORCE_ADMIN = true;
const ADMIN_OPENIDS = ["o-GIl3auJGArAyOt-pbA5x_pu4Kg"];

Page({
  data: {
    openid: "",
    isAdmin: false,
    authChecked: false,
    activeTab: "memorials",
    pendingMemorials: [],
    pendingMessages: [],
    loading: false
  },

  onShow() {
    this.checkAdminAndLoad();
  },

  async checkAdminAndLoad() {
    this.setData({ authChecked: false, isAdmin: false, loading: false });
    try {
      const result = await wx.cloud.callFunction({ name: "login" });
      const openid = result.result.openid || "";
      const currentOpenId = String(openid || "").trim();
      const isOpenIdAdmin = ADMIN_OPENIDS.map((id) => String(id).trim()).includes(currentOpenId);
      const isAdmin = DEV_FORCE_ADMIN ? true : isOpenIdAdmin;

      console.log("当前 openid:", currentOpenId);
      console.log("管理员列表:", ADMIN_OPENIDS);
      console.log("是否管理员:", isAdmin);

      this.setData({
        openid: currentOpenId,
        isAdmin,
        authChecked: true
      });

      if (isAdmin) {
        if (DEV_FORCE_ADMIN) {
          wx.showModal({
            title: "开发期提示",
            content: "当前为开发期强制管理员模式，正式上线前必须关闭",
            showCancel: false
          });
        }
        this.loadAll();
      }
    } catch (error) {
      this.setData({
        openid: "",
        isAdmin: false,
        authChecked: true
      });
      wx.showToast({ title: "管理员身份校验失败", icon: "none" });
    }
  },

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab });
  },

  async loadAll() {
    if (!this.data.isAdmin) return;

    this.setData({ loading: true });
    try {
      const [memorials, messages] = await Promise.all([
        memorialService.listPendingMemorials(),
        messageService.listPendingMessages()
      ]);
      this.setData({
        pendingMemorials: memorials.map((item) => ({
          ...item,
          pet_type_label: petTypeLabel(item.pet_type),
          status_label: statusLabel(item.review_status),
          years: formatYears(item),
          brief_story: brief(item.story, 50),
          messages_count: 0
        })),
        pendingMessages: messages
      });
    } catch (error) {
      wx.showToast({ title: "加载失败，请检查云开发配置", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  async reviewMemorial(event) {
    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";
    await memorialService.reviewMemorial(id, approved);
    wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "success" });
    this.loadAll();
  },

  async reviewMessage(event) {
    const id = event.currentTarget.dataset.id;
    const approved = event.currentTarget.dataset.approved === "true";
    await messageService.reviewMessage(id, approved);
    wx.showToast({ title: approved ? "已通过" : "已拒绝", icon: "success" });
    this.loadAll();
  }
});
