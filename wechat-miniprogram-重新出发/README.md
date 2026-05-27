# PawsMeadow 毛孩子记忆册

这是一个全新目录下的微信小程序版本，定位为“宠物日常记忆册 + 纪念模式”。旧的 `wechat-miniprogram/` 目录保留不动，可继续作为技术验证备份。

## 如何打开

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择：

```text
wechat-miniprogram-重新出发
```

4. AppID 默认沿用旧项目配置：`wxde3b5a409bd6f0ed`。如需使用正式 AppID，请修改 `project.config.json`。
5. 打开“云开发”面板，确认环境可用。

## 云开发环境 ID

云环境 ID 集中配置在：

```text
config/env.js
```

当前配置为：

```js
const CLOUD_ENV_ID = "pawsmeadow-d4gah5qxh7a003f24";
```

如果以后更换云环境，只改这一处。

## 管理员配置

管理员白名单也在：

```text
config/env.js
```

字段：

```js
const ADMIN_OPENIDS = ["o-GlI3auJGArAyOt-pbA5x_pu4Kg"];
const DEV_FORCE_ADMIN = false;
```

`DEV_FORCE_ADMIN` 已按要求默认关闭。新增管理员时，把对应 openid 加入 `ADMIN_OPENIDS`。

## 需要手动创建的数据库集合

继续使用同一个云环境中的四个集合：

- `memorials`
- `messages`
- `interactions`
- `memory_items`

新小程序只使用新字段语义，避免影响旧验证项目。

### memorials

保存毛孩子记忆卡。

核心字段：

- `pet_name`
- `pet_type`: `cat | dog | other`
- `pet_status`: `living | star`
- `birth_or_adopted_date`
- `star_date`
- `photo_url`
- `video_url`
- `video_duration`
- `video_size`
- `story`
- `message`
- `visibility`: `private | pending | public | rejected`
- `allow_messages`
- `owner_openid`
- `owner_key`
- `slug`
- `like_count`
- `flower_count`
- `paw_lights_count`
- `created_at`
- `updated_at`

### messages

保存留言祝福。

核心字段：

- `card_id`
- `content`
- `openid`
- `visitor_name`
- `review_status`: `pending | approved | rejected`
- `created_at`

### interactions

保存互动记录。

核心字段：

- `card_id`
- `type`: `like | flower | paw_light`
- `openid`
- `user_key`
- `created_at`

### memory_items

保存一张记忆卡下面的多段记忆片段。

核心字段：

- `memorial_id`
- `owner_openid`
- `owner_key`
- `item_type`: `photo | video`
- `media_url`
- `media_file_id`
- `cover_url`
- `title`
- `content`
- `memory_date`
- `visibility`: `private | pending | public | rejected`
- `created_at`
- `updated_at`

## 需要部署的云函数

需要部署：

```text
cloudfunctions/login
cloudfunctions/mediaUrls
cloudfunctions/memorialApi
cloudfunctions/adminReview
```

用途：

- `login`：获取当前微信用户的 openid。
- `mediaUrls`：把云存储 fileID 换成临时访问链接，兼容免费环境下存储不能公开读取的限制。
- `memorialApi`：服务端读取公开记忆卡、执行管理员审核、留言审核和互动计数，避免普通用户只能读写自己数据导致的跨手机不可见问题。
- `adminReview`：服务端校验管理员 openid，并审核记忆片段。

部署方式：

1. 在微信开发者工具中打开云开发。
2. 分别右键 `cloudfunctions/login`、`cloudfunctions/mediaUrls`、`cloudfunctions/memorialApi` 和 `cloudfunctions/adminReview`。
3. 选择“上传并部署：云端安装依赖”。

## 云存储

照片上传到云存储路径：

```text
pet-photos/{openid或userKey}/{filename}
```

视频上传到云存储路径：

```text
pet-videos/{openid或userKey}/{filename}
```

记忆片段上传到云存储路径：

```text
memory-items/{openid或userKey}/photos/{filename}
memory-items/{openid或userKey}/videos/{filename}
```

上传限制：

- 图片不超过 2MB。
- 视频不超过 20 秒。
- 视频不超过 30MB。这个大小适合第一版短视频记忆，能兼顾清晰度、上传速度和云存储成本。

如果上传失败，请检查云存储权限和当前云环境是否正确。

## 页面结构

- `pages/index/index`：首页
- `pages/create/index`：创建毛孩子记忆卡
- `pages/memory-create/index`：添加一段记忆片段
- `pages/card/index`：记忆卡详情
- `pages/garden/index`：记忆花园
- `pages/mine/index`：我的记忆卡
- `pages/admin/index`：审核后台
- `pages/privacy/index`：隐私政策
- `pages/agreement/index`：用户协议
- `pages/rules/index`：内容审核说明

底部 Tab 只包含：

- 首页
- 记忆花园
- 创建
- 我的

审核后台不放入 tabBar。

## 完整测试路径

1. 首页：确认标题、副文案、创建按钮、花园按钮和私密提示正常。
2. 创建：进入“创建”，填写名字、类型、状态、日期、照片、可选视频、故事和想说的话。
3. 私密保存：关闭“申请公开到记忆花园”，点击“保存这页记忆”，应进入详情页。
4. 我的：进入“我的”，应能看到刚创建的记忆卡，状态为“私密”。
5. 申请公开：在详情页点击“申请进入记忆花园”，状态变为“审核中”。
6. 审核：在微信开发者工具中编译路径设置为 `pages/admin/index`，白名单账号进入后可通过或拒绝记忆卡。
7. 记忆花园：审核通过后，进入“记忆花园”，应能看到公开的记忆卡。
8. 记忆片段：进入自己的详情页，点击“添加一段记忆”，保存私密片段后应只给主人可见。
9. 片段审核：添加片段时打开“申请公开展示”，进入后台“片段”审核，通过后，其他手机打开公开详情页可见。
10. 详情页：点击“查看记忆卡”，测试视频播放、喜欢、点亮小爪印。
11. 留言：提交留言后先不公开，进入后台审核留言，通过后回到详情页查看。

## 第一版不包含

- 支付
- 会员
- 商城
- 广告
- 复杂社区
- AI 文案

## 上线前建议

- 收紧数据库权限。
- 增加图片大小、类型和内容安全检查。
- 增加文本内容安全检查。
- 将审核操作迁移到云函数中做更严格的权限校验。
- 补充用户主动管理自己记忆卡的完整入口。
