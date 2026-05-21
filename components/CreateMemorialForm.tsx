"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus } from "lucide-react";
import type { PetType } from "@/types";
import {
  createLocalMemorial,
  fileToDataUrl
} from "@/lib/local-store";
import { generateMemorialSlug, sanitizeFileName } from "@/lib/slug";
import { getSupabaseClient } from "@/lib/supabase/client";
import { petTypeLabels } from "@/lib/utils";

const petTypes: PetType[] = ["cat", "dog", "other"];

type Notice = {
  tone: "success" | "error";
  text: string;
};

export function CreateMemorialForm() {
  const router = useRouter();
  const [petType, setPetType] = useState<PetType>("cat");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setPhoto(null);
      setPhotoPreview("");
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setNotice(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const petName = String(formData.get("pet_name") || "").trim();
    const birthOrAdoptedDate =
      String(formData.get("birth_or_adopted_date") || "") || null;
    const passedDate = String(formData.get("passed_date") || "") || null;
    const story = String(formData.get("story") || "").trim() || null;
    const message = String(formData.get("message") || "").trim() || null;
    const applyPublic = formData.get("apply_public") === "on";
    const allowMessages = formData.get("allow_messages") === "on";

    if (!petName || !petType || !photo) {
      setNotice({
        tone: "error",
        text: "请先填写名字、类型，并上传一张最想保存的照片。"
      });
      return;
    }

    setIsSubmitting(true);
    setNotice(null);

    try {
      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
        const photoUrl = await fileToDataUrl(photo);
        const memorial = createLocalMemorial({
          pet_name: petName,
          pet_type: petType,
          birth_or_adopted_date: birthOrAdoptedDate,
          passed_date: passedDate,
          story,
          message,
          photo_url: photoUrl,
          allow_messages: allowMessages,
          review_status: applyPublic ? "pending" : "private"
        });

        router.push(`/memorial/${memorial.slug}`);
        return;
      }

      if (process.env.NEXT_PUBLIC_STORAGE_MODE === "supabase-storage") {
        const payload = new FormData();
        payload.set("pet_name", petName);
        payload.set("pet_type", petType);
        payload.set("birth_or_adopted_date", birthOrAdoptedDate || "");
        payload.set("passed_date", passedDate || "");
        payload.set("story", story || "");
        payload.set("message", message || "");
        payload.set("apply_public", String(applyPublic));
        payload.set("allow_messages", String(allowMessages));
        payload.set("photo", photo);

        const response = await fetch("/api/memorials", {
          method: "POST",
          body: payload
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "保存失败，请稍后再试。");
        }

        router.push(`/memorial/${result.memorial.slug}`);
        return;
      }

      const supabase = getSupabaseClient();
      let lastError: unknown = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const slug = generateMemorialSlug();
        const filePath = `memorials/${slug}/${Date.now()}-${sanitizeFileName(
          photo.name
        )}`;

        const { error: uploadError } = await supabase.storage
          .from("pet-photos")
          .upload(filePath, photo, {
            cacheControl: "3600",
            upsert: false
          });

        if (uploadError) {
          throw new Error(`图片上传失败：${uploadError.message}`);
        }

        const {
          data: { publicUrl }
        } = supabase.storage.from("pet-photos").getPublicUrl(filePath);

        const { error: insertError } = await supabase.from("memorials").insert({
          slug,
          pet_name: petName,
          pet_type: petType,
          birth_or_adopted_date: birthOrAdoptedDate,
          passed_date: passedDate,
          story,
          message,
          photo_url: publicUrl,
          is_public: false,
          allow_messages: allowMessages,
          review_status: applyPublic ? "pending" : "private"
        });

        if (!insertError) {
          router.push(`/memorial/${slug}`);
          return;
        }

        lastError = insertError;
        if (insertError.code !== "23505") {
          break;
        }
      }

      throw new Error(
        lastError instanceof Error ? lastError.message : "保存失败，请稍后再试。"
      );
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "网络异常，请稍后再试。";
      setNotice({
        tone: "error",
        text: messageText.includes("图片上传失败")
          ? messageText
          : `保存这一页记忆失败：${messageText}`
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet lg:sticky lg:top-28 lg:h-fit">
        <p className="mb-4 text-sm font-semibold text-forest">
          上传一张最想保存的照片
        </p>
        <label className="focus-within:ring-gold flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-forest/18 bg-porcelain text-center transition hover:bg-white focus-within:ring-2">
          {photoPreview ? (
            <img
              src={photoPreview}
              alt="宠物照片预览"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid gap-3 px-6">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-forest/10 text-forest">
                <ImagePlus className="h-6 w-6" />
              </span>
              <span className="text-base font-semibold text-forest">
                上传一张最想保存的照片
              </span>
              <span className="text-sm leading-6 text-night/56">
                建议选择清晰、温柔、能代表它的照片。
              </span>
            </span>
          )}
          <input
            name="photo"
            type="file"
            accept="image/*"
            required
            onChange={handlePhotoChange}
            className="sr-only"
          />
        </label>
      </aside>

      <div className="space-y-5 rounded-3xl border border-forest/10 bg-white p-5 shadow-quiet sm:p-6">
        {notice ? (
          <div
            className={`rounded-2xl border p-4 text-sm leading-6 ${
              notice.tone === "error"
                ? "border-rosewood/20 bg-rosewood/8 text-rosewood"
                : "border-sage/20 bg-sage/10 text-forest"
            }`}
          >
            {notice.text}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它的名字</span>
            <input
              required
              name="pet_name"
              placeholder="例如：豆包"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它是</span>
            <select
              name="pet_type"
              required
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
              name="birth_or_adopted_date"
              type="date"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-forest">它去星星上的日子</span>
            <input
              name="passed_date"
              type="date"
              className="focus-ring min-h-12 w-full rounded-2xl border border-forest/12 bg-porcelain px-4 text-sm"
            />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-forest">和它有关的一段记忆</span>
          <textarea
            name="story"
            placeholder="写下它的习惯、陪伴过你的日子，或你最想保存的一个片段。"
            className="focus-ring min-h-36 w-full resize-none rounded-2xl border border-forest/12 bg-porcelain px-4 py-3 text-sm leading-6"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-forest">最想对它说的一句话</span>
          <textarea
            name="message"
            placeholder="这一段会显示在纪念页中，可以很短，也可以很安静。"
            className="focus-ring min-h-28 w-full resize-none rounded-2xl border border-forest/12 bg-porcelain px-4 py-3 text-sm leading-6"
          />
        </label>
        <div className="grid gap-3">
          <label className="flex items-start gap-3 rounded-2xl border border-forest/10 bg-cream/45 p-4">
            <input
              name="apply_public"
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
              name="allow_messages"
              type="checkbox"
              defaultChecked
              className="mt-1 h-5 w-5 accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold text-forest">
                允许他人留言
              </span>
              <span className="mt-1 block text-xs leading-5 text-night/56">
                留言会先进入待审核状态，通过后再显示。
              </span>
            </span>
          </label>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 text-sm font-bold text-cream shadow-quiet transition hover:bg-night disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? "正在保存..." : "保存这一页记忆"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
