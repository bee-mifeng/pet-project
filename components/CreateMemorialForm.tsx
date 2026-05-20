"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus } from "lucide-react";
import type { PetType } from "@/types";
import { petTypeLabels } from "@/lib/utils";

const petTypes: PetType[] = ["cat", "dog", "other"];

export function CreateMemorialForm() {
  const router = useRouter();
  const [petType, setPetType] = useState<PetType>("cat");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackAvatar = useMemo(() => {
    if (petType === "dog") return "/images/pets/doubao.svg";
    if (petType === "cat") return "/images/pets/xiaoju.svg";
    return "/images/pets/xueqiu.svg";
  }, [petType]);

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    window.setTimeout(() => {
      router.push("/memorial/doubao?created=1");
    }, 650);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet lg:sticky lg:top-28 lg:h-fit">
        <p className="mb-4 text-sm font-semibold text-forest">头像预览</p>
        <img
          src={avatarPreview || fallbackAvatar}
          alt="宠物头像预览"
          className="aspect-square w-full rounded-3xl bg-mist object-cover"
        />
        <label className="focus-within:ring-gold mt-4 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-forest/12 bg-porcelain px-4 text-sm font-semibold text-forest transition hover:bg-white focus-within:ring-2">
          <ImagePlus className="h-4 w-4" />
          上传头像
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
          />
        </label>
        <p className="mt-4 text-xs leading-6 text-night/54">
          你可以先选择一张最能代表它的照片，之后再补充更多记忆。
        </p>
      </aside>

      <div className="space-y-5 rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它的名字</span>
            <input
              required
              name="name"
              placeholder="例如：豆包"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它是</span>
            <select
              value={petType}
              onChange={(event) => setPetType(event.target.value as PetType)}
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            >
              {petTypes.map((type) => (
                <option key={type} value={type}>
                  {petTypeLabels[type]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它来到你身边的日子</span>
            <input
              name="birthOrAdoptedDate"
              type="date"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它去星星上的日子</span>
            <input
              name="departedDate"
              type="date"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-forest">和它有关的一段记忆</span>
          <textarea
            required
            name="story"
            placeholder="写下它的习惯、陪伴过你的日子，或你最想保存的一个片段。"
            className="focus-ring min-h-36 w-full resize-none rounded-2xl border border-forest/12 bg-porcelain px-4 py-3 text-sm leading-6"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-forest">最想对它说的一句话</span>
          <textarea
            required
            name="message"
            placeholder="这一段会显示在纪念页中，可以很短，也可以很安静。"
            className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-forest/12 bg-porcelain px-4 py-3 text-sm leading-6"
          />
        </label>
        <div className="grid gap-3">
          <label className="flex items-start gap-3 rounded-2xl border border-forest/10 bg-cream/45 p-4">
            <input
              name="isPublic"
              type="checkbox"
              className="mt-1 h-5 w-5 accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold text-forest">
                申请进入公共记忆花园
              </span>
              <span className="mt-1 block text-xs leading-5 text-night/56">
                公开展示需要人工审核，通过后访客才可以浏览和祝福。
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-2xl border border-forest/10 bg-cream/45 p-4">
            <input
              name="allowComments"
              type="checkbox"
              defaultChecked
              className="mt-1 h-5 w-5 accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold text-forest">
                允许他人留言
              </span>
              <span className="mt-1 block text-xs leading-5 text-night/56">
                留言默认先进入待审核状态，页面主人可后续关闭。
              </span>
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-cream shadow-quiet transition hover:bg-night disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? "正在生成..." : "生成纪念页预览"}
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled
          className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-full border border-forest/12 bg-porcelain px-5 text-sm font-semibold text-night/42 sm:ml-3 sm:w-auto"
        >
          保存这一页记忆
        </button>
      </div>
    </form>
  );
}
