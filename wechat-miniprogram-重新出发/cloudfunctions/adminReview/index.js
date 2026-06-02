const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;
const cards = db.collection("memorials");
const memoryItems = db.collection("memory_items");
const pawMemories = db.collection("paw_memories");
const pawMemoryComments = db.collection("paw_memory_comments");
const notifications = db.collection("notifications");

const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];

function normalizeOpenId(value) {
  return String(value || "").trim();
}

function isAdminOpenId(openid) {
  return ADMIN_OPENIDS.map(normalizeOpenId).includes(normalizeOpenId(openid));
}

function requireAdmin(openid) {
  if (!isAdminOpenId(openid)) {
    throw new Error("NO_PERMISSION");
  }
}

function now() {
  return new Date();
}

async function ensureCollection(name) {
  try {
    await db.createCollection(name);
  } catch (error) {
    const text = `${error && error.errCode || ""} ${error && error.errMsg || ""} ${error && error.message || ""}`;
    if (
      text.indexOf("DATABASE_COLLECTION_ALREADY_EXIST") >= 0 ||
      text.indexOf("collection already exists") >= 0 ||
      text.indexOf("already exists") >= 0
    ) {
      return;
    }
    throw error;
  }
}

function samePerson(left, right) {
  if (!left || !right) return false;

  const leftOpenId = normalizeOpenId(left.openid);
  const rightOpenId = normalizeOpenId(right.openid);
  if (leftOpenId && rightOpenId && leftOpenId === rightOpenId) return true;

  const leftOwnerKey = String(left.owner_key || "").trim();
  const rightOwnerKey = String(right.owner_key || "").trim();
  if (leftOwnerKey && rightOwnerKey && leftOwnerKey === rightOwnerKey) return true;

  const leftCardId = String(left.card_id || "").trim();
  const rightCardId = String(right.card_id || "").trim();
  return !!leftCardId && !!rightCardId && leftCardId === rightCardId;
}

async function createNotification(input) {
  const recipientOpenId = normalizeOpenId(input.recipient_openid);
  const recipientOwnerKey = String(input.recipient_owner_key || "").trim();
  const recipientCardId = String(input.recipient_card_id || "").trim();
  const actorOpenId = normalizeOpenId(input.actor_openid);
  const actorOwnerKey = String(input.actor_owner_key || "").trim();
  const actorCardId = String(input.actor_card_id || "").trim();

  if (!recipientOpenId && !recipientOwnerKey && !recipientCardId) return null;
  if (samePerson(
    { openid: recipientOpenId, owner_key: recipientOwnerKey, card_id: recipientCardId },
    { openid: actorOpenId, owner_key: actorOwnerKey, card_id: actorCardId }
  )) {
    return null;
  }

  await ensureCollection("notifications");

  const uniqueKey = String(input.unique_key || "").trim();
  if (uniqueKey) {
    const existed = await notifications.where({ unique_key: uniqueKey }).limit(1).get();
    if (existed.data && existed.data.length > 0) return existed.data[0];
  }

  const createdAt = now();
  const data = {
    unique_key: uniqueKey,
    recipient_openid: recipientOpenId,
    recipient_owner_key: recipientOwnerKey,
    recipient_card_id: recipientCardId,
    actor_openid: actorOpenId,
    actor_owner_key: actorOwnerKey,
    actor_card_id: actorCardId,
    actor_name: input.actor_name || "毛孩子",
    actor_avatar: input.actor_avatar || "",
    type: input.type || "paw_memory_comment",
    category: "comment",
    target_type: input.target_type || "paw_memory",
    target_id: input.target_id || "",
    paw_memory_id: input.paw_memory_id || "",
    comment_id: input.comment_id || "",
    content_preview: String(input.content_preview || "").slice(0, 80),
    target_title: input.target_title || "小爪记忆",
    target_preview: String(input.target_preview || "").slice(0, 80),
    target_image: input.target_image || "",
    read_at: null,
    created_at: createdAt,
    updated_at: createdAt
  };

  const result = await notifications.add({ data });
  return { _id: result._id, ...data };
}

async function getPawMemoryNotificationTarget(id, sourceType) {
  const collection = sourceType === "memory_item" ? memoryItems : pawMemories;
  const result = await collection.doc(id).get();
  const data = result && result.data ? { ...result.data, _id: result.data._id || id } : null;
  if (!data) return null;

  let card = null;
  const cardId = data.pet_id || data.memorial_id || "";
  if (cardId) {
    try {
      const cardResult = await cards.doc(cardId).get();
      card = cardResult && cardResult.data ? cardResult.data : null;
    } catch (error) {
      card = null;
    }
  }

  const mediaType = data.media_type || (data.item_type === "video" ? "video" : "image");
  return {
    ...data,
    source_type: sourceType === "memory_item" ? "memory_item" : "paw_memory",
    owner_openid: data.owner_openid || (card && card.owner_openid) || "",
    owner_key: data.owner_key || (card && card.owner_key) || "",
    pet_id: cardId,
    pet_name: data.pet_name || (card && card.pet_name) || "小爪记忆",
    pet_avatar: data.pet_avatar || (card && card.photo_url) || "",
    target_image: mediaType === "video"
      ? data.video_cover || data.cover_url || data.pet_avatar || (card && card.photo_url) || ""
      : data.media_url || data.media_file_id || data.pet_avatar || (card && card.photo_url) || ""
  };
}

