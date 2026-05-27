const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];
const DEV_FORCE_ADMIN = false;

function normalizeOpenId(value) {
  return String(value || "").trim();
}

function isAdminOpenId(openid) {
  const currentOpenId = normalizeOpenId(openid);
  return (
    DEV_FORCE_ADMIN ||
    ADMIN_OPENIDS.map((id) => normalizeOpenId(id)).includes(currentOpenId)
  );
}

module.exports = {
  ADMIN_OPENIDS,
  DEV_FORCE_ADMIN,
  normalizeOpenId,
  isAdminOpenId
};
