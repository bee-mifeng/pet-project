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
    return result && result.result
      ? result.result
      : { added: false, removed: false };
  } catch (error) {
    console.error("记录互动失败", error);
    throw error;
  }
}

async function recordCardView(input) {
  try {
    const result = await wx.cloud.callFunction({
      name: "memorialApi",
      data: {
        action: "recordCardView",
        data: {
          card_id: input.card_id,
          user_key: input.user_key || ""
        }
      }
    });
    return !!(result && result.result && result.result.viewed);
  } catch (error) {
    console.warn("记录浏览失败，改用旧爪印记录方式", error);
    return await addInteraction({
      ...input,
      type: "paw_light"
    });
  }
}

async function addPawMemoryInteraction(input) {
  const type = ["like", "paw", "favorite"].includes(input.type) ? input.type : "paw";

  try {
    const result = await wx.cloud.callFunction({
      name: "memorialApi",
      data: {
        action: "addPawMemoryInteraction",
        data: {
          target_type: "paw_memory",
          target_id: input.target_id || input.paw_memory_id,
          type,
          owner_openid: input.owner_openid || input.openid || "",
          owner_key: input.owner_key || input.user_key || ""
        }
      }
    });
    return result && result.result
      ? result.result
      : { added: false, removed: false };
  } catch (error) {
    console.error("记录小爪记忆互动失败", error);
    throw error;
  }
}

module.exports = {
  addInteraction,
  recordCardView,
  addPawMemoryInteraction
};
