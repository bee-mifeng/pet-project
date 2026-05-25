const { safeFileName } = require("../utils/slug");

async function uploadPetPhoto(tempFilePath, ownerKey) {
  try {
    const cloudPath = `pet-photos/${ownerKey || "guest"}/${safeFileName(tempFilePath)}`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    });
    return result.fileID;
  } catch (error) {
    console.error("上传照片失败", error);
    throw error;
  }
}

async function uploadPetVideo(tempFilePath, ownerKey) {
  try {
    const cloudPath = `pet-videos/${ownerKey || "guest"}/${safeFileName(tempFilePath, ".mp4")}`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    });
    return result.fileID;
  } catch (error) {
    console.error("上传视频失败", error);
    throw error;
  }
}

module.exports = {
  uploadPetPhoto,
  uploadPetVideo
};
