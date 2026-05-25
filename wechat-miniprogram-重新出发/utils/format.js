const petTypeLabels = {
  cat: "猫咪",
  dog: "狗狗",
  other: "其他小动物"
};

const petStatusLabels = {
  living: "陪伴中",
  star: "在星星上"
};

const visibilityLabels = {
  private: "私密",
  pending: "审核中",
  public: "已公开",
  rejected: "未通过"
};

function normalizePetType(type) {
  return ["cat", "dog", "other"].includes(type) ? type : "other";
}

function normalizePetStatus(status) {
  return status === "star" ? "star" : "living";
}

function normalizeVisibility(visibility) {
  return ["private", "pending", "public", "rejected"].includes(visibility) ? visibility : "private";
}

function petTypeLabel(type) {
  return petTypeLabels[normalizePetType(type)];
}

function petStatusLabel(status) {
  return petStatusLabels[normalizePetStatus(status)];
}

function visibilityLabel(visibility) {
  return visibilityLabels[normalizeVisibility(visibility)];
}

function primaryInteractionType(status) {
  return normalizePetStatus(status) === "star" ? "flower" : "like";
}

function primaryInteractionLabel(status) {
  return normalizePetStatus(status) === "star" ? "献花" : "喜欢";
}

function messageActionLabel(status) {
  return normalizePetStatus(status) === "star" ? "留言祝福" : "留言";
}

function formatDate(dateText) {
  if (!dateText) return "";
  return String(dateText).replace(/-/g, ".");
}

function timeLine(card) {
  const start = formatDate(card.birth_or_adopted_date);
  const starDate = formatDate(card.star_date);
  if (start && starDate) return `${start} - ${starDate}`;
  if (start) return `${start} 来到身边`;
  if (starDate) return `${starDate} 去了星星上`;
  return "一段被温柔保存的陪伴";
}

function brief(text, length) {
  if (!text) return "这页记忆还很安静，等待主人慢慢写下更多故事。";
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

function decorateCard(card) {
  const primaryType = primaryInteractionType(card.pet_status);
  return {
    ...card,
    pet_type_label: petTypeLabel(card.pet_type),
    pet_status_label: petStatusLabel(card.pet_status),
    visibility_label: visibilityLabel(card.visibility),
    primary_interaction_type: primaryType,
    primary_interaction_label: primaryInteractionLabel(card.pet_status),
    primary_interaction_count: primaryType === "flower" ? card.flower_count || 0 : card.like_count || 0,
    message_action_label: messageActionLabel(card.pet_status),
    timeline: timeLine(card),
    brief_story: brief(card.story, 54)
  };
}

module.exports = {
  normalizePetType,
  normalizePetStatus,
  normalizeVisibility,
  petTypeLabel,
  petStatusLabel,
  visibilityLabel,
  primaryInteractionType,
  primaryInteractionLabel,
  messageActionLabel,
  formatDate,
  timeLine,
  brief,
  decorateCard
};
