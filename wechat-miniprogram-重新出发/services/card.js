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

async function getCard(options) {
  try {
    if (options.id) {
      const result = await cards.doc(options.id).get();
      return result.data || null;
    }

    const result = await cards.where({ slug: options.slug }).limit(1).get();
    return result.data[0] || null;
  } catch (error) {
    console.error("读取记忆卡失败", error);
    throw error;
  }
}

async function listPublicCards(filter) {
  const where = { visibility: "public" };
  const filterObject = filter && typeof filter === "object" ? filter : null;
  const petType = filterObject ? filterObject.petType : filter;
  const petStatus = filterObject ? filterObject.petStatus : filter;
  if (petType === "cat" || petType === "dog" || petType === "other") where.pet_type = petType;
  if (petStatus === "living" || petStatus === "star") where.pet_status = petStatus;

  try {
    const result = await cards.where(where).orderBy("created_at", "desc").get();
    return result.data || [];
  } catch (error) {
    console.error("读取记忆花园失败", error);
    throw error;
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
    const result = await cards.where({ visibility: "pending" }).orderBy("created_at", "desc").get();
    return result.data || [];
  } catch (error) {
    console.error("读取待审核记忆卡失败", error);
    throw error;
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
    await cards.doc(id).update({
      data: {
        visibility: approved ? "public" : "rejected",
        updated_at: now()
      }
    });
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
