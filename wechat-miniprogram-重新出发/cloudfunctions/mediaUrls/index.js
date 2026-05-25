const cloud = require("wx-server-sdk");

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event) => {
  const fileList = Array.isArray(event.fileList)
    ? event.fileList.filter((fileID) => typeof fileID === "string" && fileID)
    : [];

  if (fileList.length === 0) {
    return { fileList: [] };
  }

  return cloud.getTempFileURL({ fileList });
};
