"use client";

import { useEffect, useState } from "react";
import {
  getLocalMemorials,
  updateLocalMemorial
} from "@/lib/local-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { petTypeLabels } from "@/lib/utils";
import type { MemorialRow } from "@/types/database";

type Notice = {
  tone: "success" | "error";
  text: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function AdminMemorialsClient() {
  const [items, setItems] = useState<MemorialRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function loadItems() {
    setIsLoading(true);
    setNotice(null);

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        setItems(
          getLocalMemorials()
            .filter((item) => item.review_status === "pending")
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
        );
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch("/api/memorials?scope=pending");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "公开申请读取失败。");
        }

        setItems(result.memorials || []);
        return;
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("memorials")
        .select("*")
        .eq("review_status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `公开申请读取失败：${message}` });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function reviewMemorial(id: string, approved: boolean) {
    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        updateLocalMemorial(id, {
          review_status: approved ? "approved" : "rejected",
          is_public: approved
        });
        setItems((current) => current.filter((item) => item.id !== id));
        setNotice({ tone: "success", text: approved ? "已通过公开申请。" : "已拒绝公开申请。" });
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const item = items.find((current) => current.id === id);
        if (!item) throw new Error("没有找到这页纪念。");

        const response = await fetch(`/api/memorials/${item.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: approved ? "approved" : "rejected",
            is_public: approved
          })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "审核操作失败。");
        }

        setItems((current) => current.filter((memorial) => memorial.id !== id));
        setNotice({ tone: "success", text: approved ? "已通过公开申请。" : "已拒绝公开申请。" });
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("memorials")
        .update({
          review_status: approved ? "approved" : "rejected",
          is_public: approved
        })
        .eq("id", id);

      if (error) throw error;

      setItems((current) => current.filter((item) => item.id !== id));
      setNotice({ tone: "success", text: approved ? "已通过公开申请。" : "已拒绝公开申请。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `审核操作失败：${message}` });
    }
  }

  return (
    <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-forest">待审核纪念页</h2>
          <p className="mt-2 text-sm leading-6 text-night/58">
            通过后会进入公共记忆花园；拒绝后仍保留为私人纪念页。
          </p>
        </div>
        <button
          type="button"
          onClick={loadItems}
          className="focus-ring w-fit rounded-full border border-forest/12 px-4 py-2 text-xs font-semibold text-forest"
        >
          刷新列表
        </button>
      </div>

      {notice ? (
        <div
          className={`mt-5 rounded-2xl border p-4 text-sm leading-6 ${
            notice.tone === "error"
              ? "border-rosewood/20 bg-rosewood/8 text-rosewood"
              : "border-sage/20 bg-sage/10 text-forest"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {isLoading ? (
          <div className="rounded-3xl border border-forest/10 bg-porcelain p-8 text-center text-sm text-night/58">
            正在读取待审核内容...
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <article
              key={item.id}
              className="grid gap-4 rounded-3xl border border-forest/10 bg-porcelain p-4 md:grid-cols-[120px_1fr_auto]"
            >
              {item.photo_url ? (
                <img
                  src={item.photo_url}
                  alt={`${item.pet_name} 的照片`}
                  className="aspect-square w-full rounded-2xl bg-mist object-cover md:w-[120px]"
                />
              ) : (
                <div className="grid aspect-square w-full place-items-center rounded-2xl bg-mist text-xs text-night/45 md:w-[120px]">
                  无照片
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-serif text-2xl text-forest">{item.pet_name}</h3>
                  <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-semibold text-forest">
                    {petTypeLabels[item.pet_type]}
                  </span>
                  <span className="text-xs text-night/45">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-night/68">
                  {item.story || "未填写故事"}
                </p>
                <p className="mt-3 rounded-2xl bg-cream/55 p-3 text-sm leading-6 text-night/68">
                  {item.message || "未填写想说的话"}
                </p>
              </div>
              <div className="flex flex-wrap content-start gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={() => reviewMemorial(item.id, true)}
                  className="focus-ring rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream"
                >
                  审核通过
                </button>
                <button
                  type="button"
                  onClick={() => reviewMemorial(item.id, false)}
                  className="focus-ring rounded-full bg-rosewood px-4 py-2 text-xs font-semibold text-white"
                >
                  拒绝
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-forest/10 bg-porcelain p-8 text-center text-sm text-night/58">
            当前没有待审核纪念页。
          </div>
        )}
      </div>
    </section>
  );
}
