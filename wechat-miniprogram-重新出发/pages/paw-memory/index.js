const pawMemoryService = require("../../services/paw-memory");
const interactionService = require("../../services/interaction");
const mediaService = require("../../services/media");
const notificationService = require("../../services/notification");
const cardGate = require("../../utils/card-gate");
const { PET_TYPE_FILTERS, normalizePetType, petTypeLabel } = require("../../utils/format");

const INTERACTION_STORAGE_KEY = "pawsmeadow_paw_memory_interactions";

function readInteractionMap() {
  return wx.getStorageSync(INTERACTION_STORAGE_KEY) || {};
}

function interactionKey(type, memoryId) {
  return `${type}:${memoryId}`;
}

function rememberInteraction(type, memoryId) {
  const map = readInteractionMap();
  map[interactionKey(type, memoryId)] = true;
  wx.setStorageSync(INTERACTION_STORAGE_KEY, map);
}

function forgetInteraction(type, memoryId) {
  const map = readInteractionMap();
  delete map[interactionKey(type, memoryId)];
  wx.setStorageSync(INTERACTION_STORAGE_KEY, map);
}

function formatTime(value) {
  if (!value) return "刚刚";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "刚刚";

  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const dayText = `${date.getDate()}`.padStart(2, "0");
  return `${month}.${dayText}`;
}

function decoratePawMemory(memory, index) {
  const petType = normalizePetType(memory.pet_type);
  return {
    ...memory,
    pet_type: petType,
    pet_type_label: petTypeLabel(petType),
    created_label: formatTime(memory.created_at),
    video_id: `paw-memory-video-${index}`,
    has_liked: !!memory.has_liked,
    has_pawed: !!memory.has_pawed,
    media_failed: false
  };
}

