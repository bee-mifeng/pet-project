"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient: ReturnType<typeof createClient<any>> | null = null;

export function getSupabaseClient() {
  if (process.env.NEXT_PUBLIC_STORAGE_MODE === "local") {
    throw new Error("当前使用本地免配置模式。");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("缺少必要的环境变量，请先完成站点连接配置。");
  }

  if (!browserClient) {
    browserClient = createClient<any>(supabaseUrl, supabaseAnonKey);
  }

  return browserClient;
}
