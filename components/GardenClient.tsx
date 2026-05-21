"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flower2, MessageCircle, PawPrint, Sprout } from "lucide-react";
import { getLocalMemorials, getLocalMessages } from "@/lib/local-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { petTypeLabels } from "@/lib/utils";
import type { MemorialRow, PetType } from "@/types/database";
import { PetTypeFilter } from "@/components/PetTypeFilter";

type GardenCard = MemorialRow & {
  approved_messages_count: number;
};

function formatDate(date: string | null) {
  return date ? date.replaceAll("-", ".") : "日期未填写";
}

function dateRange(memorial: MemorialRow) {
  if (!memorial.birth_or_adopted_date && !memorial.passed_date) {
    return "日期未填写";
  }

  return `${formatDate(memorial.birth_or_adopted_date)} - ${formatDate(
    memorial.passed_date
  )}`;
}

export function GardenClient() {
  const [filter, setFilter] = useState<PetType | "all">("all");
  const [memorials, setMemorials] = useState<GardenCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadGarden() {
      setIsLoading(true);
      setError("");

      try {
        if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
          const approvedMessages = getLocalMessages().filter(
            (message) => message.review_status === "approved"
          );
          const counts = approvedMessages.reduce<Record<string, number>>(
            (acc, message) => {
              acc[message.memorial_id] = (acc[message.memorial_id] || 0) + 1;
              return acc;
            },
            {}
          );

          const localMemorials = getLocalMemorials()
            .filter(
              (item) => item.review_status === "approved" && item.is_public
            )
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .map((item) => ({
              ...item,
              approved_messages_count: counts[item.id] || 0
            }));

          if (isMounted) {
            setMemorials(localMemorials);
          }
          return;
        }

        if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
          const response = await fetch("/api/memorials?scope=public");
          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || "公共记忆花园暂时无法打开。");
          }

          if (isMounted) {
            setMemorials(result.memorials || []);
          }
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error: memorialError } = await supabase
          .from("memorials")
          .select("*")
          .eq("review_status", "approved")
          .eq("is_public", true)
          .order("created_at", { ascending: false });

        if (memorialError) throw memorialError;

        const ids = (data || []).map((item) => item.id);
        let counts: Record<string, number> = {};

        if (ids.length > 0) {
          const { data: approvedMessages, error: messageError } = await supabase
            .from("messages")
            .select("memorial_id")
            .in("memorial_id", ids)
            .eq("review_status", "approved");

          if (messageError) throw messageError;

          counts = (approvedMessages || []).reduce<Record<string, number>>(
            (acc, message) => {
              acc[message.memorial_id] = (acc[message.memorial_id] || 0) + 1;
              return acc;
            },
            {}
          );
        }

        if (isMounted) {
          setMemorials(
            (data || []).map((item) => ({
              ...item,
              approved_messages_count: counts[item.id] || 0
            }))
          );
        }
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "网络异常，请稍后再试。";
          setError(`公共记忆花园暂时无法打开：${message}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGarden();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleMemorials = useMemo(() => {
    return memorials.filter(
      (memorial) => filter === "all" || memorial.pet_type === filter
    );
  }, [filter, memorials]);

  return (
    <div className="space-y-8">
      <PetTypeFilter value={filter} onChange={setFilter} />
      {error ? (
        <div className="rounded-3xl border border-rosewood/20 bg-rosewood/8 p-5 text-sm leading-6 text-rosewood shadow-quiet">
          {error}
        </div>
      ) : null}
      {isLoading ? (
        <div className="rounded-3xl border border-forest/10 bg-white p-8 text-center text-sm text-night/58 shadow-quiet">
          正在整理这片记忆花园...
        </div>
      ) : visibleMemorials.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleMemorials.map((memorial) => (
            <article
              key={memorial.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-forest/10 bg-white shadow-quiet transition hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="relative">
                {memorial.photo_url ? (
                  <img
                    src={memorial.photo_url}
                    alt={`${memorial.pet_name} 的照片`}
                    className="aspect-[16/8.8] w-full bg-mist object-cover saturate-[0.9]"
                  />
                ) : (
                  <div className="grid aspect-[16/8.8] w-full place-items-center bg-mist text-sm text-night/45">
                    照片暂未显示
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/82 px-2.5 py-1 text-[11px] font-medium text-forest/76 backdrop-blur">
                  {petTypeLabels[memorial.pet_type]}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="font-serif text-[1.45rem] text-forest">
                  {memorial.pet_name}
                </h3>
                <p className="mt-1 text-xs text-night/54">{dateRange(memorial)}</p>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-night/68">
                  {memorial.story || "这段记忆安静地保存在这里。"}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-night/42">
                  <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
                    <Flower2 className="h-3.5 w-3.5 text-gold/65" />
                    {memorial.flowers_count} 献花
                  </span>
                  <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
                    <PawPrint className="h-3.5 w-3.5 text-forest/55" />
                    {memorial.paw_lights_count} 点亮
                  </span>
                  <span className="inline-flex items-center justify-center gap-1 rounded-full border border-forest/8 bg-cream/20 px-2 py-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-sage/65" />
                    {memorial.approved_messages_count} 留言
                  </span>
                </div>
                <Link
                  href={`/memorial/${memorial.slug}`}
                  className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-night"
                >
                  查看纪念页
                </Link>
                <p className="mt-2.5 text-center text-[11px] text-night/40">
                  公共展示内容已经过审核
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-forest/10 bg-white p-8 text-center shadow-quiet">
          <p className="font-serif text-2xl text-forest">
            这片记忆花园还在等待第一位被温柔记住的毛孩子。
          </p>
          <Link
            href="/create"
            className="focus-ring mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-cream"
          >
            <Sprout className="h-4 w-4" />
            创建纪念页
          </Link>
        </div>
      )}
    </div>
  );
}
