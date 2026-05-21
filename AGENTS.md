# PawsMeadow 项目说明

本文档记录对当前项目的通读结果，供后续开发、维护和交接使用。

## 项目概览

PawsMeadow 是一个面向中国大陆用户的宠物数字纪念 Web 应用，中文名为“毛孩子记忆花园”。产品语气温柔、克制，核心目标是让用户为离开的宠物创建一页私人纪念页，并可在审核后进入公共展示空间。

第一版 MVP 的主流程是：

1. 用户创建私人纪念页。
2. 上传宠物照片，填写名字、类型、日期、故事和想说的话。
3. 系统生成私密 slug 链接。
4. 用户可选择申请进入公共记忆花园。
5. 后台人工审核公开申请。
6. 审核通过后进入 `/garden` 公共记忆花园。
7. 访客可献花、点亮小爪印、提交留言。
8. 留言需审核通过后才公开显示。

项目刻意避免排名、攀比和过度悲伤消费，强调隐私可控、公开审核、留言审核、服务透明。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react 图标
- Supabase JavaScript SDK
- Supabase Database
- Supabase Storage

当前 `package.json` 中的主要版本：

- `next`: `^16.2.6`
- `react`: `^19.2.3`
- `typescript`: `^5.9.3`
- `tailwindcss`: `^3.4.18`
- `@supabase/supabase-js`: `^2.106.1`

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run start
```

本项目目前没有单独配置 `lint` 或 `test` 脚本。基础验证命令：

```bash
npm run typecheck
npm run build
```

## 环境变量

示例文件是 `.env.local.example`：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STORAGE_MODE=supabase-storage
```

`NEXT_PUBLIC_STORAGE_MODE` 影响数据读写路径：

- `local`：浏览器本地免配置模式，数据存在 `localStorage`，图片转为 data URL。
- `supabase-storage`：推荐模式。通过 Next API 路由读写 Supabase Database，并上传照片到 `pet-photos` bucket。
- 未设置为以上两者时：客户端直接使用 Supabase Database 与 Storage。

注意：`lib/supabase/client.ts` 在 `NEXT_PUBLIC_STORAGE_MODE=local` 时会主动抛错，避免误用 Supabase 客户端。

## 页面路由

- `/`：首页，包含 hero、产品说明、示例纪念卡、流程、服务说明、品牌承诺和 FAQ。
- `/create`：创建私人纪念页，使用 `CreateMemorialForm`。
- `/memorial/[slug]`：真实纪念页详情，支持私密链接访问、献花、点亮、留言、申请公开。
- `/garden`：公共记忆花园，仅展示审核通过且公开的纪念页。
- `/meadow`：旧路径，直接重定向到 `/garden`。
- `/pricing`：价格说明页，使用静态价格数据。
- `/admin`：内部审核入口。
- `/admin/memorials`：纪念页公开申请审核。
- `/admin/messages`：留言审核。

全局布局在 `app/layout.tsx`，统一包含 `Header` 和 `Footer`，页面语言为 `zh-CN`。

## API 路由

这些 API 主要服务于 `NEXT_PUBLIC_STORAGE_MODE=supabase-storage` 模式。

- `GET /api/memorials`
  - 默认返回全部纪念页。
  - `?scope=public` 返回 `review_status=approved` 且 `is_public=true` 的纪念页，并附带已审核留言数。
  - `?scope=pending` 返回待审核公开申请。
- `POST /api/memorials`
  - 接收 `FormData`，创建纪念页，上传照片，写入 `memorials` 表。
- `GET /api/memorials/[slug]`
  - 按 slug 读取纪念页和已审核留言。
- `PATCH /api/memorials/[slug]`
  - 更新纪念页字段，如审核状态、公开状态、互动计数。
- `POST /api/memorials/[slug]/messages`
  - 为纪念页提交留言，默认 `review_status=pending`。
- `GET /api/messages`
  - 可按 `?status=pending` 等状态过滤留言，并补充宠物名。
- `PATCH /api/messages/[id]`
  - 更新留言审核状态。

## 数据模型

数据库类型定义在 `types/database.ts`，Supabase schema 在 `supabase/schema.sql`。

### memorials

核心字段：

- `id`
- `slug`
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

### messages

核心字段：

- `id`
- `memorial_id`
- `visitor_name`
- `content`
- `review_status`: `pending | approved | rejected`
- `created_at`

### interactions

核心字段：

- `id`
- `memorial_id`
- `type`: `flower | paw_light`
- `visitor_key`
- `created_at`

当前直接数据库模式会向 `interactions` 插入互动记录，但 `supabase-storage` 和 `local` 模式主要更新纪念页计数。

## Supabase 初始化

初始化步骤记录在 `README.md`：

1. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。
2. 在 Supabase Storage 中创建 public bucket：
   - bucket name: `pet-photos`
   - public: `true`

照片上传路径约定：

```text
memorials/{slug}/{timestamp}-{filename}
```

## 数据读写模式

项目目前支持三套读写路径。

### local 模式

文件：`lib/local-store.ts`

- 纪念页存在 `localStorage` 的 `pawsmeadow_local_memorials`。
- 留言存在 `localStorage` 的 `pawsmeadow_local_messages`。
- 图片通过 `FileReader` 转成 data URL。
- 适合无 Supabase 配置的本地演示。

### supabase-storage 模式

文件：

- `lib/supabase/admin.ts`
- `lib/supabase/storage-data.ts`
- `app/api/*`

特点：

