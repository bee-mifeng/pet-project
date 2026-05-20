"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff, ShieldCheck, X } from "lucide-react";
import { comments as initialComments, memorials as initialMemorials } from "@/data/memorials";
import type { Memorial, MemorialComment, ReviewStatus } from "@/types";
import { cn, petTypeLabels, statusLabels, statusTone } from "@/lib/utils";

type AdminMemorial = Memorial & { hidden?: boolean };
type AdminComment = MemorialComment & { hidden?: boolean };

const statusTabs: Array<{ key: ReviewStatus; label: string }> = [
  { key: "pending", label: "待审核纪念页" },
  { key: "approved", label: "已通过纪念页" },
  { key: "rejected", label: "已拒绝纪念页" }
];

export function AdminReviewTable() {
  const [items, setItems] = useState<AdminMemorial[]>(initialMemorials);
  const [reviewComments, setReviewComments] =
    useState<AdminComment[]>(initialComments);
  const [activeStatus, setActiveStatus] = useState<ReviewStatus>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusCounts = useMemo(() => {
    return statusTabs.reduce<Record<ReviewStatus, number>>(
      (acc, tab) => {
        acc[tab.key] = items.filter(
          (item) => item.status === tab.key && !item.hidden
        ).length;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 }
    );
  }, [items]);

  const visibleItems = items.filter(
    (item) => item.status === activeStatus && !item.hidden
  );

  const pendingComments = reviewComments.filter(
    (comment) => comment.status === "pending" && !comment.hidden
  );

  function updateMemorial(id: string, status: ReviewStatus) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status } : item))
    );
  }

  function hideMemorial(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, hidden: true } : item))
    );
  }

  function updateComment(id: string, status: ReviewStatus) {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === id ? { ...comment, status } : comment
      )
    );
  }

  function hideComment(id: string) {
    setReviewComments((current) =>
      current.map((comment) =>
        comment.id === id ? { ...comment, hidden: true } : comment
      )
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl text-forest">纪念页审核</h2>
            <p className="mt-2 text-sm text-night/58">
              第一版为前端状态切换，用于演示公开前审核流。
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gold/12 px-3 py-2 text-xs font-semibold text-night">
            <ShieldCheck className="h-4 w-4 text-gold" />
            公开展示需审核通过
          </span>
        </div>
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatus(tab.key)}
              className={cn(
                "focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition",
                activeStatus === tab.key
                  ? "border-forest bg-forest text-cream"
                  : "border-forest/12 bg-porcelain text-night/64 hover:border-forest/30"
              )}
            >
              {tab.label} · {statusCounts[tab.key]}
            </button>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-forest/10">
          <div className="hidden grid-cols-[1fr_120px_120px_220px] gap-4 bg-cream/70 px-4 py-3 text-xs font-bold text-forest md:grid">
            <span>内容</span>
            <span>类型</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          <div className="divide-y divide-forest/10">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => (
                <article
                  key={item.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_120px_120px_220px] md:items-center"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.avatar}
                      alt=""
                      className="h-14 w-14 rounded-2xl bg-mist object-cover"
                    />
                    <div>
                      <p className="font-semibold text-forest">{item.name}</p>
                      <p className="mt-1 line-clamp-2 text-sm leading-5 text-night/58">
                        {item.story}
                      </p>
                      {expandedId === item.id ? (
                        <p className="mt-2 rounded-2xl bg-cream/60 p-3 text-xs leading-5 text-night/62">
                          想说的话：{item.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="text-sm text-night/62">
                    {petTypeLabels[item.type]}
                  </span>
                  <span
                    className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(
                      item.status
                    )}`}
                  >
                    {statusLabels[item.status]}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateMemorial(item.id, "approved")}
                      className="focus-ring rounded-full bg-forest px-3 py-2 text-xs font-semibold text-cream"
                    >
                      通过
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMemorial(item.id, "rejected")}
                      className="focus-ring rounded-full bg-rosewood px-3 py-2 text-xs font-semibold text-white"
                    >
                      拒绝
                    </button>
                    <button
                      type="button"
                      onClick={() => hideMemorial(item.id)}
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-forest/12 px-3 py-2 text-xs font-semibold text-night/64"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      隐藏
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === item.id ? null : item.id
                        )
                      }
                      className="focus-ring inline-flex items-center gap-1 rounded-full border border-forest/12 px-3 py-2 text-xs font-semibold text-forest"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      查看详情
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-night/58">
                当前列表没有可审核内容。
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
        <h2 className="font-serif text-2xl text-forest">待审核留言列表</h2>
        <p className="mt-2 text-sm text-night/58">
          留言通过后才会在公开纪念页显示。
        </p>
        <div className="mt-5 space-y-3">
          {pendingComments.length > 0 ? (
            pendingComments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-3xl border border-forest/10 bg-porcelain p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold text-forest">
                      {comment.author}
                      <span className="ml-2 text-xs font-normal text-night/45">
                        {comment.createdAt}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-night/68">
                      {comment.content}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateComment(comment.id, "approved")}
                      className="focus-ring rounded-full bg-forest px-3 py-2 text-xs font-semibold text-cream"
                    >
                      通过
                    </button>
                    <button
                      type="button"
                      onClick={() => updateComment(comment.id, "rejected")}
                      className="focus-ring inline-flex items-center gap-1 rounded-full bg-rosewood px-3 py-2 text-xs font-semibold text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                      拒绝
                    </button>
                    <button
                      type="button"
                      onClick={() => hideComment(comment.id)}
                      className="focus-ring rounded-full border border-forest/12 px-3 py-2 text-xs font-semibold text-night/64"
                    >
                      隐藏
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
    </div>
  );
}
