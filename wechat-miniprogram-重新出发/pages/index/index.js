const cardGate = require("../../utils/card-gate");
const { petTypeLabel } = require("../../utils/format");

Page({
  data: {
    sample: {
      pet_name: "豆包",
      pet_type: "dog",
      pet_type_label: petTypeLabel("dog"),
      pet_status_label: "陪伴中",
      timeline: "2021.05.12 来到身边",
      story: "喜欢把下巴放在窗边，看下午的光落在地板上。",
      photo_url: "../../assets/pets/doubao-photo.jpg",
      like_count: 12,
      paw_lights_count: 36
    },
    hasPrimaryCard: false,
    features: [
      {
        title: "保存日常照片",
        desc: "把它的样子、习惯和小小瞬间放进一张记忆卡。"
      },
      {
        title: "写下陪伴故事",
        desc: "记录来到你身边的日子，也记录那些只有你们懂的日常。"
      },
      {
        title: "温柔分享",
        desc: "默认私密保存，需要公开时再申请进入记忆花园。"
      }
    ]
  },

  onShow() {
    this.refreshPrimaryCard();
  },

  async refreshPrimaryCard() {
    const card = await cardGate.getMyPrimaryCard();
    this.setData({ hasPrimaryCard: !!(card && card._id) });
  },

  goPrimaryAction() {
    if (this.data.hasPrimaryCard) {
      wx.switchTab({ url: "/pages/mine/index" });
      return;
    }

    cardGate.goCreateCardPage();
  },

  openRules(event) {
    const page = event.currentTarget.dataset.page;
    wx.navigateTo({ url: `/pages/${page}/index` });
  }
});
