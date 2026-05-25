const db = wx.cloud.database();
const _ = db.command;
const interactions = db.collection("interactions");
const cards = db.collection("memorials");

const countFieldMap = {
  like: "like_count",
  flower: "flower_count",
  paw_light: "paw_lights_count"
};

function now() {
  return new Date();
}

async function addInteraction(input) {
  const type = countFieldMap[input.type] ? input.type : "paw_light";
  const marker = input.openid || input.user_key;

  try {
    if (marker) {
      const existed = await interactions
        .where({
          card_id: input.card_id,
          type,
          openid: input.openid || "",
          user_key: input.user_key || ""
        })
        .limit(1)
        .get();

      if (existed.data.length > 0) return false;
    }

    await interactions.add({
      data: {
        card_id: input.card_id,
        type,
        openid: input.openid || "",
        user_key: input.user_key || "",
        created_at: now()
      }
    });

    await cards.doc(input.card_id).update({
      data: {
        [countFieldMap[type]]: _.inc(1),
        updated_at: now()
      }
    });

    return true;
  } catch (error) {
    console.error("记录互动失败", error);
    throw error;
  }
}

module.exports = {
  addInteraction
};
