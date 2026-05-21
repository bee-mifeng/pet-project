# PawsMeadow 毛孩子记忆花园

面向中国大陆市场的宠物数字纪念 Web 应用。第一版聚焦核心闭环：

创建私人纪念页 → 上传照片 → 保存纪念页 → 私密链接访问 → 申请进入公共记忆花园 → 内部审核 → 公开展示 → 献花 / 点亮小爪印 / 留言审核。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase Database
- Supabase Storage

## 安装依赖

```bash
npm install
```

## 在新电脑上使用

```bash
git clone git@github.com:bee-mifeng/pet-project.git
cd pet-project
npm install
cp .env.local.example .env.local
```

然后在 `.env.local` 中填入自己的 Supabase 配置，再运行：

```bash
npm run dev
```

开发地址：

```bash
http://localhost:3000
```

## 环境变量

复制 `.env.local.example` 为 `.env.local`，并填入：

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_STORAGE_MODE=supabase-storage
```

`.env.local` 不会提交到 GitHub。`SUPABASE_SERVICE_ROLE_KEY` 只在服务端 API 路由中使用，不要放到任何 `NEXT_PUBLIC_*` 变量里。

## Supabase 初始化

1. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。
2. 在 Supabase Storage 中创建 public bucket：
   - bucket name: `pet-photos`
   - public: `true`

`NEXT_PUBLIC_STORAGE_MODE=supabase-storage` 是推荐模式：前端通过 Next API 路由访问 Supabase，照片写入 `pet-photos`，纪念页和留言写入 Supabase Database 表。

图片上传路径使用：

```text
memorials/{slug}/{timestamp}-{filename}
```

## 本地开发

```bash
npm run dev
```

默认访问：

```bash
http://localhost:3000
```

## 构建

```bash
npm run typecheck
npm run build
```

## 页面路由

- `/`：首页，保留示例预览卡与产品说明
- `/create`：创建纪念页，上传照片并保存到 Supabase
- `/memorial/[slug]`：真实纪念页详情，支持私密链接访问
- `/garden`：公共记忆花园，只展示审核通过且公开的纪念页
- `/meadow`：旧路径，自动跳转到 `/garden`
- `/admin`：内部审核入口
- `/admin/memorials`：纪念页公开申请审核
- `/admin/messages`：留言审核
- `/pricing`：价格说明页

## 已连接的核心能力

- 创建纪念页写入 `memorials`
- 图片上传到 `pet-photos`
- 自动生成 `memorial-xxxxxx` slug
- 按 slug 读取纪念页
- 公开申请状态更新
- 公共记忆花园读取真实公开数据
- 献花与点亮小爪印持久化
- 留言提交进入待审核
- 后台审核纪念页公开申请
- 后台审核留言

## 当前边界

- 暂未接登录系统，后台入口正式上线前需要增加访问权限。
- 分享二维码区域仍为静态占位。
- 首页示例卡仍为静态展示，用于说明页面风格。
