import type { Memorial, MemorialComment, PricingPlan } from "@/types";

export const memorials: Memorial[] = [
  {
    id: "doubao",
    name: "豆包",
    type: "dog",
    avatar: "/images/pets/doubao-photo.png",
    years: "2014.03 - 2025.11",
    birthOrAdoptedDate: "2014-03-18",
    departedDate: "2025-11-02",
    story:
      "豆包喜欢在门口等人回家，也喜欢把最柔软的玩具叼到阳光里。它陪家人走过很多普通又珍贵的日子，像一盏安静的小灯。",
    message:
      "谢谢你把每一次回家都变得有回应。愿你在那片柔软草地上继续晒太阳，我们会一直记得你。",
    flowersCount: 128,
    pawLightsCount: 211,
    commentsCount: 8,
    isPublic: true,
    status: "approved",
    gallery: [
      "/images/gallery/meadow-01.svg",
      "/images/gallery/meadow-02.svg",
      "/images/gallery/meadow-03.svg",
      "/images/gallery/meadow-04.svg",
      "/images/gallery/meadow-05.svg",
      "/images/gallery/meadow-06.svg"
    ]
  },
  {
    id: "xiaoju",
    name: "小橘",
    type: "cat",
    avatar: "/images/pets/xiaoju-photo.png",
    years: "2018.09 - 2026.01",
    birthOrAdoptedDate: "2018-09-06",
    departedDate: "2026-01-16",
    story:
      "小橘总是把窗台当作自己的小剧场，认真观察楼下的树影和行人。它不常撒娇，却总在家人难过时靠近一点点。",
    message:
      "你留给我们的安静、骄傲和信任，会被好好收在这里。晚风经过窗边时，我们会想到你。",
    flowersCount: 96,
    pawLightsCount: 173,
    commentsCount: 12,
    isPublic: true,
    status: "approved",
    gallery: [
      "/images/gallery/meadow-02.svg",
      "/images/gallery/meadow-04.svg",
      "/images/gallery/meadow-06.svg",
      "/images/gallery/meadow-01.svg",
      "/images/gallery/meadow-05.svg"
    ]
  },
  {
    id: "lucky",
    name: "Lucky",
    type: "dog",
    avatar: "/images/pets/lucky.svg",
    years: "2016.05 - 2025.08",
    birthOrAdoptedDate: "2016-05-21",
    departedDate: "2025-08-29",
    story:
      "Lucky 爱奔跑，也爱把下巴轻轻放在人的膝盖上。它教会家人把日子过慢一点，也把每条散步路都变成了共同的地图。",
    message:
      "你一直很勇敢，也一直很温柔。谢谢你来过我们的生活，愿你被更多善意看见。",
    flowersCount: 74,
    pawLightsCount: 132,
    commentsCount: 5,
    isPublic: true,
    status: "pending",
    gallery: [
      "/images/gallery/meadow-03.svg",
      "/images/gallery/meadow-01.svg",
      "/images/gallery/meadow-05.svg"
    ]
  },
  {
    id: "xueqiu",
    name: "雪球",
    type: "other",
    avatar: "/images/pets/xueqiu.svg",
    years: "2020.02 - 2025.12",
    birthOrAdoptedDate: "2020-02-10",
    departedDate: "2025-12-20",
    story:
      "雪球是一只安静的小兔子，喜欢贴着草编垫休息，也喜欢在清晨轻轻靠近家人的脚边。它把家里的节奏变得柔软。",
    message:
      "小小的你带来过很大的陪伴。愿这页记忆像一片干净的草地，替我们继续温柔地记住你。",
    flowersCount: 52,
    pawLightsCount: 89,
    commentsCount: 4,
    isPublic: false,
    status: "rejected",
    gallery: [
      "/images/gallery/meadow-06.svg",
      "/images/gallery/meadow-02.svg",
      "/images/gallery/meadow-04.svg",
      "/images/gallery/meadow-05.svg"
    ]
  }
];

export const comments: MemorialComment[] = [
  {
    id: "comment-1",
    memorialId: "doubao",
    author: "路过的朋友",
    content: "愿豆包在另一片草地上也被阳光照顾。",
    createdAt: "2026-02-18",
    status: "approved"
  },
  {
    id: "comment-2",
    memorialId: "doubao",
    author: "小林",
    content: "谢谢你把陪伴讲得这么温柔，献上一朵花。",
    createdAt: "2026-02-24",
    status: "approved"
  },
  {
    id: "comment-3",
    memorialId: "xiaoju",
    author: "晚风",
    content: "小橘一定会喜欢有风经过的窗台。",
    createdAt: "2026-03-03",
    status: "approved"
  },
  {
    id: "comment-4",
    memorialId: "lucky",
    author: "审核中的留言",
    content: "Lucky 的故事很明亮，祝福它。",
    createdAt: "2026-03-09",
    status: "pending"
  }
];

export const pricingPlans: PricingPlan[] = [
  {
    name: "免费私人纪念页",
    price: "0 元",
    description: "适合先为毛孩子留下一页安静的私人记忆。",
    features: ["创建 1 个私人纪念页", "上传 3 张照片", "私密链接", "基础模板"]
  },
  {
    name: "安放进公共记忆花园",
    price: "19.9 元",
    description: "通过审核后，让更多人温柔看见与祝福。",
    features: [
      "进入公共记忆花园展示",
      "支持被他人献花",
      "支持点亮小爪印",
      "支持留言祝福",
      "生成分享二维码"
    ],
    highlighted: true
  },
  {
    name: "高级纪念页",
    price: "39.9 元",
    description: "为照片与故事保留更完整的表达空间。",
    features: [
      "更多照片",
      "高级页面模板",
      "纪念卡样式",
      "分享二维码",
      "重要日期提醒"
    ]
  },
  {
    name: "人工定制纪念页",
    price: "199 元起",
    description: "由人工整理故事和页面排版，适合重要纪念。",
    features: [
      "人工整理宠物故事",
      "定制纪念文案",
      "专属页面排版",
      "可搭配实体二维码纪念卡或纪念礼盒"
    ]
  }
];
