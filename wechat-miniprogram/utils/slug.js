function generateSlug() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `memorial-${randomPart}`;
}

function safeFileName(path) {
  const ext = (path.split(".").pop() || "jpg").toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

module.exports = {
  generateSlug,
  safeFileName
};
