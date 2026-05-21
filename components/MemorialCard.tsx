import Link from "next/link";
import { Flower2, MessageCircle, PawPrint } from "lucide-react";
import type { Memorial } from "@/types";
import { petTypeLabels } from "@/lib/utils";

interface MemorialCardProps {
  memorial: Memorial;
  compact?: boolean;
}

export function MemorialCard({ memorial, compact = false }: MemorialCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-quiet transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="relative">
        <img
          src={memorial.avatar}
          alt={`${memorial.name} 的占位头像`}
          className="aspect-[16/8.8] w-full bg-mist object-cover saturate-[0.86]"
        />
        <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/82 px-2.5 py-1 text-[11px] font-medium text-forest/76 backdrop-blur">
          {petTypeLabels[memorial.type]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-[1.45rem] text-forest">{memorial.name}</h3>
            <p className="mt-1 text-xs text-night/54">{memorial.years}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-4 text-sm leading-6 text-night/68">
          {memorial.story}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-night/42">
          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
            <Flower2 className="h-3.5 w-3.5 text-gold/65" />
            {memorial.flowersCount} 献花
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
            <PawPrint className="h-3.5 w-3.5 text-forest/55" />
            {memorial.pawLightsCount} 点亮
          </span>
          <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
            <MessageCircle className="h-3.5 w-3.5 text-sage/65" />
            {memorial.commentsCount} 留言
          </span>
        </div>
        <Link
          href="/garden"
          className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-night"
        >
          进入记忆花园
        </Link>
        {!compact ? (
          <p className="mt-2.5 text-center text-[11px] text-night/40">
            公共展示内容已经过平台审核
          </p>
        ) : null}
      </div>
    </article>
  );
}
