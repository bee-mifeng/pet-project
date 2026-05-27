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

async function uploadMemoryPhoto(tempFilePath, ownerKey) {
  try {
    const cloudPath = `memory-items/${ownerKey || "guest"}/photos/${safeFileName(tempFilePath)}`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    });
    return result.fileID;
  } catch (error) {
    console.error("上传记忆片段照片失败", error);
    throw error;
  }
}

async function uploadMemoryVideo(tempFilePath, ownerKey) {
  try {
    const cloudPath = `memory-items/${ownerKey || "guest"}/videos/${safeFileName(tempFilePath, ".mp4")}`;
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    });
    return result.fileID;
  } catch (error) {
    console.error("上传记忆片段视频失败", error);
    throw error;
  }
}

module.exports = {
  uploadPetPhoto,
  uploadPetVideo,
  uploadMemoryPhoto,
  uploadMemoryVideo
};
