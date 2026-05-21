import { NextResponse } from "next/server";
import {
  getStorageMemorials,
  getStorageMessages,
  updateStorageMemorialBySlug
} from "@/lib/supabase/storage-data";
import type { MemorialRow } from "@/types/database";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const memorial = (await getStorageMemorials()).find(
      (item) => item.slug === slug
    );

    if (!memorial) {
      return NextResponse.json({ error: "没有找到这页纪念。" }, { status: 404 });
    }

    const messages = (await getStorageMessages())
      .filter(
        (message) =>
          message.memorial_id === memorial.id &&
          message.review_status === "approved"
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return NextResponse.json({ memorial, messages });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const updates = (await request.json()) as Partial<MemorialRow>;
    const updated = await updateStorageMemorialBySlug(slug, updates);

    return NextResponse.json({ memorial: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
