const {
  normalizePetType,
  normalizePetTypeFilter,
  normalizePetStatus
} = require("../utils/format");

const db = wx.cloud.database();
const cards = db.collection("memorials");

function now() {
  return new Date();
}

async function createCard(input) {
  try {
    return await callMemorialApi("createCard", input);
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

async function getMyPrimaryCard(options) {
  const input = options || {};
  const ownerKey = String(input.owner_key || input.user_key || "").trim();
  const openid = String(input.openid || "").trim();

  try {
    const card = await callMemorialApi("getMyPrimaryCard", {
      owner_key: ownerKey
    });
    if (card) return card;
  } catch (error) {
    console.warn("云函数读取我的主记忆卡失败，改用本地数据库读取", error);
  }

  try {
    if (openid) {
      const result = await cards.where({ owner_openid: openid }).orderBy("created_at", "desc").limit(1).get();
      if (result.data && result.data[0]) return result.data[0];
    }

    if (ownerKey) {
      const result = await cards.where({ owner_key: ownerKey }).orderBy("created_at", "desc").limit(1).get();
      if (result.data && result.data[0]) return result.data[0];
    }

    return null;
  } catch (fallbackError) {
    console.error("读取我的主记忆卡失败", fallbackError);
    return null;
  }
}

async function listPublicCards(filter) {
  const filterObject = filter && typeof filter === "object"
    ? filter
    : { petType: filter };

  try {
    return await callMemorialApi("listPublicCards", {
      filter: filterObject,
      user_key: filterObject.userKey || ""
    }) || [];
  } catch (error) {
    console.warn("云函数读取记忆花园失败，改用本地数据库读取", error);
    try {
      const where = { visibility: "public" };
      const petType = normalizePetTypeFilter(filterObject.petType);
      if (filterObject.petStatus === "living" || filterObject.petStatus === "star") {
        where.pet_status = filterObject.petStatus;
      }
      const result = await cards.where(where).orderBy("created_at", "desc").get();
      const list = result.data || [];
      return petType
        ? list.filter((card) => normalizePetType(card.pet_type) === petType)
        : list;
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
    await callMemorialApi("applyPublic", { id });
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
  getMyPrimaryCard,
  listPublicCards,
  listMine,
  listPendingCards,
  applyPublic,
  makePrivate,
  updatePetStatus,
  reviewCard
};
