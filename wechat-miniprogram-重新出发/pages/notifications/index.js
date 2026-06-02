const notificationService = require("../../services/notification");

const FILTERS = [
  { label: "全部", value: "all" },
  { label: "评论", value: "comment" },
  { label: "新动态", value: "dynamic" },
  { label: "赞 / 其他", value: "reaction" }
];

const ACTION_LABELS = {
  card_like: "喜欢了你的记忆卡",
  paw_memory_like: "赞了你的小爪记忆",
  paw_memory_comment: "评论了你的小爪记忆",
  paw_memory_reply: "回复了你的小爪记忆里的留言",
  paw_memory_comment_reply: "回复了你的评论",
  paw_memory_author_reply: "回复了你的评论",
  paw_memory_comment_like: "赞了你的评论"
};

function getNavigationStyle() {
  let statusBarHeight = 0;
  let navBarHeight = 44;

  try {
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
    statusBarHeight = windowInfo.statusBarHeight || 0;

    if (menuButton && menuButton.height && menuButton.top) {
      navBarHeight = (menuButton.top - statusBarHeight) * 2 + menuButton.height;
    }
  } catch (error) {
    statusBarHeight = 0;
    navBarHeight = 44;
  }

  return `padding-top: ${statusBarHeight}px; height: ${statusBarHeight + navBarHeight}px;`;
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

function decorateNotification(item) {
  const actorName = String(item.actor_name || "毛孩子").trim();
  const preview = String(item.content_preview || item.target_preview || "").trim();
  const category = item.category || (item.type && item.type.indexOf("comment") >= 0 ? "comment" : "reaction");

  return {
    ...item,
    category,
    actor_name: actorName,
    actor_avatar_text: actorName.slice(0, 1) || "爪",
    action_label: ACTION_LABELS[item.type] || "给你留下了新的心意",
    created_label: formatTime(item.created_at),
    content_preview: preview,
    has_preview: !!preview,
    open_target_id: item.paw_memory_id || item.target_id || "",
    open_target_type: item.target_type || "",
    was_unread: !item.read_at
  };
}

Page({
  data: {
    filters: FILTERS,
    activeFilter: "all",
    notifications: [],
    filteredNotifications: [],
    loading: true,
    loadFailed: false,
    navStyle: "padding-top: 20px; height: 64px;"
  },

  onLoad() {
    this.setData({ navStyle: getNavigationStyle() });
    this.loadNotifications();
  },

  onPullDownRefresh() {
    this.loadNotifications().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadNotifications() {
    this.setData({ loading: true, loadFailed: false });

    try {
      const app = getApp();
      const ownerKey = app.globalData.userKey || app.ensureUserKey();
      const list = await notificationService.listNotifications({
        owner_key: ownerKey,
        limit: 80
      });
      const notifications = (list || []).map(decorateNotification);

      this.setData({
        notifications,
        loading: false
      });
      this.applyFilter();
      await notificationService.markRead({ owner_key: ownerKey });
    } catch (error) {
      this.setData({
        filters: FILTERS,
        notifications: [],
        filteredNotifications: [],
        loading: false,
        loadFailed: true
      });
      wx.showToast({ title: "通知读取失败", icon: "none" });
    }
  },

  applyFilter() {
    const activeFilter = this.data.activeFilter;
    const filteredNotifications = activeFilter === "all"
      ? this.data.notifications
      : this.data.notifications.filter((item) => item.category === activeFilter);
    const filters = FILTERS.map((filter) => ({
      ...filter,
      hasUnread: filter.value === "all"
        ? this.data.notifications.some((item) => item.was_unread)
        : this.data.notifications.some((item) => item.category === filter.value && item.was_unread)
    }));
    this.setData({ filteredNotifications, filters });
  },

  changeFilter(event) {
    const value = event.currentTarget.dataset.value || "all";
    this.setData({ activeFilter: value });
    this.applyFilter();
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.switchTab({ url: "/pages/paw-memory/index" });
  },

  openTarget(event) {
    const id = event.currentTarget.dataset.id;
    const targetType = event.currentTarget.dataset.targetType;
    if (!id) {
      wx.showToast({ title: "暂时没有找到对应动态", icon: "none" });
      return;
    }
    if (targetType === "card") {
      wx.navigateTo({ url: `/pages/card/index?id=${id}` });
      return;
    }
    wx.navigateTo({ url: `/pages/paw-memory-detail/index?id=${id}` });
  }
});
