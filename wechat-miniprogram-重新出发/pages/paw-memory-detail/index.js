const cardService = require("../../services/card");
const mediaService = require("../../services/media");
const pawMemoryService = require("../../services/paw-memory");
const cardGate = require("../../utils/card-gate");
const { normalizePetType, petTypeLabel } = require("../../utils/format");

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

function decoratePawMemory(memory) {
  if (!memory) return null;

  const petType = normalizePetType(memory.pet_type);
  return {
    ...memory,
    pet_type: petType,
    pet_type_label: petTypeLabel(petType),
    created_label: formatTime(memory.created_at),
    video_id: "paw-memory-detail-video",
    has_liked: !!memory.has_liked,
    has_pawed: !!memory.has_pawed,
    media_failed: false
  };
}

function formatLikesLabel(count) {
  return count > 0 ? `${count}次赞` : "赞";
}

function decorateComment(comment) {
  const displayName = String(comment.visitor_card_name || comment.visitor_name || comment.nickname || "路过的朋友").trim();
  const likesCount = comment.likes_count || 0;
  const avatarSrc = comment.visitor_card_photo_src || comment.visitor_card_photo || "";

  return {
    ...comment,
    display_name: displayName,
    visitor_card_id: comment.visitor_card_id || "",
    avatar_src: avatarSrc,
    avatar_text: displayName.slice(0, 1) || "路",
    likes_count: likesCount,
    likes_label: formatLikesLabel(likesCount),
    likes_count_text: likesCount > 0 ? String(likesCount) : "",
    has_liked: !!comment.has_liked,
    author_liked: !!comment.author_liked,
    is_pending: comment.review_status === "pending",
    parent_comment_id: comment.parent_comment_id || "",
    reply_to_comment_id: comment.reply_to_comment_id || "",
    reply_to_name: comment.reply_to_name || "",
    replies: [],
    created_label: formatTime(comment.created_at),
    reply_label: formatTime(comment.author_reply_updated_at || comment.author_reply_created_at),
    has_reply: !!String(comment.author_reply || "").trim()
  };
}

function sortReplies(a, b) {
  return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
}

function buildCommentThreads(comments) {
  const decorated = (comments || []).map(decorateComment);
  const commentMap = decorated.reduce((map, comment) => {
    map[comment._id] = comment;
    return map;
  }, {});
  const roots = [];

  decorated.forEach((comment) => {
    const parentId = comment.parent_comment_id;
    if (parentId && commentMap[parentId]) {
      commentMap[parentId].replies.push(comment);
      return;
    }
    roots.push(comment);
  });

  return roots.map((comment) => ({
    ...comment,
    replies: (comment.replies || []).sort(sortReplies)
  }));
}

function findCommentById(comments, id) {
  for (let i = 0; i < comments.length; i += 1) {
    const comment = comments[i];
    if (comment._id === id) return comment;
    const reply = findCommentById(comment.replies || [], id);
    if (reply) return reply;
  }
  return null;
}

function updateCommentById(comments, id, updater) {
  return (comments || []).map((comment) => {
    if (comment._id === id) return updater(comment);
    return {
      ...comment,
      replies: updateCommentById(comment.replies || [], id, updater)
    };
  });
}

