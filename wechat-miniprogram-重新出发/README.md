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

继续使用同一个云环境中的六个集合：

- `memorials`
- `messages`
- `interactions`
- `memory_items`
- `paw_memories`
- `paw_memory_comments`

新小程序只使用新字段语义，避免影响旧验证项目。

### AI 审核字段

公开内容提交后，`memorials`、`messages`、`memory_items`、`paw_memories` 和 `paw_memory_comments` 会按需保存 AI 初审结果：

- `ai_review_status`: `pass | review | block | failed | skipped`
- `ai_review_label`
- `ai_review_score`
- `ai_review_reason`
- `ai_review_provider`
- `ai_reviewed_at`

`pass` 会自动公开或自动通过；`review`、`block`、`failed` 和 `skipped` 会继续留在审核后台，由管理员人工处理。

### memorials

保存毛孩子记忆卡。

核心字段：

- `pet_name`
- `pet_type`: `cat | dog | smallPet | exoticPet | other`
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
- `target_type`: `paw_memory`（小爪记忆互动使用）
- `target_id`（小爪记忆互动使用）
- `type`: `like | flower | paw_light | paw`
- `openid`
- `user_key`
- `owner_openid`
- `owner_key`
- `dedupe_key`
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

### paw_memories

保存「小爪记忆」轻量动态。

核心字段：

- `owner_openid`
- `owner_key`
- `pet_id`
- `pet_name`
- `pet_type`: `cat | dog | smallPet | exoticPet | other`
- `pet_avatar`
- `content`
- `media_type`: `image | video | none`
- `media_file_id`
- `media_url`
- `video_cover`
- `review_status`: `pending | approved | rejected`
- `visibility`: `pending | public | rejected | private`
- `likes_count`
- `paw_lights_count`
- `comments_count`
- `save_to_memory_items`
- `linked_memory_item_id`
- `created_at`
- `updated_at`

前台只展示 `review_status = approved` 且 `visibility = public` 的小爪记忆。

### paw_memory_comments

保存「小爪记忆」留言。

核心字段：

- `paw_memory_id`
- `owner_openid`
- `owner_key`
- `content`
- `review_status`: `pending | approved | rejected`
- `created_at`
- `updated_at`

前台只展示审核通过的留言。

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
- `memorialApi`：服务端读取公开记忆卡和小爪记忆，提交公开内容、执行 AI 初审、留言与互动计数，避免普通用户只能读写自己数据导致的跨手机不可见问题。
- `adminReview`：服务端校验管理员 openid，并审核记忆片段、小爪记忆和小爪记忆留言。

`adminReview` 当前支持的小爪记忆 action：

- `approvePawMemory`
- `rejectPawMemory`
- `approvePawMemoryComment`
- `rejectPawMemoryComment`

这些 action 会在云函数内部通过 `cloud.getWXContext()` 获取真实 openid，并校验管理员白名单。非管理员返回：

```json
{ "ok": false, "error": "NO_PERMISSION" }
```

部署方式：

1. 在微信开发者工具中打开云开发。
2. 分别右键 `cloudfunctions/login`、`cloudfunctions/mediaUrls`、`cloudfunctions/memorialApi` 和 `cloudfunctions/adminReview`。
3. 选择“上传并部署：云端安装依赖”。

## AI 初审配置

AI 初审使用豆包/火山引擎：

- 火山方舟豆包模型：审核名字、故事、留言、标题、正文。
- veImageX 智能审核：审核宠物照片、小爪记忆图片、记忆片段图片、视频封面图。
- 视频本体第一版不送审，只审核文字和封面图。

需要在火山引擎开通方舟模型服务和 veImageX 智能审核，并在微信云开发的 `memorialApi` 云函数环境变量中配置：

```text
AI_REVIEW_ENABLED=true
VOLCENGINE_ARK_API_KEY=你的火山方舟 API Key
VOLCENGINE_ARK_MODEL=你的豆包模型或 Endpoint ID
VOLCENGINE_ACCESS_KEY_ID=你的火山引擎 Access Key ID
VOLCENGINE_SECRET_ACCESS_KEY=你的火山引擎 Secret Access Key
VOLCENGINE_REGION=cn-beijing
VOLCENGINE_IMAGE_SERVICE_ID=你的 veImageX 服务 ID
VOLCENGINE_IMAGE_AUDIT_TEMPLATE=可选，逗号分隔审核维度
```

注意：

