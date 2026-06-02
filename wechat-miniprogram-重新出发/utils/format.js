const PET_TYPE_LABELS = {
  cat: "猫咪",
  dog: "狗狗",
  smallPet: "小宠",
  exoticPet: "异宠",
  other: "其他"
};

const PET_TYPE_OPTIONS = [
  { label: PET_TYPE_LABELS.cat, value: "cat" },
  { label: PET_TYPE_LABELS.dog, value: "dog" },
  { label: PET_TYPE_LABELS.smallPet, value: "smallPet" },
  { label: PET_TYPE_LABELS.exoticPet, value: "exoticPet" },
  { label: PET_TYPE_LABELS.other, value: "other" }
];

const PET_TYPE_FILTERS = [
  { label: "全部", value: "all" },
  ...PET_TYPE_OPTIONS
];

const petTypeAliases = {
  cat: "cat",
  "猫": "cat",
  "猫咪": "cat",
  "英短": "cat",
  "美短": "cat",
  "布偶": "cat",
  "狸花猫": "cat",
  "橘猫": "cat",
  "三花猫": "cat",
  dog: "dog",
  "狗": "dog",
  "狗狗": "dog",
  "泰迪": "dog",
  "比熊": "dog",
  "柯基": "dog",
  "柴犬": "dog",
  "金毛": "dog",
  "拉布拉多": "dog",
  "中华田园犬": "dog",
  smallPet: "smallPet",
  "小宠": "smallPet",
  "兔子": "smallPet",
  "仓鼠": "smallPet",
  "龙猫": "smallPet",
  "豚鼠": "smallPet",
  "刺猬": "smallPet",
  exoticPet: "exoticPet",
  "异宠": "exoticPet",
  "鸟": "exoticPet",
  "鹦鹉": "exoticPet",
  "鱼": "exoticPet",
  "乌龟": "exoticPet",
  "龟": "exoticPet",
  "蜥蜴": "exoticPet",
  "蛇": "exoticPet",
  "蛙": "exoticPet",
  "昆虫": "exoticPet",
  "蜘蛛": "exoticPet",
  other: "other",
  "其他": "other",
  "其他小动物": "other"
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
  const value = String(type || "").trim();
  return petTypeAliases[value] || "other";
}

function normalizePetTypeFilter(type) {
  const value = String(type || "").trim();
  if (!value || value === "all" || value === "全部") return "";
  return normalizePetType(value);
}

function normalizePetStatus(status) {
  return status === "star" ? "star" : "living";
}

function normalizeVisibility(visibility) {
  return ["private", "pending", "public", "rejected"].includes(visibility) ? visibility : "private";
}

function petTypeLabel(type) {
  return PET_TYPE_LABELS[normalizePetType(type)];
}

function petStatusLabel(status) {
  return petStatusLabels[normalizePetStatus(status)];
}

function visibilityLabel(visibility) {
  return visibilityLabels[normalizeVisibility(visibility)];
}

function primaryInteractionType(status) {
  return "like";
}

function primaryInteractionLabel(status) {
  return "喜欢";
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
  const visibility = normalizeVisibility(card.visibility);
  const petStatus = normalizePetStatus(card.pet_status);
  const petType = normalizePetType(card.pet_type);
  return {
    ...card,
    pet_type: petType,
    pet_type_label: petTypeLabel(petType),
    pet_status_label: petStatusLabel(petStatus),
    pet_status_class: petStatus,
    visibility_label: visibilityLabel(visibility),
    visibility_class: visibility,
    primary_interaction_type: primaryType,
    primary_interaction_label: primaryInteractionLabel(card.pet_status),
    primary_interaction_count: card.like_count || 0,
    message_action_label: messageActionLabel(card.pet_status),
    timeline: timeLine(card),
    brief_story: brief(card.story, 54)
  };
}

module.exports = {
  PET_TYPE_OPTIONS,
  PET_TYPE_FILTERS,
  PET_TYPE_LABELS,
  normalizePetType,
  normalizePetTypeFilter,
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
