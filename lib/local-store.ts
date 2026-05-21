import { generateMemorialSlug } from "@/lib/slug";
import type { MemorialRow, MessageRow, PetType } from "@/types/database";

const MEMORIALS_KEY = "pawsmeadow_local_memorials";
const MESSAGES_KEY = "pawsmeadow_local_messages";

export interface CreateLocalMemorialInput {
  pet_name: string;
  pet_type: PetType;
  birth_or_adopted_date: string | null;
  passed_date: string | null;
  story: string | null;
  message: string | null;
  photo_url: string | null;
  allow_messages: boolean;
  review_status: MemorialRow["review_status"];
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("照片读取失败，请重新选择一张照片。"));
    reader.readAsDataURL(file);
  });
}

export function getLocalMemorials() {
  return readJson<MemorialRow[]>(MEMORIALS_KEY, []);
}

export function saveLocalMemorials(memorials: MemorialRow[]) {
  writeJson(MEMORIALS_KEY, memorials);
}

export function getLocalMessages() {
  return readJson<MessageRow[]>(MESSAGES_KEY, []);
}

export function saveLocalMessages(messages: MessageRow[]) {
  writeJson(MESSAGES_KEY, messages);
}

export function createLocalMemorial(input: CreateLocalMemorialInput) {
  const memorials = getLocalMemorials();
  let slug = generateMemorialSlug();

  while (memorials.some((item) => item.slug === slug)) {
    slug = generateMemorialSlug();
  }

  const now = new Date().toISOString();
  const memorial: MemorialRow = {
    id: crypto.randomUUID(),
    slug,
    pet_name: input.pet_name,
    pet_type: input.pet_type,
    birth_or_adopted_date: input.birth_or_adopted_date,
    passed_date: input.passed_date,
    story: input.story,
    message: input.message,
    photo_url: input.photo_url,
    is_public: false,
    allow_messages: input.allow_messages,
    review_status: input.review_status,
    flowers_count: 0,
    paw_lights_count: 0,
    created_at: now,
    updated_at: now
  };

  saveLocalMemorials([memorial, ...memorials]);
  return memorial;
}

export function updateLocalMemorial(
  id: string,
  updates: Partial<MemorialRow>
) {
  let updated: MemorialRow | null = null;
  const memorials = getLocalMemorials().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...updates, updated_at: new Date().toISOString() };
    return updated;
  });

  saveLocalMemorials(memorials);
  return updated;
}

export function createLocalMessage(input: {
  memorial_id: string;
  visitor_name: string | null;
  content: string;
}) {
  const now = new Date().toISOString();
  const message: MessageRow = {
    id: crypto.randomUUID(),
    memorial_id: input.memorial_id,
    visitor_name: input.visitor_name,
    content: input.content,
    review_status: "pending",
    created_at: now
  };

  saveLocalMessages([message, ...getLocalMessages()]);
  return message;
}

export function updateLocalMessage(
  id: string,
  updates: Partial<MessageRow>
) {
  let updated: MessageRow | null = null;
  const messages = getLocalMessages().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...updates };
    return updated;
  });

  saveLocalMessages(messages);
  return updated;
}
