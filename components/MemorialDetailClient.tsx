"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  Flower2,
  PawPrint,
  QrCode,
  SendHorizontal,
  ShieldCheck
} from "lucide-react";
import {
  createLocalMessage,
  getLocalMemorials,
  getLocalMessages,
  updateLocalMemorial
} from "@/lib/local-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { petTypeLabels, statusTone } from "@/lib/utils";
import type { MemorialRow, MessageRow } from "@/types/database";

interface MemorialDetailClientProps {
  slug: string;
}

type Notice = {
  tone: "success" | "error";
  text: string;
};

function formatDate(date: string | null) {
  if (!date) return "未填写";
  return date.replaceAll("-", ".");
}

function dateRange(memorial: MemorialRow) {
  const start = formatDate(memorial.birth_or_adopted_date);
  const end = formatDate(memorial.passed_date);

  if (start === "未填写" && end === "未填写") {
    return "尚未填写日期";
  }

  return `${start} - ${end}`;
}

function reviewCopy(status: MemorialRow["review_status"]) {
  if (status === "private") {
    return {
      text: "这是私人纪念页，只有获得链接的人可以查看。",
      action: "申请进入公共记忆花园"
    };
  }

  if (status === "pending") {
    return { text: "公开申请审核中", action: null };
  }

  if (status === "approved") {
    return { text: "已进入公共记忆花园", action: null };
  }

  return {
    text: "公开申请未通过，可修改后重新申请",
    action: "重新申请公开"
  };
}