async function notifyApprovedPawMemoryComment(comment) {
  if (!comment || !comment._id || !comment.paw_memory_id) return;

  const target = await getPawMemoryNotificationTarget(comment.paw_memory_id, comment.target_type);
  if (!target) return;

  const actor = {
    openid: comment.owner_openid || "",
    owner_key: comment.owner_key || "",
    card_id: comment.visitor_card_id || ""
  };
  const memoryOwner = {
    openid: target.owner_openid || "",
    owner_key: target.owner_key || "",
    card_id: target.pet_id || ""
  };
  const targetBase = {
    target_type: target.source_type,
    target_id: target._id,
    paw_memory_id: target._id,
    comment_id: comment._id,
    content_preview: comment.content || "",
    target_title: target.pet_name || "小爪记忆",
    target_preview: target.content || "",
    target_image: target.target_image || ""
  };
  const actorBase = {
    actor_openid: actor.openid,
    actor_owner_key: actor.owner_key,
    actor_card_id: actor.card_id,
    actor_name: comment.visitor_card_name || comment.visitor_name || "毛孩子",
    actor_avatar: comment.visitor_card_photo || ""
  };

  const replyToId = comment.reply_to_comment_id || comment.parent_comment_id || "";
  if (replyToId) {
    let replyTarget = null;
    try {
      const replyResult = await pawMemoryComments.doc(replyToId).get();
      replyTarget = replyResult && replyResult.data
        ? { ...replyResult.data, _id: replyResult.data._id || replyToId }
        : null;
    } catch (error) {
      replyTarget = null;
    }

    if (replyTarget) {
      const replyRecipient = {
        openid: replyTarget.owner_openid || "",
        owner_key: replyTarget.owner_key || "",
        card_id: replyTarget.visitor_card_id || ""
      };
      await createNotification({
        unique_key: `paw_memory_comment_reply:${comment._id}:${replyTarget._id}`,
        recipient_openid: replyRecipient.openid,
        recipient_owner_key: replyRecipient.owner_key,
        recipient_card_id: replyRecipient.card_id,
        type: "paw_memory_comment_reply",
        ...actorBase,
        ...targetBase
      });

      if (!samePerson(replyRecipient, memoryOwner)) {
        await createNotification({
          unique_key: `paw_memory_reply:${comment._id}:${target._id}`,
          recipient_openid: memoryOwner.openid,
          recipient_owner_key: memoryOwner.owner_key,
          recipient_card_id: memoryOwner.card_id,
          type: "paw_memory_reply",
          ...actorBase,
          ...targetBase
        });
      }
      return;
    }
  }

  await createNotification({
    unique_key: `paw_memory_comment:${comment._id}:${target._id}`,
    recipient_openid: memoryOwner.openid,
    recipient_owner_key: memoryOwner.owner_key,
    recipient_card_id: memoryOwner.card_id,
    type: "paw_memory_comment",
    ...actorBase,
    ...targetBase
  });
}

async function reviewMemoryItem(id, visibility) {
  if (!id) throw new Error("MISSING_MEMORY_ITEM_ID");

  await memoryItems.doc(id).update({
    data: {
      visibility,
      updated_at: now()
    }
  });

  return { ok: true };
}

async function reviewPawMemory(id, approved, sourceType) {
  if (!id) throw new Error("MISSING_PAW_MEMORY_ID");

  if (sourceType === "memory_item") {
    return await reviewMemoryItem(id, approved ? "public" : "rejected");
  }

  await pawMemories.doc(id).update({
    data: {
      review_status: approved ? "approved" : "rejected",
      visibility: approved ? "public" : "rejected",
      updated_at: now()
    }
  });

  return { ok: true };
}

async function reviewPawMemoryComment(id, approved) {
  if (!id) throw new Error("MISSING_PAW_MEMORY_COMMENT_ID");

  const result = await pawMemoryComments.doc(id).get();
  const comment = result.data
    ? { ...result.data, _id: result.data._id || id }
    : null;
  const wasApproved = comment && comment.review_status === "approved";

  await pawMemoryComments.doc(id).update({
    data: {
      review_status: approved ? "approved" : "rejected",
      updated_at: now()
    }
  });

  if (comment && comment.paw_memory_id && approved !== wasApproved) {
    const targetCollection = comment.target_type === "memory_item"
      ? memoryItems
      : pawMemories;
    let currentCount = 0;

    try {
      const targetResult = await targetCollection.doc(comment.paw_memory_id).get();
      currentCount = targetResult && targetResult.data
        ? targetResult.data.comments_count || 0
        : 0;
    } catch (error) {
      currentCount = 0;
    }

    await targetCollection.doc(comment.paw_memory_id).update({
      data: {
        comments_count: approved
          ? _.inc(1)
          : Math.max(0, currentCount - 1),
        updated_at: now()
      }
    });
  }

  if (comment && approved && !wasApproved) {
    await notifyApprovedPawMemoryComment({
      ...comment,
      review_status: "approved"
    });
  }

  return { ok: true };
}

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = normalizeOpenId(wxContext.OPENID);
  const action = event && event.action;
  const data = event && event.data ? event.data : {};

  try {
    requireAdmin(openid);

    switch (action) {
      case "approveMemoryItem":
        return await reviewMemoryItem(data.id, "public");
      case "rejectMemoryItem":
        return await reviewMemoryItem(data.id, "rejected");
      case "approvePawMemory":
        return await reviewPawMemory(data.id, true, data.source_type);
      case "rejectPawMemory":
        return await reviewPawMemory(data.id, false, data.source_type);
      case "approvePawMemoryComment":
        return await reviewPawMemoryComment(data.id, true);
      case "rejectPawMemoryComment":
        return await reviewPawMemoryComment(data.id, false);
      default:
        throw new Error("UNKNOWN_ACTION");
    }
  } catch (error) {
    if (error && error.message === "NO_PERMISSION") {
      return { ok: false, error: "NO_PERMISSION" };
    }
    throw error;
  }
};