- 服务端用 `SUPABASE_SERVICE_ROLE_KEY` 访问 Supabase。
- 纪念页与留言写入 Supabase Database。
- 照片上传到 `pet-photos` bucket。
- 客户端通过 Next API 路由读写。

### 直接 Supabase 数据库模式

文件：

- `lib/supabase/client.ts`
- `components/CreateMemorialForm.tsx`
- `components/GardenClient.tsx`
- `components/MemorialDetailClient.tsx`
- `components/AdminMemorialsClient.tsx`
- `components/AdminMessagesClient.tsx`

特点：

- 客户端用 anon key 直接访问 Supabase。
- 纪念页、留言和互动分别写入数据库表。
- 图片上传到 `pet-photos` bucket。

## 核心组件

- `Header`：顶部导航，包含 Logo、记忆花园、服务说明、常见问题、创建入口。
- `Footer`：页脚，包含品牌说明、页面链接、规则占位链接、服务列表。
- `Logo`：使用 `public/images/pawsmeadow-logo.png`，支持浅色页脚变体。
- `HeroSection`：首页首屏，使用 `hero-meadow.svg` 背景和纪念页预览。
- `SectionHeader`：通用 section 标题组件。
- `MemorialCard`：首页静态示例纪念卡。
- `PricingCard`：价格页卡片。
- `PetTypeFilter`：公共花园宠物类型筛选。
- `CreateMemorialForm`：创建纪念页表单，按存储模式分流保存逻辑。
- `GardenClient`：公共记忆花园客户端数据加载、筛选和卡片渲染。
- `MemorialDetailClient`：纪念页详情、互动、公开申请、留言提交。
- `AdminNotice`：后台未接权限系统的提醒。
- `AdminMemorialsClient`：公开申请审核。
- `AdminMessagesClient`：留言审核。

## 静态数据与资源

`data/memorials.ts` 中包含：

- 首页示例纪念页数据。
- 示例留言数据。
- 价格方案数据。

静态资源主要在 `public/images`：

- `pawsmeadow-logo.png`
- `hero-meadow.svg`
- `qr-placeholder.svg`
- `pets/*`
- `gallery/*`

首页示例卡仍使用静态数据和静态资源；真实公共花园使用运行时数据。

## UI 与风格

设计语言是温柔、安静、自然、克制。

Tailwind 扩展颜色在 `tailwind.config.ts`：

- `forest`: 深绿色
- `sage`: 鼠尾草绿
- `gold`: 金色
- `cream`: 米色
- `night`: 深蓝灰
- `porcelain`: 瓷白
- `rosewood`: 玫瑰木色
- `mist`: 雾灰绿

全局样式在 `app/globals.css`：

- 使用浅色主题。
- `body` 使用中文友好的系统字体栈。
- `.container-shell` 控制主体最大宽度。
- `.focus-ring` 提供统一键盘焦点样式。

## 产品与业务规则

- 私人纪念页可免费创建。
- 默认只有拿到私密链接的人可以访问纪念页。
- 用户可申请公开展示。
- 公开展示前需要人工审核。
- 公共记忆花园只展示 `review_status=approved` 且 `is_public=true` 的纪念页。
- 留言默认进入 `pending`，审核通过后才显示。
- 纪念页可关闭留言：`allow_messages=false`。
- 献花和点亮小爪印使用浏览器 `localStorage` 做一次性限制。
- 二维码区域目前是静态占位。
- 首页示例卡只是展示风格，不代表真实数据。

## 当前边界与风险

- 后台 `/admin` 相关页面没有登录和权限保护，正式上线前必须补访问控制。
- Supabase RLS policy 当前对 anon 比较开放，MVP 可用，但生产环境需要收紧。
- `supabase-storage` 模式把业务数据写入 Database，适合后续继续增加后台权限、审核和查询能力。
- 互动计数在部分模式下是直接读当前 count 后加一，存在并发覆盖风险。
- 留言、纪念页 PATCH 接口没有严格字段白名单，生产环境需要增加服务端校验。
- 用户上传图片目前没有看到尺寸、体积、类型的强约束。
- 二维码、内容编辑、删除、主人身份识别、支付、登录系统尚未实现。
- Footer 中“内容审核说明 / 用户协议 / 隐私政策”还是 `#` 占位链接。

## 开发注意事项

- 使用路径别名 `@/*`，配置在 `tsconfig.json`。
- TypeScript 开启 `strict`。
- 页面和组件多为中文文案，新增文案应保持温柔、克制、非营销化。
- 新增宠物类型时，需要同步更新：
  - `types/index.ts`
  - `types/database.ts`
  - `lib/utils.ts`
  - `supabase/schema.sql`
  - 相关筛选和表单组件
- 修改审核状态时，要同时考虑 `review_status` 和 `is_public`。
- 修改留言显示逻辑时，要确保只展示 `review_status=approved` 的留言。
- 修改存储逻辑时，要同时检查三种模式：`local`、`supabase-storage`、直接 Supabase。
- 新增 API 写操作时，生产前应补服务端校验和鉴权。
- 不要把真实 `.env.local` 内容写入文档或提交。

## 建议后续优先级

1. 为 `/admin` 添加登录和权限控制。
2. 收紧 Supabase RLS policy 和 API PATCH 字段白名单。
3. 实现真实二维码生成。
4. 增加纪念页主人身份识别、编辑、删除、关闭公开展示。
5. 优化互动计数为数据库原子更新或服务端事务。
6. 增加图片上传限制、压缩和错误提示。
7. 增加 lint、typecheck、测试脚本。
8. 将 Footer 占位链接补成真实规则页面。