function formatUnreadText(count) {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

Page({
  data: {
    filters: PET_TYPE_FILTERS,
    activePetType: "all",
    memories: [],
    loading: true,
    loadFailed: false,
    interacting: false,
    playingVideoId: "",
    commentPanelVisible: false,
    commentMemory: null,
    comments: [],
    commentText: "",
    commentsLoading: false,
    commentSubmitting: false,
    unreadNotificationCount: 0,
    unreadNotificationText: ""
  },

  onShow() {
    this.loadUnreadNotificationCount();
    this.loadMemories();
    this.startNotificationPolling();
  },

  onHide() {
    this.stopNotificationPolling();
  },

  onUnload() {
    this.stopNotificationPolling();
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUnreadNotificationCount(),
      this.loadMemories()
    ]).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadMemories() {
    this.setData({ loading: true, loadFailed: false });

    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const list = await pawMemoryService.listPublic({
        pet_type: this.data.activePetType,
        owner_key: userKey
      });
      const withMedia = await mediaService.attachPawMemoryUrls(list);
      const memories = withMedia.map(decoratePawMemory);
      this.setData({
        memories,
        loading: false
      });
      this.recordPawViews(memories);
    } catch (error) {
      this.setData({ memories: [], loading: false, loadFailed: true });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  async loadUnreadNotificationCount() {
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const count = await notificationService.getUnreadCount({ owner_key: userKey });
      const hasNewUnread = count > this.data.unreadNotificationCount;
      const unreadText = formatUnreadText(count);
      this.setData({
        unreadNotificationCount: count,
        unreadNotificationText: unreadText
      });
      this.syncNotificationTabBadge(unreadText);
      if (hasNewUnread) {
        this.refreshMemoriesSilently();
      }
    } catch (error) {
      console.warn("读取未读动态通知失败", error);
    }
  },

  syncNotificationTabBadge(text) {
    try {
      if (text) {
        wx.setTabBarBadge({
          index: 1,
          text,
          fail(error) {
            console.warn("同步小爪记忆底部提醒失败", error);
          }
        });
        return;
      }

      wx.removeTabBarBadge({
        index: 1,
        fail(error) {
          console.warn("清除小爪记忆底部提醒失败", error);
        }
      });
    } catch (error) {
      console.warn("更新小爪记忆底部提醒失败", error);
    }
  },

  startNotificationPolling() {
    this.stopNotificationPolling();
    this.notificationTimer = setInterval(() => {
      this.loadUnreadNotificationCount();
    }, 15000);
  },

  stopNotificationPolling() {
    if (!this.notificationTimer) return;
    clearInterval(this.notificationTimer);
    this.notificationTimer = null;
  },

  async refreshMemoriesSilently() {
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const list = await pawMemoryService.listPublic({
        pet_type: this.data.activePetType,
        owner_key: userKey
      });
      const withMedia = await mediaService.attachPawMemoryUrls(list);
      const memories = withMedia.map(decoratePawMemory);
      this.setData({ memories });
    } catch (error) {
      console.warn("静默刷新小爪记忆失败", error);
    }
  },

  openNotifications() {
    wx.navigateTo({ url: "/pages/notifications/index" });
  },

  async goCreate() {
    const card = await cardGate.ensureHasCard({
      content: "创建毛孩子记忆卡后，就可以发布它的小爪记忆。"
    });
    if (!card) return;

    wx.navigateTo({ url: "/pages/paw-memory-create/index" });
  },

  openMemory(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/paw-memory-detail/index?id=${id}` });
  },

  openPetCard(event) {
    const petId = event.currentTarget.dataset.petId;
    if (!petId) {
      wx.showToast({ title: "暂时没有找到对应记忆卡", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/card/index?id=${petId}` });
  },

  noop() {},

  changeFilter(event) {
    const filter = event.currentTarget.dataset.filter;
    this.setData({ activePetType: filter });
    this.loadMemories();
  },

  playVideo(event) {
    const videoId = event.currentTarget.dataset.videoid;
    if (this.data.playingVideoId && this.data.playingVideoId !== videoId) {
      wx.createVideoContext(this.data.playingVideoId, this).pause();
    }
    this.setData({ playingVideoId: videoId });
  },

  async recordPawViews(memories) {
    const list = Array.isArray(memories) ? memories : [];
    const pending = list.filter((memory) => memory && memory._id && !memory.has_pawed);
    if (pending.length === 0) return;

    const app = getApp();
    const userKey = app.globalData.userKey || app.ensureUserKey();

    pending.forEach(async (memory) => {
      try {
        const result = await interactionService.addPawMemoryInteraction({
          paw_memory_id: memory._id,
          type: "paw",
          owner_key: userKey
        });

        rememberInteraction("paw", memory._id);

        const index = this.data.memories.findIndex((item) => item._id === memory._id);
        if (index < 0) return;

        const nextCount = result.added
          ? (this.data.memories[index].paw_lights_count || 0) + 1
          : (this.data.memories[index].paw_lights_count || 0);
        this.setData({
          [`memories[${index}].paw_lights_count`]: nextCount,
          [`memories[${index}].has_pawed`]: true
        });
      } catch (error) {
        console.warn("记录小爪记忆浏览失败", error);
      }
    });
  },

  async interact(event) {
    if (this.data.interacting) return;

    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type;
    const index = this.data.memories.findIndex((memory) => memory._id === id);
    if (index < 0) return;

    if (type === "like") {
      const card = await cardGate.ensureHasCard();
      if (!card) return;
    }

    this.setData({ interacting: true });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const result = await interactionService.addPawMemoryInteraction({
        paw_memory_id: id,
        type,
        owner_key: userKey
      });

      const stateFieldMap = {
        like: "has_liked",
        paw: "has_pawed"
      };
      const countFieldMap = {
        like: "likes_count",
        paw: "paw_lights_count"
      };
      const stateField = stateFieldMap[type] || "has_pawed";
      const countField = countFieldMap[type] || "paw_lights_count";

      if (result.removed) {
        const nextCount = Math.max(0, (this.data.memories[index][countField] || 0) - 1);
        forgetInteraction(type, id);
        this.setData({
          [`memories[${index}].${countField}`]: nextCount,
          [`memories[${index}].${stateField}`]: false
        });
        return;
      }

      if (!result.added) {
        rememberInteraction(type, id);
        this.setData({ [`memories[${index}].${stateField}`]: true });
        if (type === "paw") {
          wx.showToast({ title: "你已经留下过心意了", icon: "none" });
        }
        return;
      }

      const nextCount = (this.data.memories[index][countField] || 0) + 1;
      rememberInteraction(type, id);
      this.setData({
        [`memories[${index}].${countField}`]: nextCount,
        [`memories[${index}].${stateField}`]: true
      });
    } catch (error) {
      if (type === "like") {
        console.warn("小爪记忆互动失败", error);
      } else {
        wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
      }
    } finally {
      this.setData({ interacting: false });
    }
  },

  async openComments(event) {
    const id = event.currentTarget.dataset.id;
    const memory = this.data.memories.find((item) => item._id === id);
    if (!memory) return;

    this.setData({
      commentPanelVisible: true,
      commentMemory: memory,
      comments: [],
      commentText: "",
      commentsLoading: true
    });

    try {
      const comments = await pawMemoryService.listApprovedComments(id);
      this.setData({
        comments,
        commentsLoading: false
      });
    } catch (error) {
      this.setData({ comments: [], commentsLoading: false });
      wx.showToast({ title: "留言读取失败", icon: "none" });
    }
  },

  closeComments() {
    if (this.data.commentSubmitting) return;
    this.setData({
      commentPanelVisible: false,
      commentMemory: null,
      comments: [],
      commentText: ""
    });
  },

  inputComment(event) {
    this.setData({ commentText: event.detail.value });
  },

  mediaError(event) {
    const id = event.currentTarget.dataset.id;
    const index = this.data.memories.findIndex((memory) => memory._id === id);
    if (index < 0) return;
    this.setData({ [`memories[${index}].media_failed`]: true });
  },

  async submitComment() {
    if (this.data.commentSubmitting || !this.data.commentMemory) return;
    const card = await cardGate.ensureHasCard();
    if (!card) return;

    const content = this.data.commentText.trim();
    if (!content) {
      wx.showToast({ title: "请先写下留言", icon: "none" });
      return;
    }

    this.setData({ commentSubmitting: true });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const created = await pawMemoryService.createComment({
        paw_memory_id: this.data.commentMemory._id,
        owner_key: userKey,
        content
      });
      this.setData({ commentText: "" });
      if (created && created.review_status === "approved") {
        const comments = await pawMemoryService.listApprovedComments(this.data.commentMemory._id);
        this.setData({ comments: comments || [] });
      }
      wx.showToast({
        title: created && created.review_status === "approved" ? "留言已显示" : "留言已提交审核",
        icon: "none"
      });
    } catch (error) {
      wx.showToast({ title: "提交失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ commentSubmitting: false });
    }
  },

  onShareAppMessage(options) {
    const id = options && options.target && options.target.dataset
      ? options.target.dataset.id
      : "";
    const memory = this.data.memories.find((item) => item._id === id);

    return {
      title: memory ? `${memory.pet_name}的一段小爪记忆` : "PawsMeadow 小爪记忆",
      path: memory ? `/pages/paw-memory-detail/index?id=${memory._id}` : "/pages/paw-memory/index"
    };
  }
});
