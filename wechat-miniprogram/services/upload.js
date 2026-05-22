const { safeFileName } = require("../utils/slug");

async function uploadPetPhoto(tempFilePath, ownerKey) {
  const cloudPath = `pet-photos/${ownerKey || "guest"}/${safeFileName(tempFilePath)}`;
  const result = await wx.cloud.uploadFile({
    cloudPath,
    filePath: tempFilePath
  });
  return result.fileID;
}

module.exports = {
  uploadPetPhoto
};
