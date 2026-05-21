import { NextResponse } from "next/server";
import {
  getStorageMemorials,
  getStorageMessages
} from "@/lib/supabase/storage-data";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const memorialMap = (await getStorageMemorials()).reduce<Record<string, string>>(
      (acc, memorial) => {
        acc[memorial.id] = memorial.pet_name;
        return acc;
      },
      {}
    );
    let messages = await getStorageMessages();

    if (status) {
      messages = messages.filter((message) => message.review_status === status);
    }

    return NextResponse.json({
      messages: messages
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((message) => ({
          ...message,
          pet_name: memorialMap[message.memorial_id] || "未知纪念页"
        }))
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
