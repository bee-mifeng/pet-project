const memorialService = require("../../services/memorial");
const messageService = require("../../services/message");
const { formatYears, petTypeLabel, brief } = require("../../utils/format");

Page({
  data: {
    filters: [
      { label: "全部", value: "all" },
      { label: "猫咪", value: "cat" },
      { label: "狗狗", value: "dog" },
      { label: "其他", value: "other" }
    ],
    activeType: "all",
    loading: false,
    memorials: []
  },

  onShow() {
    this.loadGarden();
  },

  async loadGarden() {
    this.setData({ loading: true });
    try {
      const list = await memorialService.listPublicMemorials(this.data.activeType);
      const normalized = await Promise.all(
        list.map(async (item) => {
          const messages = await messageService.listApprovedMessages(item._id);
          return {
            ...item,
            pet_type_label: petTypeLabel(item.pet_type),
            years: formatYears(item),
            brief_story: brief(item.story, 52),
            messages_count: messages.length
          };
        })
      );
      this.setData({ memorials: normalized });
    } catch (error) {
      wx.showToast({ title: "加载失败，请检查云开发配置", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  changeFilter(event) {
    this.setData({ activeType: event.currentTarget.dataset.type });
    this.loadGarden();
  },

  openMemorial(event) {
    wx.navigateTo({
      url: `/pages/memorial/index?id=${event.detail.id}`
    });
  },

  goCreate() {
    wx.switchTab({ url: "/pages/create/index" });
  },

  onShareAppMessage() {
    return {
      title: "公共记忆花园",
      path: "/pages/garden/index"
    };
  }
});
