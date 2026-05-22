const { formatYears, petTypeLabel, brief } = require("../../utils/format");

Page({
  data: {
    sample: {
      _id: "sample-doubao",
      pet_name: "豆包",
      pet_type: "dog",
      pet_type_label: "狗狗",
      years: "2014.03 - 2025.11",
      birth_or_adopted_date: "2014-03-18",
      passed_date: "2025-11-02",
      photo_url: "../../assets/pets/doubao-photo.jpg",
      story: "豆包喜欢在门口等人回家，也喜欢把最柔软的玩具叼到阳光里。",
      brief_story: "豆包喜欢在门口等人回家，也喜欢把最柔软的玩具叼到阳光里。",
      flowers_count: 128,
      paw_lights_count: 211,
      messages_count: 8
    },
    featureCards: [
      {
        title: "私人纪念页",
        desc: "保存照片、日期、故事和想说的话，默认只通过私密链接查看。"
      },
      {
        title: "公共记忆花园",
        desc: "申请公开后进入人工审核，通过后才会出现在花园里。"
      },
      {
        title: "二维码纪念卡",
        desc: "第一版先保留入口，后续可生成适合保存与分享的纪念卡。"
      }
    ],
    steps: [
      "填写毛孩子的名字、日期和故事",
      "上传一张最想保存的照片",
      "生成私人纪念页并分享给亲友",
      "可选择申请进入公共记忆花园"
    ],
    faqs: [
      {
        q: "创建纪念页需要付费吗？",
        a: "第一版免费创建，一个用户默认保留一个宠物纪念档案。"
      },
      {
        q: "私人纪念页会被别人看到吗？",
        a: "不会进入公共花园，只有获得分享链接的人可以打开。"
      },
      {
        q: "留言会直接公开吗？",
        a: "不会。留言提交后默认待审核，通过后才会展示。"
      }
    ]
  },

  onLoad() {
    const sample = this.data.sample;
    this.setData({
      sample: {
        ...sample,
        pet_type_label: petTypeLabel(sample.pet_type),
        years: formatYears(sample),
        brief_story: brief(sample.story, 42)
      }
    });
  },

  goCreate() {
    wx.switchTab({ url: "/pages/create/index" });
  },

  goGarden() {
    wx.switchTab({ url: "/pages/garden/index" });
  },

  onShareAppMessage() {
    return {
      title: "PawsMeadow 毛孩子记忆花园",
      path: "/pages/index/index"
    };
  }
});
