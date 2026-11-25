import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./supabase";

export const SESSION_COOKIE = "oa_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 วัน

export type SessionUser = {
  id: string; // Discord ID
  username: string;
  name: string;
  avatar: string | null;
};

export type StaffRole = "admin" | "reviewer" | "finance";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร");
  return new TextEncoder().encode(s);
}

export async function createSessionCookie(user: SessionUser) {
  const token = await new SignJWT({ u: user.username, n: user.name, a: user.avatar })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: MAX_AGE,
    },
  };
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      username: String(payload.u ?? ""),
      name: String(payload.n ?? payload.u ?? ""),
      avatar: (payload.a as string | null) ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireUser(next = "/"): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect(`/api/auth/login?next=${encodeURIComponent(next)}`);
  return user;
}

function envAdmins(): string[] {
  return (process.env.ADMIN_DISCORD_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const getStaffRole = cache(async (discordId: string): Promise<StaffRole | null> => {
  if (envAdmins().includes(discordId)) return "admin";
  const { data } = await db()
    .from("staff")
    .select("role")
    .eq("discord_id", discordId)
    .maybeSingle();
  return (data?.role as StaffRole) ?? null;
});

export async function requireStaff(
  allowed: StaffRole[] = ["admin", "reviewer", "finance"],
): Promise<{ user: SessionUser; role: StaffRole }> {
  const user = await requireUser("/admin");
  const role = await getStaffRole(user.id);
  if (!role || !allowed.includes(role)) redirect("/?denied=1");
  return { user, role };
}

/** ใช้ใน server action: ไม่ redirect แต่ throw */
export async function assertStaff(allowed: StaffRole[] = ["admin", "reviewer", "finance"]) {
  const user = await getSession();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
  const role = await getStaffRole(user.id);
  if (!role || !allowed.includes(role)) throw new Error("ไม่มีสิทธิ์ทำรายการนี้");
  return { user, role };
}
