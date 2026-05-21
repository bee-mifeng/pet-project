import { NextResponse } from "next/server";
import { generateMemorialSlug, sanitizeFileName } from "@/lib/slug";
import {
  createStorageMemorial,
  getStorageMemorials,
  getStorageMessages,
  uploadStoragePhoto
} from "@/lib/supabase/storage-data";
import type { MemorialRow, PetType } from "@/types/database";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const memorials = await getStorageMemorials();

    if (scope === "public") {
      const messages = await getStorageMessages();
      const counts = messages
        .filter((message) => message.review_status === "approved")
        .reduce<Record<string, number>>((acc, message) => {
          acc[message.memorial_id] = (acc[message.memorial_id] || 0) + 1;
          return acc;
        }, {});

      return NextResponse.json({
        memorials: memorials
          .filter((item) => item.review_status === "approved" && item.is_public)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((item) => ({
            ...item,
            approved_messages_count: counts[item.id] || 0
          }))
      });
    }

    if (scope === "pending") {
      return NextResponse.json({
        memorials: memorials
          .filter((item) => item.review_status === "pending")
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
      });
    }

    return NextResponse.json({ memorials });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const petName = String(formData.get("pet_name") || "").trim();
    const petType = String(formData.get("pet_type") || "") as PetType;
    const photo = formData.get("photo");

    if (!petName || !petType || !(photo instanceof File)) {
      return NextResponse.json(
        { error: "请填写名字、类型，并上传照片。" },
        { status: 400 }
      );
    }

    const memorials = await getStorageMemorials();
    let slug = generateMemorialSlug();
    while (memorials.some((item) => item.slug === slug)) {
      slug = generateMemorialSlug();
    }

    const photoPath = `memorials/${slug}/${Date.now()}-${sanitizeFileName(photo.name)}`;
    const photoUrl = await uploadStoragePhoto(photoPath, photo);
    const now = new Date().toISOString();
    const applyPublic = formData.get("apply_public") === "true";

    const memorial: MemorialRow = {
      id: crypto.randomUUID(),
      slug,
      pet_name: petName,
      pet_type: petType,
      birth_or_adopted_date:
        String(formData.get("birth_or_adopted_date") || "") || null,
      passed_date: String(formData.get("passed_date") || "") || null,
      story: String(formData.get("story") || "").trim() || null,
      message: String(formData.get("message") || "").trim() || null,
      photo_url: photoUrl,
      is_public: false,
      allow_messages: formData.get("allow_messages") !== "false",
      review_status: applyPublic ? "pending" : "private",
      flowers_count: 0,
      paw_lights_count: 0,
      created_at: now,
      updated_at: now
    };

    const savedMemorial = await createStorageMemorial(memorial);
    return NextResponse.json({ memorial: savedMemorial });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
