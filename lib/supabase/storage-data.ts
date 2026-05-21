import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MemorialRow, MessageRow } from "@/types/database";

const BUCKET = "pet-photos";

export async function getStorageMemorials() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memorials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as MemorialRow[];
}

export async function createStorageMemorial(memorial: MemorialRow) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("memorials")
    .insert(memorial)
    .select()
    .single();

  if (error) throw error;
  return data as MemorialRow;
}

export async function updateStorageMemorialBySlug(
  slug: string,
  updates: Partial<MemorialRow>
) {
  const supabase = getSupabaseAdminClient();
  const {
    id: _id,
    slug: _slug,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...safeUpdates
  } = updates;
  const { data, error } = await supabase
    .from("memorials")
    .update(safeUpdates)
    .eq("slug", slug)
    .select()
    .single();

  if (error) throw error;
  return data as MemorialRow;
}

export async function saveStorageMemorials(memorials: MemorialRow[]) {
  if (memorials.length === 0) return;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("memorials").upsert(memorials);
  if (error) throw error;
}

export async function getStorageMessages() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as MessageRow[];
}

export async function createStorageMessage(message: MessageRow) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert(message)
    .select()
    .single();

  if (error) throw error;
  return data as MessageRow;
}

export async function updateStorageMessage(
  id: string,
  updates: Partial<MessageRow>
) {
  const { id: _id, created_at: _createdAt, ...safeUpdates } = updates;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .update(safeUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MessageRow;
}

export async function saveStorageMessages(messages: MessageRow[]) {
  if (messages.length === 0) return;

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("messages").upsert(messages);
  if (error) throw error;
}

export async function uploadStoragePhoto(path: string, file: File) {
  const supabase = getSupabaseAdminClient();
  const body = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    cacheControl: "3600",
    contentType: file.type || "image/jpeg",
    upsert: false
  });

  if (error) throw error;

  const {
    data: { publicUrl }
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return publicUrl;
}
