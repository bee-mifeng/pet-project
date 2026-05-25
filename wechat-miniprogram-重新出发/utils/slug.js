function randomText(length) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function generateSlug() {
  return `memory-${Date.now().toString(36)}-${randomText(6)}`;
}

function safeFileName(filePath, fallbackExt = ".jpg") {
  const extMatch = String(filePath || "").match(/\.[a-zA-Z0-9]+$/);
  const normalizedFallback = fallbackExt.indexOf(".") === 0 ? fallbackExt : `.${fallbackExt}`;
  const ext = extMatch ? extMatch[0].toLowerCase() : normalizedFallback;
  return `${Date.now()}-${randomText(8)}${ext}`;
}

module.exports = {
  generateSlug,
  safeFileName
};
