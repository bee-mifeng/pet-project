# PawsMeadow 微信小程序 MVP

这是基于现有 PawsMeadow Web 版视觉与产品逻辑重新组织的原生微信小程序版本。它独立于 Web 项目运行，使用 WXML / WXSS / JS / JSON，并优先采用微信云开发。

## 如何打开

1. 打开微信开发者工具。
2. 选择“导入项目”。
3. 项目目录选择本目录：`wechat-miniprogram`。
4. AppID 可先使用测试号或替换为你的小程序 AppID。
5. 导入后打开“云开发”面板。

## 云开发初始化

`app.js` 中目前使用占位环境 ID：

```js
wx.cloud.init({
  env: "your-cloud-env-id",
  traceUser: true
});
```

请在微信开发者工具的云开发控制台创建环境后，把 `your-cloud-env-id` 替换成真实环境 ID。

## 需要创建的集合

在云开发数据库中创建：

- `memorials`
- `messages`
- `interactions`

本地 MVP 测试阶段可先使用开发环境默认权限；如果读写失败，请在云开发控制台检查集合权限。正式上线前不要使用过宽权限，应改为安全规则和云函数校验。

### memorials 字段

- `slug`
- `owner_key`
- `owner_openid`
- `pet_name`
- `pet_type`: `cat | dog | other`
- `birth_or_adopted_date`
- `passed_date`
- `story`
- `message`
- `photo_url`
- `is_public`
- `allow_messages`
- `review_status`: `private | pending | approved | rejected`
- `flowers_count`
- `paw_lights_count`
- `created_at`
- `updated_at`

### messages 字段

- `memorial_id`
- `visitor_key`
- `visitor_openid`
- `visitor_name`
- `content`
- `review_status`: `pending | approved | rejected`
- `created_at`

### interactions 字段

- `memorial_id`
- `visitor_key`
- `visitor_openid`
- `type`: `flower | paw_light`
- `created_at`

## 云存储目录

在云存储中保留目录：

- `pet-photos/`

上传路径格式：

```text
pet-photos/{owner_key}/{timestamp-random}.jpg
```

## 如何测试创建纪念档案

1. 替换 `app.js` 中的云开发环境 ID。
2. 在开发者工具中进入“创建”tab。
3. 填写宠物名字、类型，上传照片。
4. 点击“保存这一页记忆”。
5. 成功后会跳转到纪念页详情。

## 如何测试公共花园

1. 创建纪念档案时打开“申请进入公共记忆花园”。
2. 进入 `/pages/admin/index`，在开发者工具编译模式里手动设置页面路径即可。
3. 在“公开申请”中点击“通过”。
4. 回到“记忆花园”tab，即可看到审核通过且公开的纪念档案。

## 如何测试留言审核

1. 打开某个纪念页详情。
2. 在“留言祝福”区域提交留言。
3. 留言默认进入 `pending`，不会立刻显示。
4. 进入 `/pages/admin/index` 的“留言审核”。
5. 点击“通过”后，回到纪念页即可看到留言。

## 第一版占位功能

- 二维码纪念卡入口目前是弹窗占位。
- 用户协议、隐私政策、内容审核说明、删除内容说明、举报入口为文本入口占位。
- 用户身份第一版使用本地 `owner_key` / `visitor_key` 关联；后续建议接入微信登录或云函数获取 openid。
- 每个用户 1 个纪念档案的限制尚未强制执行，建议上线前补充。
- 管理审核页是内部测试入口，尚未做权限保护。

## 上线前必须补充

- 用户协议正式文本。
- 隐私政策正式文本。
- 内容审核规则。
- 举报机制。
- 用户删除自己纪念档案的完整入口与权限校验。
- admin 页面访问权限保护。
- 云数据库安全规则。
- 图片大小、类型和内容安全检测。
- UGC 文本内容安全检测。

## 上传体验版测试

1. 在微信公众平台创建并绑定小程序 AppID。
2. 微信开发者工具中把 `project.config.json` 的 `appid` 替换为真实 AppID。
3. 替换 `app.js` 中的云开发环境 ID。
4. 配置云数据库集合与云存储目录。
5. 在开发者工具中完成编译预览。
6. 点击“上传”，填写版本号和项目备注。
7. 到微信公众平台“版本管理”中选择体验版，并添加体验成员。
