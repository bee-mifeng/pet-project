const { generateSlug } = require("../utils/slug");
const db = wx.cloud.database();
const _ = db.command;
const memorials = db.collection("memorials");
const interactions = db.collection("interactions");

function now() {
  return new Date();
}

async function createMemorial(input) {
  const createdAt = now();
  const data = {
    slug: generateSlug(),
    owner_key: input.owner_key,
    owner_openid: "",
    pet_name: input.pet_name,
    pet_type: input.pet_type,
    birth_or_adopted_date: input.birth_or_adopted_date || "",
    passed_date: input.passed_date || "",
    story: input.story || "",
    message: input.message || "",
    photo_url: input.photo_url,
    is_public: false,
    allow_messages: input.allow_messages !== false,
    review_status: input.apply_public ? "pending" : "private",
    flowers_count: 0,
    paw_lights_count: 0,
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await memorials.add({ data });
  return {
    _id: result._id,
    ...data
  };
}

async function getMemorial(options) {
  if (options.id) {
    const result = await memorials.doc(options.id).get();
    return result.data;
  }

  const result = await memorials.where({ slug: options.slug }).limit(1).get();
  return result.data[0] || null;
}

async function listPublicMemorials(type) {
  const where = {
    review_status: "approved",
    is_public: true
  };

  if (type && type !== "all") {
    where.pet_type = type;
  }

  const result = await memorials.where(where).orderBy("created_at", "desc").get();
  return result.data;
}

async function listMine(ownerKey) {
  const result = await memorials.where({ owner_key: ownerKey }).orderBy("created_at", "desc").get();
  return result.data;
}

async function listPendingMemorials() {
  const result = await memorials.where({ review_status: "pending" }).orderBy("created_at", "desc").get();
  return result.data;
}

async function applyPublic(id) {
  await memorials.doc(id).update({
    data: {
      review_status: "pending",
      is_public: false,
      updated_at: now()
    }
  });
}

async function reviewMemorial(id, approved) {
  await memorials.doc(id).update({
    data: {
      review_status: approved ? "approved" : "rejected",
      is_public: approved,
      updated_at: now()
    }
  });
}

async function deleteMemorial(id) {
  await memorials.doc(id).remove();
}

async function addInteraction(memorialId, type, visitorKey) {
  const existed = await interactions
    .where({
      memorial_id: memorialId,
      type,
      visitor_key: visitorKey
    })
    .limit(1)
    .get();

  if (existed.data.length > 0) {
    return false;
  }

  await interactions.add({
    data: {
      memorial_id: memorialId,
      visitor_key: visitorKey,
      visitor_openid: "",
      type,
      created_at: now()
    }
  });

  await memorials.doc(memorialId).update({
    data: {
      [type === "flower" ? "flowers_count" : "paw_lights_count"]: _.inc(1),
      updated_at: now()
    }
  });

  return true;
}

module.exports = {
  createMemorial,
  getMemorial,
  listPublicMemorials,
  listMine,
  listPendingMemorials,
  applyPublic,
  reviewMemorial,
  deleteMemorial,
  addInteraction
};
