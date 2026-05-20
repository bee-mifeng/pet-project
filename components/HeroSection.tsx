import Link from "next/link";
import { ArrowRight, Flower2, LockKeyhole, MessageCircle, PawPrint, QrCode, Sprout } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[74svh] overflow-hidden border-b border-forest/10 bg-cream">
      <img
        src="/images/hero-meadow.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-porcelain/82 via-porcelain/66 to-cream/92" />
      <div className="container-shell relative grid min-h-[74svh] items-center gap-10 py-12 lg:grid-cols-[minmax(0,0.96fr)_380px] lg:py-14">
        <div className="max-w-[660px]">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-forest/12 bg-white/62 px-3 py-2 text-sm font-medium text-forest shadow-quiet">
            <Sprout className="h-4 w-4 text-gold" />
            PawsMeadow 毛孩子记忆花园
          </p>
          <h1 className="max-w-[620px] font-serif text-[2.45rem] leading-tight text-forest sm:text-5xl">
            为离开的毛孩子，创建一页温柔的纪念空间。
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-night/72">
            保存它的照片、故事和你想说的话。你可以选择仅自己查看，也可以申请进入公共记忆花园，让它被看见、被祝福、被温柔记住。
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-6 text-base font-semibold text-cream shadow-soft transition hover:bg-night"
            >
              创建纪念页
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/meadow"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest/20 bg-white/76 px-6 text-base font-semibold text-forest transition hover:border-forest/40 hover:bg-white"
            >
              <Flower2 className="h-5 w-5 text-gold" />
              浏览记忆花园
            </Link>
          </div>
          <p className="mt-3 text-sm leading-6 text-night/58">
            免费创建私人纪念页，是否公开由你决定。
          </p>
        </div>

        <div className="rounded-[28px] border border-white/80 bg-white/68 p-4 shadow-soft backdrop-blur md:p-5">
          <div className="overflow-hidden rounded-[24px] border border-forest/10 bg-porcelain">
            <img
              src="/images/pets/xiaoju.svg"
              alt="纪念页预览头像"
              className="aspect-[16/11] w-full bg-mist object-cover"
            />
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/10 bg-white px-3 py-1 text-xs font-semibold text-forest">
                  <LockKeyhole className="h-3.5 w-3.5 text-sage" />
                  私人纪念页预览
                </span>
                <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-medium text-forest/72">
                  未公开
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-[1.7rem] text-forest">小橘</p>
                  <p className="mt-1 text-xs text-night/50">2018.09 - 2026.01</p>
                </div>
                <span className="rounded-full border border-forest/10 bg-white px-3 py-1 text-xs font-semibold text-forest">
                  猫咪
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-night/68">
                它把窗台当作自己的小剧场，也把许多安静的日子留在了家里。这里先为它保存下来，是否分享给别人，之后再慢慢决定。
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] text-night/52">
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/10 bg-white px-2 py-2">
                  <Flower2 className="h-3.5 w-3.5 text-gold" />
                  献花
                </span>
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/10 bg-white px-2 py-2">
                  <PawPrint className="h-3.5 w-3.5 text-forest" />
                  点亮
                </span>
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/10 bg-white px-2 py-2">
                  <MessageCircle className="h-3.5 w-3.5 text-sage" />
                  留言
                </span>
              </div>
              <div className="mt-5 flex items-center gap-3 rounded-2xl border border-forest/10 bg-white p-3">
                <img
                  src="/images/qr-placeholder.svg"
                  alt="纪念页二维码预览"
                  className="h-14 w-14 rounded-xl"
                />
                <p className="inline-flex items-center gap-2 text-xs leading-5 text-night/58">
                  <QrCode className="h-4 w-4 text-forest" />
                  可分享给亲友，也可用于纪念卡片。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
