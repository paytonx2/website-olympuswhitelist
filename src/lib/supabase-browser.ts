"use client";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** ใช้สำหรับอัปโหลดไฟล์ผ่าน signed upload URL เท่านั้น (ไม่มีสิทธิ์อ่านตารางเพราะเปิด RLS) */
export function browserSupabase() {
  if (client) return client;
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  return client;
}
