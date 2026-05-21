import Link from "next/link";
import { ArrowRight, Flower2, LockKeyhole, MessageCircle, PawPrint, QrCode, ShieldCheck, Sprout } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-[74svh] overflow-hidden border-b border-forest/10 bg-cream">
      <img
        src="/images/hero-meadow.svg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-bottom"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-porcelain/82 via-porcelain/66 to-cream/92" />
      <div className="container-shell relative grid min-h-[74svh] items-center gap-8 py-9 lg:grid-cols-[minmax(0,0.92fr)_370px] lg:gap-10 lg:py-11">
        <div className="max-w-[640px]">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-forest/10 bg-white/62 px-3 py-1.5 text-sm font-medium text-forest shadow-quiet">
            <Sprout className="h-4 w-4 text-gold" />
            PawsMeadow 毛孩子记忆花园
          </p>
          <h1 className="max-w-[590px] font-serif text-[2.05rem] leading-[1.14] text-forest sm:text-[clamp(2.65rem,4.2vw,4.4rem)] lg:text-[clamp(3.05rem,4vw,4.45rem)]">
            为离开的毛孩子，创建一页温柔的纪念空间。
          </h1>
          <p className="mt-6 max-w-[620px] text-base leading-8 text-night/72 sm:text-lg">
            保存它的照片、故事和你想说的话。你可以只留给自己和亲友查看，也可以申请进入公共记忆花园，让它被看见、被祝福、被温柔记住。
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
              href="/garden"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-forest/20 bg-white/76 px-6 text-base font-semibold text-forest transition hover:border-forest/40 hover:bg-white"
            >
              <Flower2 className="h-5 w-5 text-gold" />
              浏览记忆花园
            </Link>
          </div>
          <p className="mt-3 inline-flex items-center gap-2 text-[13px] leading-6 text-sage sm:text-sm">
            <ShieldCheck className="h-4 w-4 text-sage" />
            免费创建私人纪念页，是否公开由你决定。
          </p>
        </div>

        <div className="rounded-[26px] border border-white/80 bg-white/60 p-3 shadow-quiet backdrop-blur md:p-3.5">
          <div className="overflow-hidden rounded-[22px] border border-forest/8 bg-porcelain">
            <img
              src="/images/pets/xiaoju-photo.png"
              alt="纪念页预览头像"
              className="aspect-[16/10.5] w-full bg-mist object-cover saturate-[0.82]"
            />
            <div className="p-4">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/10 bg-white/82 px-2.5 py-1 text-[11px] font-medium text-forest/76">
                  <LockKeyhole className="h-3 w-3 text-sage" />
                  私人纪念页预览
                </span>
                <span className="rounded-full bg-forest/8 px-2.5 py-1 text-[11px] font-medium text-forest/62">
                  未公开
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-[1.6rem] text-forest">小橘</p>
                  <p className="mt-1 text-xs text-night/50">2018.09 - 2026.01</p>
                </div>
                <span className="rounded-full border border-forest/10 bg-white/74 px-2.5 py-1 text-[11px] font-medium text-forest/70">
                  猫咪
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-night/68">
                它把窗台当作自己的小剧场，也把许多安静的日子留在了家里。这里先为它保存下来，是否分享给别人，之后再慢慢决定。
              </p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] text-night/45">
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-white/58 px-2 py-1.5">
                  <Flower2 className="h-3.5 w-3.5 text-gold/70" />
                  献花
                </span>
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-white/58 px-2 py-1.5">
                  <PawPrint className="h-3.5 w-3.5 text-forest/58" />
                  点亮
                </span>
                <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-white/58 px-2 py-1.5">
                  <MessageCircle className="h-3.5 w-3.5 text-sage/70" />
                  留言
                </span>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-forest/8 bg-white/70 p-2.5">
                <img
                  src="/images/qr-placeholder.svg"
                  alt="纪念页二维码预览"
                  className="h-11 w-11 rounded-lg opacity-82"
                />
                <p className="inline-flex items-center gap-2 text-[11px] leading-5 text-night/52">
                  <QrCode className="h-3.5 w-3.5 text-forest/70" />
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
