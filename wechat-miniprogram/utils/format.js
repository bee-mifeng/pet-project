const petTypeLabels = {
  cat: "猫咪",
  dog: "狗狗",
  other: "其他"
};

const statusLabels = {
  private: "私人",
  pending: "审核中",
  approved: "已公开",
  rejected: "未通过"
};

function petTypeLabel(type) {
  return petTypeLabels[type] || "其他";
}

function statusLabel(status) {
  return statusLabels[status] || "私人";
}

function formatDate(dateText) {
  if (!dateText) return "";
  return String(dateText).replace(/-/g, ".");
}

function formatYears(memorial) {
  const start = formatDate(memorial.birth_or_adopted_date);
  const end = formatDate(memorial.passed_date);
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} 来到身边`;
  if (end) return `${end} 去星星上`;
  return "一段被温柔保存的时光";
}

function brief(text, length) {
  if (!text) return "这页记忆还很安静，等待主人慢慢写下更多故事。";
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

module.exports = {
  petTypeLabel,
  statusLabel,
  formatDate,
  formatYears,
  brief
};
