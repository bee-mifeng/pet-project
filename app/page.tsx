import Link from "next/link";
import {
  BadgeCheck,
  HelpCircle,
  Flower2,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Sprout
} from "lucide-react";
import { HeroSection } from "@/components/HeroSection";
import { MemorialCard } from "@/components/MemorialCard";
import { SectionHeader } from "@/components/SectionHeader";
import { memorials } from "@/data/memorials";

const features = [
  {
    title: "私人纪念页",
    description: "保存照片、日期、故事和想对它说的话，默认仅通过私密链接访问。",
    icon: LockKeyhole
  },
  {
    title: "公共记忆花园",
    description: "通过人工审核后展示，让更多人献花、点亮小爪印、留下温柔祝福。",
    icon: Flower2
  },
  {
    title: "二维码纪念卡",
    description: "可生成分享二维码，后续可用于实体纪念卡、相框或礼盒。",
    icon: QrCode
  }
];

const steps = [
  "填写宠物信息与故事",
  "生成私人纪念页",
  "申请公开并等待审核",
  "进入公共记忆花园"
];

const promises = [
  "温柔表达，避免阴森化和攀比式互动",
  "公开内容和留言均需人工审核",
  "支持私密链接，用户可选择公开或关闭留言",
  "持续维护页面体验，服务范围和价格清晰透明"
];

const serviceFeatures = [
  "申请进入公共记忆花园",
  "展示宠物纪念页",
  "支持他人献花与点亮小爪印",
  "支持留言祝福审核",
  "生成分享二维码"
];

const faqs = [
  {
    question: "别人可以看到我的纪念页吗？",
    answer:
      "默认只有拿到私密链接的人可以查看。你也可以选择申请公开展示，通过审核后进入公共记忆花园。"
  },
  {
    question: "公开展示需要审核吗？",
    answer:
      "需要。公开展示前会进行人工审核，主要关注隐私信息、文字内容和整体表达是否适合公开。"
  },
  {
    question: "私人纪念页是否收费？",
    answer:
      "私人纪念页可免费创建。是否申请进入公共记忆花园，由你自己决定。"
  },
  {
    question: "如果我不想公开，还能使用吗？",
    answer:
      "可以。你可以只创建私人纪念页，通过私密链接自己保存或分享给亲友，不申请公开展示。"
  },
  {
    question: "我可以只给家人朋友看吗？",
    answer:
      "可以。私人纪念页默认仅通过私密链接访问，你可以选择只分享给信任的人。"
  },
  {
    question: "留言会不会直接显示？",
    answer:
      "不会。留言会先进入待审核状态，通过后再显示在纪念页中。"
  },
  {
    question: "我可以修改或删除内容吗？",
    answer:
      "可以。纪念页主人应当可以修改内容、关闭公开展示、关闭留言或删除页面。"
  },
  {
    question: "二维码纪念卡有什么用？",
    answer:
      "二维码可以让亲友快速打开纪念页，也可以用于后续的实体纪念卡、相框或礼盒。"
  }
];