Page({
  data: {
    id: "",
    memory: null,
    comments: [],
    commentsCount: 0,
    commentsCountText: "0",
    visitorCard: null,
    hasVisitorCard: false,
    loading: true,
    loadFailed: false,
    commentsLoading: false,
    interacting: false,
    commentText: "",
    commentReplyTarget: null,
    commentSubmitting: false,
    replyCommentId: "",
    replyText: "",
    replySubmitting: false,
    likingCommentId: "",
    actionPanelVisible: false
  },

  onLoad(options) {
    this.setData({ id: options && options.id ? options.id : "" });
    this.loadDetail();
  },

  async onShow() {
    if (!this.data.id || this.data.loading) return;
    const app = getApp();
    const openid = await app.getOpenId();
    const userKey = app.globalData.userKey || app.ensureUserKey();
    const visitorCard = await this.getVisitorCard(openid, userKey);
    this.setData({
      visitorCard,
      hasVisitorCard: !!visitorCard
    });
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async loadDetail() {
    if (!this.data.id) {
      this.setData({ loading: false, loadFailed: true });
      return;
    }

    this.setData({ loading: true, loadFailed: false });

    try {
      const app = getApp();
      const openid = await app.getOpenId();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const [memory, comments, visitorCard] = await Promise.all([
        pawMemoryService.getPawMemory({
          id: this.data.id,
          owner_key: userKey
        }),
        pawMemoryService.listApprovedComments(this.data.id, {
          owner_key: userKey
        }),
        this.getVisitorCard(openid, userKey)
      ]);

      if (!memory) {
        this.setData({ memory: null, comments: [], commentsCount: 0, commentsCountText: "0", loading: false, loadFailed: true });
        return;
      }

      const approvedComments = comments || [];
      this.setData({
        memory: decoratePawMemory({
          ...memory,
          comments_count: approvedComments.length
        }),
        comments: buildCommentThreads(approvedComments),
        commentsCount: approvedComments.length,
        commentsCountText: String(approvedComments.length),
        visitorCard,
        hasVisitorCard: !!visitorCard,
        loading: false,
        commentsLoading: false
      });
      this.recordPawView();
    } catch (error) {
      this.setData({ memory: null, comments: [], commentsCount: 0, commentsCountText: "0", loading: false, loadFailed: true });
      wx.showToast({ title: "加载失败，请稍后再试", icon: "none" });
    }
  },

  async getVisitorCard(openid, ownerKey) {
    if (!openid && !ownerKey) return null;

    try {
      const card = await cardService.getMyPrimaryCard({
        openid,
        owner_key: ownerKey
      });
      if (!card) return null;
      const withMedia = await mediaService.attachMediaUrls([card]);
      return withMedia[0] || null;
    } catch (error) {
      console.warn("读取留言身份记忆卡失败", error);
      return null;
    }
  },

  goCreateCardPage() {
    cardGate.goCreateCardPage();
  },

  promptCreateCard() {
    cardGate.promptCreateCard();
  },

  ensureVisitorCard() {
    if (this.data.hasVisitorCard && this.data.visitorCard) return true;
    this.promptCreateCard();
    return false;
  },

  goCreateCard() {
    this.goCreateCardPage();
  },

  async recordPawView() {
    const memory = this.data.memory;
    if (!memory || !memory._id || memory.has_pawed) return;

    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const result = await pawMemoryService.addInteraction({
        paw_memory_id: memory._id,
        type: "paw",
        owner_key: userKey
      });

      this.setData({
        "memory.has_pawed": true,
        "memory.paw_lights_count": result && result.added
          ? (memory.paw_lights_count || 0) + 1
          : (memory.paw_lights_count || 0)
      });
    } catch (error) {
      console.warn("记录小爪记忆浏览失败", error);
    }
  },

  openPetCard(event) {
    const petId = event.currentTarget.dataset.petId;
    if (!petId) {
      wx.showToast({ title: "暂时没有找到对应记忆卡", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/card/index?id=${petId}` });
  },

  async interact(event) {
    if (this.data.interacting || !this.data.memory) return;

    const type = event.currentTarget.dataset.type;
    if (type === "like" && !this.ensureVisitorCard()) return;

    const memory = this.data.memory;

    this.setData({ interacting: true });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const result = await pawMemoryService.addInteraction({
        paw_memory_id: memory._id,
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
        this.setData({
          [`memory.${countField}`]: Math.max(0, (memory[countField] || 0) - 1),
          [`memory.${stateField}`]: false
        });
        return;
      }

      if (!result.added) {
        this.setData({ [`memory.${stateField}`]: true });
        if (type === "paw") {
          wx.showToast({ title: "你已经留下过心意了", icon: "none" });
        }
        return;
      }

      this.setData({
        [`memory.${countField}`]: (memory[countField] || 0) + 1,
        [`memory.${stateField}`]: true
      });
    } catch (error) {
      if (error && String(error.message || error.errMsg || "").indexOf("MISSING_VISITOR_CARD") >= 0) {
        this.promptCreateCard();
      } else {
        wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
      }
    } finally {
      this.setData({ interacting: false });
    }
  },

  mediaError() {
    this.setData({ "memory.media_failed": true });
  },

  noop() {},

  openMemoryActions() {
    const memory = this.data.memory;
    if (!memory || !memory.is_owner) return;
    this.setData({ actionPanelVisible: true });
  },

  closeActionPanel() {
    this.setData({ actionPanelVisible: false });
  },

  chooseHideMemory() {
    this.closeActionPanel();
    this.confirmHideMemory();
  },

  chooseDeleteMemory() {
    this.closeActionPanel();
    this.confirmDeleteMemory();
  },

  confirmHideMemory() {
    wx.showModal({
      title: "隐藏这条动态",
      content: "隐藏后，它不会再出现在公开小爪记忆里。若之后想重新公布，需要重新提交审核。",
      confirmText: "隐藏",
      confirmColor: "#5B5F97",
      success: (res) => {
        if (!res.confirm) return;
        this.updateMemoryPublishState("hide");
      }
    });
  },

  confirmDeleteMemory() {
    wx.showModal({
      title: "删除这条动态",
      content: "删除后，这条动态会从列表中移除，相关留言也不会再展示。",
      confirmText: "删除",
      confirmColor: "#9A4A4A",
      success: (res) => {
        if (!res.confirm) return;
        this.updateMemoryPublishState("delete");
      }
    });
  },

  async updateMemoryPublishState(action) {
    const memory = this.data.memory;
    if (!memory || !memory._id) return;

    wx.showLoading({ title: action === "delete" ? "正在删除" : "正在隐藏" });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const payload = {
        id: memory._id,
        source_type: memory.source_type || "paw_memory",
        owner_key: userKey
      };

      if (action === "delete") {
        await pawMemoryService.deletePawMemory(payload);
      } else {
        await pawMemoryService.hidePawMemory(payload);
      }

      wx.hideLoading();
      wx.showToast({
        title: action === "delete" ? "已删除" : "已隐藏",
        icon: "none"
      });
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail() {
            wx.switchTab({ url: "/pages/paw-memory/index" });
          }
        });
      }, 450);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: "操作失败，请稍后再试", icon: "none" });
    }
  },

  inputComment(event) {
    this.setData({ commentText: event.detail.value });
  },

  startCommentReply(event) {
    const id = event.currentTarget.dataset.id;
    const comment = findCommentById(this.data.comments, id);
    if (!comment || !this.ensureVisitorCard()) return;
    if (comment.is_pending) {
      wx.showToast({ title: "审核通过后就能回复", icon: "none" });
      return;
    }

    this.setData({
      commentReplyTarget: {
        id: comment._id,
        rootId: comment.parent_comment_id || comment._id,
        name: comment.display_name,
        cardId: comment.visitor_card_id || ""
      },
      commentText: `@${comment.display_name} `
    });
  },

  cancelCommentReply() {
    this.setData({
      commentReplyTarget: null,
      commentText: ""
    });
  },

  openCommenterCard(event) {
    const cardId = event.currentTarget.dataset.cardId;
    if (!cardId) {
      wx.showToast({ title: "暂时没有找到对应记忆卡", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/card/index?id=${cardId}` });
  },

  appendPendingComment(content, replyTarget, savedComment) {
    const visitorCard = this.data.visitorCard || {};
    const commentData = savedComment || {};
    const pending = decorateComment({
      _id: commentData._id || `pending-${Date.now()}`,
      paw_memory_id: this.data.memory && this.data.memory._id,
      visitor_card_id: visitorCard._id || "",
      visitor_card_name: visitorCard.pet_name || "毛孩子",
      visitor_card_photo_src: visitorCard.photo_src || visitorCard.photo_url || "",
      visitor_name: visitorCard.pet_name || "毛孩子",
      parent_comment_id: replyTarget ? replyTarget.rootId : "",
      reply_to_comment_id: replyTarget ? replyTarget.id : "",
      reply_to_card_id: replyTarget ? replyTarget.cardId : "",
      reply_to_name: replyTarget ? replyTarget.name : "",
      content,
      review_status: commentData.review_status || "pending",
      created_at: commentData.created_at || new Date()
    });

    if (!replyTarget) {
      this.setData({
        comments: [pending, ...this.data.comments],
        commentsCount: this.data.commentsCount + 1,
        commentsCountText: String(this.data.commentsCount + 1),
        "memory.comments_count": (this.data.memory.comments_count || 0) + 1
      });
      return;
    }

    const comments = this.data.comments.map((comment) => {
      if (comment._id !== replyTarget.rootId) return comment;
      return {
        ...comment,
        replies: [...(comment.replies || []), pending]
      };
    });

    this.setData({
      comments,
      commentsCount: this.data.commentsCount + 1,
      commentsCountText: String(this.data.commentsCount + 1),
      "memory.comments_count": (this.data.memory.comments_count || 0) + 1
    });
  },

  async submitComment() {
    if (this.data.commentSubmitting || !this.data.memory) return;
    if (!this.ensureVisitorCard()) return;

    const replyTarget = this.data.commentReplyTarget;
    let content = this.data.commentText.trim();
    if (replyTarget) {
      const prefix = `@${replyTarget.name}`;
      if (content.indexOf(prefix) === 0) {
        content = content.slice(prefix.length).trim();
      }
    }
    if (!content) {
      wx.showToast({ title: "请先写下留言", icon: "none" });
      return;
    }

    this.setData({ commentSubmitting: true });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const created = await pawMemoryService.createComment({
        paw_memory_id: this.data.memory._id,
        owner_key: userKey,
        parent_comment_id: replyTarget ? replyTarget.id : "",
        content
      });
      this.appendPendingComment(content, replyTarget, created);
      this.setData({
        commentText: "",
        commentReplyTarget: null
      });
      wx.showToast({
        title: created && created.review_status === "approved" ? "留言已显示" : "留言已提交审核",
        icon: "none"
      });
    } catch (error) {
      if (error && String(error.message || error.errMsg || "").indexOf("MISSING_VISITOR_CARD") >= 0) {
        this.promptCreateCard();
      } else {
        wx.showToast({ title: "提交失败，请稍后再试", icon: "none" });
      }
    } finally {
      this.setData({ commentSubmitting: false });
    }
  },

  startReply(event) {
    if (!this.data.memory || !this.data.memory.can_reply_comments) return;

    const id = event.currentTarget.dataset.id;
    const comment = this.data.comments.find((item) => item._id === id);
    if (!comment) return;

    this.setData({
      replyCommentId: id,
      replyText: comment.author_reply || ""
    });
  },

  async likeComment(event) {
    const id = event.currentTarget.dataset.id;
    if (!id || this.data.likingCommentId) return;
    if (!this.ensureVisitorCard()) return;

    const comment = findCommentById(this.data.comments, id);
    if (!comment) return;

    this.setData({ likingCommentId: id });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      const result = await pawMemoryService.likeComment({
        comment_id: id,
        owner_key: userKey
      });

      if (result.removed) {
        const nextCount = Math.max(0, (comment.likes_count || 0) - 1);
        this.setData({
          comments: updateCommentById(this.data.comments, id, (item) => ({
            ...item,
            likes_count: nextCount,
            likes_label: formatLikesLabel(nextCount),
            likes_count_text: nextCount > 0 ? String(nextCount) : "",
            has_liked: false,
            author_liked: result.author_liked === false ? false : item.author_liked
          }))
        });
        return;
      }

      if (result.added) {
        const nextCount = (comment.likes_count || 0) + 1;
        this.setData({
          comments: updateCommentById(this.data.comments, id, (item) => ({
            ...item,
            likes_count: nextCount,
            likes_label: formatLikesLabel(nextCount),
            likes_count_text: nextCount > 0 ? String(nextCount) : "",
            has_liked: true,
            author_liked: result.author_liked ? true : item.author_liked
          }))
        });
        return;
      }

      this.setData({
        comments: updateCommentById(this.data.comments, id, (item) => ({
          ...item,
          has_liked: true
        }))
      });
    } catch (error) {
      if (error && String(error.message || error.errMsg || "").indexOf("MISSING_VISITOR_CARD") >= 0) {
        this.promptCreateCard();
      } else {
        wx.showToast({ title: "点赞失败，请稍后再试", icon: "none" });
      }
    } finally {
      this.setData({ likingCommentId: "" });
    }
  },

  cancelReply() {
    if (this.data.replySubmitting) return;
    this.setData({
      replyCommentId: "",
      replyText: ""
    });
  },

  inputReply(event) {
    this.setData({ replyText: event.detail.value });
  },

  async submitReply(event) {
    if (this.data.replySubmitting || !this.data.memory) return;

    const id = event.currentTarget.dataset.id;
    const content = this.data.replyText.trim();
    if (!id || !content) {
      wx.showToast({ title: "请先写下回复", icon: "none" });
      return;
    }

    this.setData({ replySubmitting: true });
    try {
      const app = getApp();
      const userKey = app.globalData.userKey || app.ensureUserKey();
      await pawMemoryService.replyComment({
        comment_id: id,
        owner_key: userKey,
        content
      });

      const index = this.data.comments.findIndex((item) => item._id === id);
      const nowLabel = formatTime(new Date());
      if (index >= 0) {
        this.setData({
          [`comments[${index}].author_reply`]: content,
          [`comments[${index}].has_reply`]: true,
          [`comments[${index}].reply_label`]: nowLabel
        });
      }

      this.setData({
        replyCommentId: "",
        replyText: ""
      });
      wx.showToast({ title: "已回复留言", icon: "none" });
    } catch (error) {
      wx.showToast({ title: "回复失败，请稍后再试", icon: "none" });
    } finally {
      this.setData({ replySubmitting: false });
    }
  },

  onShareAppMessage() {
    const memory = this.data.memory;

    return {
      title: memory ? `${memory.pet_name}的一段小爪记忆` : "PawsMeadow 小爪记忆",
      path: `/pages/paw-memory-detail/index?id=${this.data.id}`
    };
  }
});
