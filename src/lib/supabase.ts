import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "whitelist";

let client: SupabaseClient | null = null;

/**
 * Supabase client ฝั่งเซิร์ฟเวอร์ (service_role) — ข้ามผ่าน RLS
 * ห้าม import ไฟล์นี้ใน client component
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ใน .env.local",
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export async function signedUrl(path: string | null, expiresIn = 60 * 30) {
  if (!path) return null;
  const { data } = await db().storage.from(BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
