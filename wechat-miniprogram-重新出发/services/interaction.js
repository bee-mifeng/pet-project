const countFieldMap = {
  like: "like_count",
  flower: "flower_count",
  paw_light: "paw_lights_count"
};

async function addInteraction(input) {
  const type = countFieldMap[input.type] ? input.type : "paw_light";

  try {
    const result = await wx.cloud.callFunction({
      name: "memorialApi",
      data: {
        action: "addInteraction",
        data: {
          card_id: input.card_id,
          type,
          openid: input.openid || "",
          user_key: input.user_key || ""
        }
      }
    });
    return !!(result && result.result && result.result.added);
  } catch (error) {
    console.error("记录互动失败", error);
    throw error;
  }
}

module.exports = {
  addInteraction
};
