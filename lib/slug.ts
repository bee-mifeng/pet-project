export function generateMemorialSlug() {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `memorial-${randomPart}`;
}

export function sanitizeFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = fileName
    .replace(/\.[^/.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);

  return `${safeName || "photo"}.${extension}`;
}
