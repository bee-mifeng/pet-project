const cardService = require("../services/card");

const CREATE_CARD_URL = "/pages/create/index";

function goCreateCardPage() {
  wx.navigateTo({
    url: CREATE_CARD_URL,
    fail: () => {
      wx.reLaunch({ url: CREATE_CARD_URL });
    }
  });
}

function promptCreateCard(options) {
  const input = options || {};

  wx.showModal({
    title: input.title || "先创建自己的记忆卡",
    content: input.content || "有了自己的记忆卡后，留言和点赞会带上它的头像与名字，也能让对方点进去看看。",
    confirmText: input.confirmText || "去创建",
    cancelText: input.cancelText || "先看看",
    confirmColor: "#5B5F97",
    success: (res) => {
      if (res.confirm) {
        goCreateCardPage();
      }
    }
  });
}

async function getMyPrimaryCard() {
  const app = getApp();
  const openid = await app.getOpenId();
  const ownerKey = app.globalData.userKey || app.ensureUserKey();

  try {
    return await cardService.getMyPrimaryCard({
      openid,
      owner_key: ownerKey
    });
  } catch (error) {
    console.warn("读取我的主记忆卡失败", error);
    return null;
  }
}

async function ensureHasCard(options) {
  const card = await getMyPrimaryCard();
  if (card && card._id) return card;

  promptCreateCard(options);
  return null;
}

module.exports = {
  goCreateCardPage,
  promptCreateCard,
  getMyPrimaryCard,
  ensureHasCard
};
