"use client";

import { useMemo, useState } from "react";
import { SendHorizontal } from "lucide-react";
import type { MemorialComment } from "@/types";
import { statusLabels, statusTone } from "@/lib/utils";

interface CommentBoxProps {
  initialComments: MemorialComment[];
  memorialId: string;
}

export function CommentBox({ initialComments, memorialId }: CommentBoxProps) {
  const [comments, setComments] = useState(initialComments);
  const [author, setAuthor] = useState("");
  const [content, setContent] = useState("");

  const visibleComments = useMemo(
    () => comments.filter((comment) => comment.memorialId === memorialId),
    [comments, memorialId]
  );

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    setComments((current) => [
      {
        id: `local-${Date.now()}`,
        memorialId,
        author: author.trim() || "温柔的访客",
        content: trimmedContent,
        createdAt: new Date().toISOString().slice(0, 10),
        status: "pending"
      },
      ...current
    ]);
    setAuthor("");
    setContent("");
  }

  return (
    <section className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
      <div className="mb-5">
        <h2 className="font-serif text-2xl text-forest">留言祝福</h2>
        <p className="mt-2 text-sm leading-6 text-night/60">
          留言会先进入待审核状态，通过后再公开显示。
        </p>
      </div>
      <form onSubmit={submitComment} className="space-y-3">
        <input
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
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
          className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-cream transition hover:bg-night sm:w-auto"
        >
          <SendHorizontal className="h-4 w-4" />
          提交留言
        </button>
      </form>
      <div className="mt-6 space-y-3">
        {visibleComments.map((comment) => (
          <article
            key={comment.id}
            className="rounded-2xl border border-forest/10 bg-cream/45 p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-forest">{comment.author}</p>
              <span
                className={`rounded-full px-2 py-1 text-xs ring-1 ${statusTone(
                  comment.status
                )}`}
              >
                {comment.status === "pending" ? "留言待审核" : statusLabels[comment.status]}
              </span>
              <span className="text-xs text-night/45">{comment.createdAt}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-night/68">{comment.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
