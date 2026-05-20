"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, QrCode, ShieldCheck } from "lucide-react";
import { comments } from "@/data/memorials";
import { petTypeLabels } from "@/lib/utils";
import type { Memorial } from "@/types";
import { CommentBox } from "@/components/CommentBox";
import { FlowerButton } from "@/components/FlowerButton";
import { PawLightButton } from "@/components/PawLightButton";

interface MemorialDetailClientProps {
  memorial: Memorial;
  created?: boolean;
}

export function MemorialDetailClient({
  memorial,
  created = false
}: MemorialDetailClientProps) {
  const [flowerCount, setFlowerCount] = useState(memorial.flowersCount);
  const [pawCount, setPawCount] = useState(memorial.pawLightsCount);

  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-8 sm:py-12">
        <Link
          href="/meadow"
          className="focus-ring mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-forest/12 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/30"
        >
          <ChevronLeft className="h-4 w-4" />
          返回公共记忆花园
        </Link>
        {created ? (
          <div className="mb-5 rounded-3xl border border-gold/30 bg-gold/12 p-4 text-sm leading-6 text-night">
            纪念页预览已生成。你可以继续检查内容，再决定是否保存或申请公开展示。
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <aside className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
            <img
              src={memorial.avatar}
              alt={`${memorial.name} 的占位头像`}
              className="aspect-square w-full rounded-3xl bg-mist object-cover"
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <FlowerButton
                count={flowerCount}
                onClick={() => setFlowerCount((count) => count + 1)}
              />
              <PawLightButton
                count={pawCount}
                onClick={() => setPawCount((count) => count + 1)}
              />
            </div>
            <div className="mt-5 rounded-3xl border border-forest/10 bg-porcelain p-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/qr-placeholder.svg"
                  alt="分享二维码占位图"
                  className="h-24 w-24 rounded-2xl bg-white"
                />
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-forest">
                    <QrCode className="h-4 w-4" />
                    分享二维码
                  </p>
                  <p className="mt-2 text-xs leading-5 text-night/58">
                    亲友可通过二维码打开这一页，也可用于纪念卡片。
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-6">
            <article className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-7">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">
                  {petTypeLabels[memorial.type]}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-gold/12 px-3 py-1 text-xs font-bold text-night">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  {memorial.isPublic ? "申请公开展示" : "私密纪念页"}
                </span>
              </div>
              <h1 className="mt-4 font-serif text-4xl text-forest sm:text-5xl">
                {memorial.name}
              </h1>
              <div className="mt-4 grid gap-3 text-sm text-night/62 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sage" />
                  陪伴时间：{memorial.years}
                </p>
                <p>离开日期：{memorial.departedDate}</p>
              </div>
              <div className="mt-7 space-y-6">
                <section>
                  <h2 className="font-serif text-2xl text-forest">它的故事</h2>
                  <p className="mt-3 text-base leading-8 text-night/70">
                    {memorial.story}
                  </p>
                </section>
                <section>
                  <h2 className="font-serif text-2xl text-forest">想对它说的话</h2>
                  <p className="mt-3 rounded-3xl bg-cream/58 p-5 text-base leading-8 text-night/72">
                    {memorial.message}
                  </p>
                </section>
              </div>
            </article>

            <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
              <h2 className="font-serif text-2xl text-forest">照片墙</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {memorial.gallery.map((image, index) => (
                  <img
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${memorial.name} 的照片占位 ${index + 1}`}
                    className="aspect-square rounded-2xl bg-mist object-cover"
                  />
                ))}
              </div>
            </section>

            <CommentBox
              memorialId={memorial.id}
              initialComments={comments.filter(
                (comment) => comment.memorialId === memorial.id
              )}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