export function MemorialDetailClient({ slug }: MemorialDetailClientProps) {
  const [memorial, setMemorial] = useState<MemorialRow | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [content, setContent] = useState("");
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);

  const status = useMemo(
    () => (memorial ? reviewCopy(memorial.review_status) : null),
    [memorial]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadMemorial() {
      setIsLoading(true);
      setNotice(null);

      try {
        if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
          const localMemorial = getLocalMemorials().find(
            (item) => item.slug === slug
          );

          if (!localMemorial) {
            if (isMounted) {
              setNotFound(true);
              setMemorial(null);
            }
            return;
          }

          const approvedMessages = getLocalMessages()
            .filter(
              (message) =>
                message.memorial_id === localMemorial.id &&
                message.review_status === "approved"
            )
            .sort((a, b) => b.created_at.localeCompare(a.created_at));

          if (isMounted) {
            setMemorial(localMemorial);
            setMessages(approvedMessages);
            setNotFound(false);
          }
          return;
        }

        if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
          const response = await fetch(`/api/memorials/${slug}`);

          if (response.status === 404) {
            if (isMounted) {
              setNotFound(true);
              setMemorial(null);
            }
            return;
          }

          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "页面读取失败。");
          }

          if (isMounted) {
            setMemorial(result.memorial);
            setMessages(result.messages || []);
            setNotFound(false);
          }
          return;
        }

        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("memorials")
          .select("*")
          .eq("slug", slug)
          .single();

        if (error || !data) {
          if (isMounted) {
            setNotFound(true);
            setMemorial(null);
          }
          return;
        }

        const { data: approvedMessages, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .eq("memorial_id", data.id)
          .eq("review_status", "approved")
          .order("created_at", { ascending: false });

        if (messagesError) {
          throw messagesError;
        }

        if (isMounted) {
          setMemorial(data);
          setMessages(approvedMessages || []);
          setNotFound(false);
        }
      } catch (error) {
        if (isMounted) {
          const messageText =
            error instanceof Error ? error.message : "网络异常，请稍后再试。";
          setNotice({ tone: "error", text: `页面读取失败：${messageText}` });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMemorial();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  async function updateInteraction(type: "flower" | "paw_light") {
    if (!memorial) return;

    const storageKey =
      type === "flower"
        ? `pawsmeadow_flower_${slug}`
        : `pawsmeadow_paw_light_${slug}`;

    if (window.localStorage.getItem(storageKey)) {
      setNotice({ tone: "error", text: "你已经为它留下过祝福了。" });
      return;
    }

    const countField = type === "flower" ? "flowers_count" : "paw_lights_count";
    const nextCount = memorial[countField] + 1;

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        const updated = updateLocalMemorial(memorial.id, {
          [countField]: nextCount
        });

        if (!updated) throw new Error("没有找到这页纪念。");

        window.localStorage.setItem(storageKey, "1");
        setMemorial(updated);
        setNotice({
          tone: "success",
          text: type === "flower" ? "这朵花已经留下。" : "小爪印已经点亮。"
        });
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch(`/api/memorials/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [countField]: nextCount })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "祝福没有保存成功。");
        }

        window.localStorage.setItem(storageKey, "1");
        setMemorial(result.memorial);
        setNotice({
          tone: "success",
          text: type === "flower" ? "这朵花已经留下。" : "小爪印已经点亮。"
        });
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("memorials")
        .update({ [countField]: nextCount })
        .eq("id", memorial.id);

      if (error) throw error;

      await supabase.from("interactions").insert({
        memorial_id: memorial.id,
        type,
        visitor_key: storageKey
      });

      window.localStorage.setItem(storageKey, "1");
      setMemorial({ ...memorial, [countField]: nextCount });
      setNotice({
        tone: "success",
        text: type === "flower" ? "这朵花已经留下。" : "小爪印已经点亮。"
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `祝福没有保存成功：${messageText}` });
    }
  }

  async function applyPublicReview() {
    if (!memorial) return;

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        const updated = updateLocalMemorial(memorial.id, {
          review_status: "pending",
          is_public: false
        });

        if (!updated) throw new Error("没有找到这页纪念。");

        setMemorial(updated);
        setNotice({
          tone: "success",
          text: "申请已提交，公开展示前会进行人工审核。"
        });
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch(`/api/memorials/${slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ review_status: "pending", is_public: false })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "公开申请提交失败。");
        }

        setMemorial(result.memorial);
        setNotice({
          tone: "success",
          text: "申请已提交，公开展示前会进行人工审核。"
        });
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("memorials")
        .update({ review_status: "pending", is_public: false })
        .eq("id", memorial.id);

      if (error) throw error;

      setMemorial({ ...memorial, review_status: "pending", is_public: false });
      setNotice({
        tone: "success",
        text: "申请已提交，公开展示前会进行人工审核。"
      });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `公开申请提交失败：${messageText}` });
    }
  }

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memorial) return;

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setNotice({ tone: "error", text: "请先写下留言内容。" });
      return;
    }

    setIsSubmittingMessage(true);
    setNotice(null);

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        createLocalMessage({
          memorial_id: memorial.id,
          visitor_name: visitorName.trim() || null,
          content: trimmedContent
        });

        setVisitorName("");
        setContent("");
        setNotice({ tone: "success", text: "留言已提交，通过审核后会显示。" });
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const response = await fetch(`/api/memorials/${slug}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            visitor_name: visitorName.trim() || null,
            content: trimmedContent
          })
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "留言提交失败。");
        }

        setVisitorName("");
        setContent("");
        setNotice({ tone: "success", text: "留言已提交，通过审核后会显示。" });
        return;
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase.from("messages").insert({
        memorial_id: memorial.id,
        visitor_name: visitorName.trim() || null,
        content: trimmedContent,
        review_status: "pending"
      });

      if (error) throw error;

      setVisitorName("");
      setContent("");
      setNotice({ tone: "success", text: "留言已提交，通过审核后会显示。" });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({ tone: "error", text: `留言提交失败：${messageText}` });
    } finally {
      setIsSubmittingMessage(false);
    }
  }

  if (isLoading) {
    return (
      <main className="bg-grain-soft">
        <section className="container-shell py-12">
          <div className="rounded-3xl border border-forest/10 bg-white p-8 text-center text-sm text-night/58 shadow-quiet">
            正在打开这页记忆...
          </div>
        </section>
      </main>
    );
  }

  if (notFound || !memorial) {
    return (
      <main className="bg-grain-soft">
        <section className="container-shell py-12">
          <div className="rounded-3xl border border-forest/10 bg-white p-8 text-center shadow-quiet">
            <h1 className="font-serif text-3xl text-forest">没有找到这页纪念。</h1>
            <p className="mt-3 text-sm leading-6 text-night/58">
              也许链接有误，或者这一页已经不再开放访问。
            </p>
            <Link
              href="/create"
              className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream"
            >
              创建纪念页
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bg-grain-soft">
      <section className="container-shell py-8 sm:py-12">
        <Link
          href="/garden"
          className="focus-ring mb-5 inline-flex min-h-10 items-center gap-2 rounded-full border border-forest/12 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/30"
        >
          <ChevronLeft className="h-4 w-4" />
          返回公共记忆花园
        </Link>

        {notice ? (
          <div
            className={`mb-5 rounded-3xl border p-4 text-sm leading-6 ${
              notice.tone === "error"
                ? "border-rosewood/20 bg-rosewood/8 text-rosewood"
                : "border-sage/20 bg-sage/10 text-forest"
            }`}
          >
            {notice.text}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <aside className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
            {memorial.photo_url ? (
              <img
                src={memorial.photo_url}
                alt={`${memorial.pet_name} 的照片`}
                className="aspect-square w-full rounded-3xl bg-mist object-cover"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center rounded-3xl bg-mist text-sm text-night/45">
                照片暂未显示
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => updateInteraction("flower")}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-night shadow-quiet transition hover:brightness-105"
              >
                <Flower2 className="h-5 w-5" />
                献花 {memorial.flowers_count}
              </button>
              <button
                type="button"
                onClick={() => updateInteraction("paw_light")}
                className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-cream shadow-quiet transition hover:bg-night"
              >
                <PawPrint className="h-5 w-5" />
                点亮小爪印 {memorial.paw_lights_count}
              </button>
            </div>
            <div className="mt-5 rounded-3xl border border-forest/10 bg-porcelain p-4">
              <div className="flex items-center gap-3">
                <img
                  src="/images/qr-placeholder.svg"
                  alt="分享二维码区域"
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
                  {petTypeLabels[memorial.pet_type]}
                </span>
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusTone(
                    memorial.review_status
                  )}`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  {status?.text}
                </span>
              </div>
              <h1 className="mt-4 font-serif text-4xl text-forest sm:text-5xl">
                {memorial.pet_name}
              </h1>
              <div className="mt-4 grid gap-3 text-sm text-night/62 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sage" />
                  陪伴时间：{dateRange(memorial)}
                </p>
                <p>去星星上的日子：{formatDate(memorial.passed_date)}</p>
              </div>
              {status?.action ? (
                <button
                  type="button"
                  onClick={applyPublicReview}
                  className="focus-ring mt-5 inline-flex min-h-11 items-center rounded-full bg-forest px-5 text-sm font-semibold text-cream transition hover:bg-night"
                >
                  {status.action}
                </button>
              ) : null}
              <div className="mt-7 space-y-6">
                <section>
                  <h2 className="font-serif text-2xl text-forest">它的故事</h2>
                  <p className="mt-3 whitespace-pre-line text-base leading-8 text-night/70">
                    {memorial.story || "这段记忆还在心里慢慢整理。"}
                  </p>
                </section>
                <section>
                  <h2 className="font-serif text-2xl text-forest">想对它说的话</h2>
                  <p className="mt-3 whitespace-pre-line rounded-3xl bg-cream/58 p-5 text-base leading-8 text-night/72">
                    {memorial.message || "有些话会一直留在心里。"}
                  </p>
                </section>
              </div>
            </article>

            <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
              <div className="mb-5">
                <h2 className="font-serif text-2xl text-forest">留言祝福</h2>
                <p className="mt-2 text-sm leading-6 text-night/60">
                  留言会先进入待审核状态，通过后再显示。
                </p>
              </div>
              {memorial.allow_messages ? (
                <form onSubmit={submitMessage} className="space-y-3">
                  <input
                    value={visitorName}
                    onChange={(event) => setVisitorName(event.target.value)}
                    placeholder="你的称呼"
                    className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm text-night placeholder:text-night/38"
                  />
                  <textarea
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    placeholder="留下一句温柔祝福"
                    className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-forest/12 bg-porcelain px-4 py-3 text-sm leading-6 text-night placeholder:text-night/38"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingMessage}
                    className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-night disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                  >
                    <SendHorizontal className="h-4 w-4" />
                    {isSubmittingMessage ? "正在提交..." : "提交留言"}
                  </button>
                </form>
              ) : (
                <div className="rounded-2xl border border-forest/10 bg-cream/45 p-4 text-sm text-night/62">
                  主人暂时关闭了留言。
                </div>
              )}

              <div className="mt-6 space-y-3">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <article
                      key={message.id}
                      className="rounded-2xl border border-forest/10 bg-cream/45 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-forest">
                          {message.visitor_name || "温柔的访客"}
                        </p>
                        <span className="text-xs text-night/45">
                          {formatDate(message.created_at.slice(0, 10))}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-line text-sm leading-6 text-night/68">
                        {message.content}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-forest/10 bg-porcelain p-4 text-sm text-night/55">
                    还没有公开显示的留言。
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
