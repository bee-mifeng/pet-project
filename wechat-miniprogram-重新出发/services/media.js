function isCloudFile(fileID) {
  return typeof fileID === "string" && fileID.indexOf("cloud://") === 0;
}

function callGetTempFileURL(fileList) {
  return new Promise((resolve, reject) => {
    wx.cloud.getTempFileURL({
      fileList,
      success: resolve,
      fail: reject
    });
  });
}

function callDownloadFile(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.downloadFile({
      fileID,
      success: resolve,
      fail: reject
    });
  });
}

async function getTempUrlMap(fileIDs) {
  const uniqueFileIDs = Array.from(new Set(fileIDs.filter(isCloudFile)));
  if (uniqueFileIDs.length === 0) return {};

  try {
    const result = await wx.cloud.callFunction({
      name: "mediaUrls",
      data: { fileList: uniqueFileIDs }
    });
    const list = result && result.result && Array.isArray(result.result.fileList)
      ? result.result.fileList
      : [];

    const urlMap = list.reduce((map, item) => {
      if (item.fileID && item.tempFileURL) map[item.fileID] = item.tempFileURL;
      return map;
    }, {});

    if (Object.keys(urlMap).length > 0) return urlMap;
  } catch (error) {
    try {
      const result = await callGetTempFileURL(uniqueFileIDs);
      const list = result && Array.isArray(result.fileList)
        ? result.fileList
        : [];

      return list.reduce((map, item) => {
        if (item.fileID && item.tempFileURL) {
          map[item.fileID] = item.tempFileURL;
        }
        return map;
      }, {});
    } catch (fallbackError) {
      console.error("获取媒体临时链接失败", fallbackError);
    }
  }

  return {};
}

async function getVideoSrc(videoUrl, urlMap) {
  if (!videoUrl) return "";
  if (!isCloudFile(videoUrl)) return videoUrl;

  try {
    const result = await callDownloadFile(videoUrl);
    if (result && result.tempFilePath) return result.tempFilePath;
  } catch (error) {
    console.error("下载视频临时文件失败", error);
  }

  return urlMap[videoUrl] || videoUrl || "";
}

async function attachMediaUrls(cards) {
  const list = Array.isArray(cards) ? cards : [];
  const fileIDs = [];

  list.forEach((card) => {
    if (card.photo_url) fileIDs.push(card.photo_url);
    if (card.video_url) fileIDs.push(card.video_url);
  });

  const urlMap = await getTempUrlMap(fileIDs);

  return Promise.all(list.map(async (card) => ({
    ...card,
    photo_src: card.photo_src || urlMap[card.photo_url] || card.photo_url || "",
    video_src: card.video_src || await getVideoSrc(card.video_url, urlMap)
  })));
}

async function attachMediaUrl(card) {
  if (!card) return card;
  const list = await attachMediaUrls([card]);
  return list[0];
}

module.exports = {
  attachMediaUrls,
  attachMediaUrl
};
