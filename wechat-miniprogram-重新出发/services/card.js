const { generateSlug } = require("../utils/slug");
const { normalizePetType, normalizePetStatus, normalizeVisibility } = require("../utils/format");

const db = wx.cloud.database();
const cards = db.collection("memorials");

function now() {
  return new Date();
}

async function createCard(input) {
  const createdAt = now();
  const visibility = normalizeVisibility(input.visibility);
  const petStatus = normalizePetStatus(input.pet_status);
  const data = {
    slug: generateSlug(),
    pet_name: String(input.pet_name || "").trim(),
    pet_type: normalizePetType(input.pet_type),
    pet_status: petStatus,
    birth_or_adopted_date: input.birth_or_adopted_date || "",
    star_date: petStatus === "star" ? input.star_date || "" : "",
    photo_url: input.photo_url || "",
    video_url: input.video_url || "",
    video_duration: input.video_duration || 0,
    video_size: input.video_size || 0,
    story: input.story || "",
    message: input.message || "",
    visibility,
    allow_messages: input.allow_messages !== false,
    owner_openid: input.owner_openid || "",
    owner_key: input.owner_key || "",
    like_count: 0,
    flower_count: 0,
    paw_lights_count: 0,
    created_at: createdAt,
    updated_at: createdAt
  };

  try {
    const result = await cards.add({ data });
    return {
      _id: result._id,
      ...data
    };
  } catch (error) {
    console.error("创建记忆卡失败", error);
    throw error;
  }
}

async function callMemorialApi(action, data) {
  const result = await wx.cloud.callFunction({
    name: "memorialApi",
    data: {
      action,
      data: data || {}
    }
  });
  return result && result.result ? result.result.data : null;
}

async function getCard(options) {
  try {
    return await callMemorialApi("getCard", options);
  } catch (error) {
    console.warn("云函数读取记忆卡失败，改用本地数据库读取", error);
    try {
      if (options.id) {
        const result = await cards.doc(options.id).get();
        return result.data ? { ...result.data, _id: result.data._id || options.id } : null;
      }

      const result = await cards.where({ slug: options.slug }).limit(1).get();
      return result.data[0] || null;
    } catch (fallbackError) {
      console.error("读取记忆卡失败", fallbackError);
      throw fallbackError;
    }
  }
}

async function listPublicCards(filter) {
  const filterObject = filter && typeof filter === "object"
    ? filter
    : { petType: filter };

  try {
    return await callMemorialApi("listPublicCards", { filter: filterObject }) || [];
  } catch (error) {
    console.warn("云函数读取记忆花园失败，改用本地数据库读取", error);
    try {
      const where = { visibility: "public" };
      if (filterObject.petType === "cat" || filterObject.petType === "dog" || filterObject.petType === "other") {
        where.pet_type = filterObject.petType;
      }
      if (filterObject.petStatus === "living" || filterObject.petStatus === "star") {
        where.pet_status = filterObject.petStatus;
      }
      const result = await cards.where(where).orderBy("created_at", "desc").get();
      return result.data || [];
    } catch (fallbackError) {
      console.error("读取记忆花园失败", fallbackError);
      throw fallbackError;
    }
  }
}

async function listMine(openid) {
  try {
    if (!openid) return [];
    const result = await cards.where({ owner_openid: openid }).orderBy("created_at", "desc").get();
    return result.data || [];
  } catch (error) {
    console.error("读取我的记忆卡失败", error);
    throw error;
  }
}

async function listPendingCards() {
  try {
    return await callMemorialApi("listPendingCards") || [];
  } catch (error) {
    console.warn("云函数读取待审核记忆卡失败，改用本地数据库读取", error);
    try {
      const result = await cards.where({ visibility: "pending" }).orderBy("created_at", "desc").get();
      return result.data || [];
    } catch (fallbackError) {
      console.error("读取待审核记忆卡失败", fallbackError);
      throw fallbackError;
    }
  }
}

async function applyPublic(id) {
  try {
    await cards.doc(id).update({
      data: {
        visibility: "pending",
        updated_at: now()
      }
    });
  } catch (error) {
    console.error("申请公开失败", error);
    throw error;
  }
}

async function makePrivate(id) {
  try {
    await cards.doc(id).update({
      data: {
        visibility: "private",
        updated_at: now()
      }
    });
  } catch (error) {
    console.error("取消公开失败", error);
    throw error;
  }
}

async function updatePetStatus(id, status, starDate) {
  const petStatus = normalizePetStatus(status);
  try {
    await cards.doc(id).update({
      data: {
        pet_status: petStatus,
        star_date: petStatus === "star" ? starDate || "" : "",
        updated_at: now()
      }
    });
  } catch (error) {
    console.error("更新毛孩子状态失败", error);
    throw error;
  }
}

async function reviewCard(id, approved) {
  try {
    await callMemorialApi("reviewCard", { id, approved });
  } catch (error) {
    console.error("审核记忆卡失败", error);
    throw error;
  }
}

module.exports = {
  createCard,
  getCard,
  listPublicCards,
  listMine,
  listPendingCards,
  applyPublic,
  makePrivate,
  updatePetStatus,
  reviewCard
};