export default function HomePage() {
  const approvedMemorials = memorials
    .filter((memorial) => memorial.status === "approved" && memorial.isPublic)
    .slice(0, 3);

  return (
    <main>
      <HeroSection />

      <section id="how-it-works" className="bg-porcelain py-12 sm:py-16">
        <div className="container-shell">
          <SectionHeader
            eyebrow="你可以怎样保存它的记忆"
            title="先把记忆保存好，再决定是否与更多人分享。"
            description="PawsMeadow 从私人纪念页出发，经审核进入公共记忆花园，让浏览与祝福保持安静、克制。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet"
              >
                <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-forest text-cream">
                  <feature.icon className="h-5 w-5" />
                </span>
                <h3 className="font-serif text-2xl text-forest">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-night/64">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream/55 py-12 sm:py-16">
        <div className="container-shell">
          <SectionHeader
            eyebrow="示例纪念卡片"
            title="每一页都是被认真保存的一段陪伴。"
            description="每一次献花、点亮和留言，都只是温柔的祝福，不用于排名或比较。"
            action={
              <Link
                href="/meadow"
                className="focus-ring inline-flex min-h-11 items-center rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/35"
              >
                查看全部
              </Link>
            }
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {approvedMemorials.map((memorial) => (
              <MemorialCard key={memorial.id} memorial={memorial} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-porcelain py-12 sm:py-16">
        <div className="container-shell grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold text-gold">使用流程</p>
            <h2 className="font-serif text-3xl text-forest sm:text-4xl">
              从保存到公开，每一步都由你决定。
            </h2>
            <p className="mt-4 text-base leading-7 text-night/66">
              你可以先创建私人纪念页，确认内容后再选择是否申请公开展示。公开页面与留言都会先经过审核。
            </p>
            <Link
              href="/create"
              className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-6 text-sm font-bold text-cream shadow-quiet hover:bg-night"
            >
              <Sprout className="h-4 w-4" />
              现在创建
            </Link>
          </div>
          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-4 rounded-3xl border border-forest/10 bg-white p-4 shadow-quiet"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/16 text-sm font-bold text-night">
                  {index + 1}
                </span>
                <span className="text-base font-semibold text-forest">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="service" className="bg-forest py-10 text-cream sm:py-12">
        <div className="container-shell grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold text-gold">公共记忆花园展示服务</p>
            <h2 className="font-serif text-3xl sm:text-4xl">
              私人纪念页可免费创建，是否公开展示由你决定。
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-cream/72">
              当你希望它进入公共记忆花园时，可申请展示服务。费用用于人工审核、页面展示与基础维护。
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cream/78">
              私人纪念页永久免费创建。只有申请进入公共记忆花园时，才需要支付一次性服务费。
            </p>
            <Link
              href="/create"
              className="focus-ring mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-cream px-6 text-sm font-bold text-forest shadow-quiet hover:bg-white"
            >
              <Sprout className="h-4 w-4" />
              创建纪念页
            </Link>
          </div>
          <div className="rounded-3xl border border-cream/15 bg-cream/10 p-5 shadow-quiet">
            <div className="flex items-end justify-between gap-4 border-b border-cream/12 pb-4">
              <p className="text-sm font-semibold text-gold">一次性服务费</p>
              <p className="text-3xl font-semibold">19.9 元</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-cream/72">
              用于人工审核、页面展示与基础维护。
            </p>
            <ul className="mt-4 space-y-2.5 text-sm text-cream/76">
              {serviceFeatures.map((feature) => (
                <li key={feature} className="flex gap-3">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-gold" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-porcelain py-12 sm:py-16">
        <div className="container-shell">
          <SectionHeader
            eyebrow="品牌承诺"
            title="温柔表达、隐私可控、人工审核、持续维护。"
            description="我们刻意避开攀比式互动和过度悲伤消费，让纪念回到陪伴本身。"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {promises.map((promise) => (
              <div
                key={promise}
                className="flex gap-3 rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                <p className="text-sm leading-6 text-night/68">{promise}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-cream/55 py-12 sm:py-14">
        <div className="container-shell">
          <div className="rounded-3xl border border-forest/10 bg-white px-6 py-8 shadow-quiet sm:px-8 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <h2 className="font-serif text-3xl text-forest sm:text-4xl">
                有些话，越早写下，越不容易遗失。
              </h2>
              <p className="mt-4 text-base leading-7 text-night/68">
                离别后的很多细节，会在日常里慢慢变模糊。它喜欢的角落、等你回家的样子、最后一次靠近你的温度，都值得被认真保存下来。
              </p>
            </div>
            <Link
              href="/create"
              className="focus-ring mt-6 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-forest px-6 text-sm font-bold text-cream shadow-quiet hover:bg-night lg:mt-0"
            >
              <Sprout className="h-4 w-4" />
              为它留下一页记忆
            </Link>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-cream/55 py-12 sm:py-16">
        <div className="container-shell">
          <SectionHeader
            eyebrow="常见问题"
            title="关于隐私、公开展示和留言审核。"
            description="这些设置都围绕一个前提：纪念页属于你，是否公开、是否接受留言，都应由你决定。"
          />
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-3xl border border-forest/12 bg-white p-5 shadow-quiet"
              >
                <h3 className="flex gap-3 font-semibold text-forest">
                  <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
                  <span>{faq.question}</span>
                </h3>
                <p className="mt-3 text-sm leading-7 text-night/64">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
