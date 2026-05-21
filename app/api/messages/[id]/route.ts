import { NextResponse } from "next/server";
import { updateStorageMessage } from "@/lib/supabase/storage-data";
import type { MessageRow } from "@/types/database";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = (await request.json()) as Partial<MessageRow>;
    const updated = await updateStorageMessage(id, updates);

    return NextResponse.json({ message: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
