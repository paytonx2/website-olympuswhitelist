import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const res = NextResponse.redirect(`${base}/`, 303);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
