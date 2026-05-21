"use client";

import { useEffect, useState } from "react";
import {
  getLocalMemorials,
  getLocalMessages,
  updateLocalMessage
} from "@/lib/local-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { MemorialRow, MessageRow } from "@/types/database";

type PendingMessage = MessageRow & {
  pet_name: string;
};

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

export function AdminMessagesClient() {
  const [items, setItems] = useState<PendingMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function loadItems() {
    setIsLoading(true);
    setNotice(null);

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        const memorialMap = getLocalMemorials().reduce<Record<string, MemorialRow>>(
          (acc, memorial) => {
            acc[memorial.id] = memorial;
            return acc;
          },
          {}
        );

        setItems(
          getLocalMessages()
            .filter((item) => item.review_status === "pending")
            .sort((a, b) => a.created_at.localeCompare(b.created_at))
            .map((message) => ({
              ...message,
              pet_name: memorialMap[message.memorial_id]?.pet_name || "未知纪念页"
            }))
        );
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch("/api/messages?status=pending");
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "留言读取失败。");
        }

        setItems(result.messages || []);
        return;
      }

      const supabase = getSupabaseClient();
      const { data: messages, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("review_status", "pending")
        .order("created_at", { ascending: true });

      if (messageError) throw messageError;

      const memorialIds = [...new Set((messages || []).map((item) => item.memorial_id))];
      let memorialMap: Record<string, MemorialRow> = {};

      if (memorialIds.length > 0) {
        const { data: memorials, error: memorialError } = await supabase
          .from("memorials")
          .select("*")
          .in("id", memorialIds);

        if (memorialError) throw memorialError;

        memorialMap = (memorials || []).reduce<Record<string, MemorialRow>>(
          (acc, memorial) => {
            acc[memorial.id] = memorial;
            return acc;
          },
          {}
        );
      }

      setItems(
        (messages || []).map((message) => ({
          ...message,
          pet_name: memorialMap[message.memorial_id]?.pet_name || "未知纪念页"
        }))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `留言读取失败：${message}` });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function reviewMessage(id: string, approved: boolean) {
    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        updateLocalMessage(id, {
          review_status: approved ? "approved" : "rejected"
        });
        setItems((current) => current.filter((item) => item.id !== id));
        setNotice({ tone: "success", text: approved ? "留言已通过。" : "留言已拒绝。" });
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch(`/api/messages/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            review_status: approved ? "approved" : "rejected"
          })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "审核操作失败。");
        }

        setItems((current) => current.filter((item) => item.id !== id));
        setNotice({ tone: "success", text: approved ? "留言已通过。" : "留言已拒绝。" });
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("messages")
        .update({ review_status: approved ? "approved" : "rejected" })
        .eq("id", id);

      if (error) throw error;

      setItems((current) => current.filter((item) => item.id !== id));
      setNotice({ tone: "success", text: approved ? "留言已通过。" : "留言已拒绝。" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `审核操作失败：${message}` });
    }
  }

  return (
    <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl text-forest">待审核留言</h2>
          <p className="mt-2 text-sm leading-6 text-night/58">
            通过后的留言才会显示在对应纪念页中。
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

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="rounded-3xl border border-forest/10 bg-porcelain p-8 text-center text-sm text-night/58">
            正在读取待审核留言...
          </div>
        ) : items.length > 0 ? (
          items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-forest/10 bg-porcelain p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-semibold text-forest">
                    {item.pet_name}
                    <span className="ml-2 text-xs font-normal text-night/45">
                      {formatDate(item.created_at)}
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-night/52">
                    {item.visitor_name || "温柔的访客"}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-night/68">
                    {item.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => reviewMessage(item.id, true)}
                    className="focus-ring rounded-full bg-forest px-4 py-2 text-xs font-semibold text-cream"
                  >
                    通过
                  </button>
                  <button
                    type="button"
                    onClick={() => reviewMessage(item.id, false)}
                    className="focus-ring rounded-full bg-rosewood px-4 py-2 text-xs font-semibold text-white"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-3xl border border-forest/10 bg-porcelain p-8 text-center text-sm text-night/58">
            当前没有待审核留言。
          </div>
        )}
      </div>
    </section>
  );
}
