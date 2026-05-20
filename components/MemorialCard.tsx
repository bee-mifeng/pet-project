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
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest/12 bg-white shadow-quiet transition hover:-translate-y-1 hover:shadow-soft">
      <div className="relative">
        <img
          src={memorial.avatar}
          alt={`${memorial.name} 的占位头像`}
          className="aspect-[16/10] w-full bg-mist object-cover"
        />
        <span className="absolute left-4 top-4 rounded-full border border-white/70 bg-white/82 px-3 py-1 text-xs font-semibold text-forest backdrop-blur">
          {petTypeLabels[memorial.type]}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-2xl text-forest">{memorial.name}</h3>
            <p className="mt-1 text-sm text-night/54">{memorial.years}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-night/68">
          {memorial.story}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-[11px] text-night/48">
          <span className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-forest/10 bg-cream/30 px-2 py-2">
            <Flower2 className="h-3.5 w-3.5 text-gold/80" />
            {memorial.flowersCount} 献花
          </span>
          <span className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-forest/10 bg-cream/30 px-2 py-2">
            <PawPrint className="h-3.5 w-3.5 text-forest/70" />
            {memorial.pawLightsCount} 点亮
          </span>
          <span className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-forest/10 bg-cream/30 px-2 py-2">
            <MessageCircle className="h-3.5 w-3.5 text-sage/80" />
            {memorial.commentsCount} 留言
          </span>
        </div>
        <Link
          href={`/memorial/${memorial.id}`}
          className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-night"
        >
          查看纪念页
        </Link>
        {!compact ? (
          <p className="mt-3 text-center text-xs text-night/45">
            公共展示内容已经过平台审核
          </p>
        ) : null}
      </div>
    </article>
  );
}