- 真实密钥不要写入代码，不要提交到 GitHub。
- 如果 `AI_REVIEW_ENABLED` 未开启或密钥缺失，公开内容会保留在待审核状态，不会自动公开。
- 后台会显示 `AI 高风险`、`AI 建议复核`、`AI 检测失败`、`AI 未执行` 等标签，并优先显示风险更高的内容。
- `VOLCENGINE_ARK_MODEL` 可以填写火山方舟模型名或 Endpoint ID；如果你更习惯写 `VOLCENGINE_ARK_ENDPOINT_ID`，代码也会读取它。
- `VOLCENGINE_IMAGE_AUDIT_TEMPLATE` 不填时，默认审核色情、性感、广告、涉政、暴恐、违法等常见维度。
- 修改环境变量后，需要重新部署 `cloudfunctions/memorialApi`。

换电脑恢复：

1. 安装微信开发者工具，用同一个微信账号登录。
2. 从 GitHub 拉取项目。
3. 用同一个 AppID 打开项目。
4. 确认 `config/env.js` 中的云环境 ID 仍是目标环境。
5. 在云开发中确认 `memorialApi` 的豆包/火山 AI 审核环境变量已配置。
6. 右键云函数，选择“上传并部署：云端安装依赖”。
7. 按下方完整测试路径确认创建、AI 初审、后台审核和公开展示都正常。

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

小爪记忆上传到云存储路径：

```text
paw-memories/{openid或userKey}/photos/{filename}
paw-memories/{openid或userKey}/videos/{filename}
```

上传限制：

- 图片不超过 2MB。
- 视频不超过 20 秒。
- 视频不超过 30MB。这个大小适合第一版短视频记忆，能兼顾清晰度、上传速度和云存储成本。
- 小爪记忆视频建议 30 秒以内。

如果上传失败，请检查云存储权限和当前云环境是否正确。

## 页面结构

- `pages/index/index`：首页
- `pages/paw-memory/index`：小爪记忆
- `pages/paw-memory-create/index`：发布小爪记忆
- `pages/create/index`：创建毛孩子记忆卡
- `pages/memory-create/index`：添加一段记忆片段
- `pages/card/index`：记忆卡详情
- `pages/garden/index`：记忆花园
- `pages/mine/index`：我的记忆卡
- `pages/admin/index`：审核后台
- `pages/privacy/index`：隐私政策
- `pages/agreement/index`：用户协议
- `pages/rules/index`：内容审核说明

底部 Tab 包含：

- 首页
- 小爪记忆
- 创建
- 记忆花园
- 我的

审核后台不放入 tabBar。

## 完整测试路径

1. 首页：确认标题、副文案、创建按钮、花园按钮和私密提示正常。
2. 创建：进入“创建”，填写名字、类型、状态、日期、照片、可选视频、故事和想说的话。
3. 私密保存：关闭“申请公开到记忆花园”，点击“保存这页记忆”，应进入详情页。
4. 我的：进入“我的”，应能看到刚创建的记忆卡，状态为“私密”。
5. 申请公开：在详情页点击“申请进入记忆花园”，安全内容可能自动公开；需复核内容应变为“审核中”。
6. 审核：在微信开发者工具中编译路径设置为 `pages/admin/index`，白名单账号进入后可查看 AI 标签，并通过或拒绝记忆卡。
7. 记忆花园：审核通过后，进入“记忆花园”，应能看到公开的记忆卡。
8. 记忆片段：进入自己的详情页，点击“添加一段记忆”，保存私密片段后应只给主人可见。
9. 片段审核：添加片段时打开“申请公开展示”，安全内容可自动公开；需复核内容进入后台“小爪记忆”审核。
10. 小爪记忆：进入“小爪记忆”，点击“发布小爪记忆”，选择毛孩子，填写文字，可选照片或视频，提交后安全内容可自动公开，其他内容提示等待审核。
11. 小爪审核：管理员进入审核后台“小爪记忆”，查看 AI 标签；通过后回到“小爪记忆”列表，应能按全部、猫咪、狗狗、小宠、异宠、其他筛选看到内容。
12. 小爪互动：点击喜欢和点亮小爪印，重复点击不应重复增加计数。
13. 小爪留言：打开留言弹层提交评论，安全留言可自动通过；需复核留言进入“小爪留言”审核，通过后前台留言弹层展示评论。
14. 我的页面：进入“我的”，应能看到“我的小爪记忆”，并显示审核中、已公开、未通过状态。
15. 详情页：点击“查看记忆卡”，测试视频播放、喜欢和爪印浏览统计。
16. AI 失败兜底：临时关闭或缺失 `AI_REVIEW_ENABLED`/密钥后提交公开内容，应留在待审列表并显示检测失败或未执行，不应自动公开。

## 第一版不包含

- 支付
- 会员
- 商城
- 广告
- 复杂社区
- AI 文案

## 上线前建议

- 收紧数据库权限。
- 继续细化豆包/火山内容审核策略、关键词库和误判复核流程。
- 将审核操作迁移到云函数中做更严格的权限校验。
- 补充用户主动管理自己记忆卡的完整入口。
