import { NextResponse } from "next/server";
import {
  createStorageMessage,
  getStorageMemorials
} from "@/lib/supabase/storage-data";
import type { MessageRow } from "@/types/database";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = (await request.json()) as {
      visitor_name?: string;
      content?: string;
    };
    const memorial = (await getStorageMemorials()).find(
      (item) => item.slug === slug
    );

    if (!memorial) {
      return NextResponse.json({ error: "没有找到这页纪念。" }, { status: 404 });
    }

    if (!body.content?.trim()) {
      return NextResponse.json({ error: "请先写下留言内容。" }, { status: 400 });
    }

    const message: MessageRow = {
      id: crypto.randomUUID(),
      memorial_id: memorial.id,
      visitor_name: body.visitor_name?.trim() || null,
      content: body.content.trim(),
      review_status: "pending",
      created_at: new Date().toISOString()
    };

    const savedMessage = await createStorageMessage(message);
    return NextResponse.json({ message: savedMessage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "留言提交失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
