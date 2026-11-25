import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, oauthConfig } from "@/lib/discord";
import { createSessionCookie } from "@/lib/session";
import { db } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { baseUrl } = oauthConfig();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("oa_oauth_state")?.value;
  const next = req.cookies.get("oa_oauth_next")?.value ?? "/";

  if (!code || !state || state !== savedState) {
    return NextResponse.redirect(`${baseUrl}/?login_error=state`);
  }

  try {
    const user = await exchangeCode(code);
    const name = user.global_name || user.username;

    const { error } = await db().from("profiles").upsert({
      discord_id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
      last_login: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);

    const cookie = await createSessionCookie({
      id: user.id,
      username: user.username,
      name,
      avatar: user.avatar,
    });
    const res = NextResponse.redirect(`${baseUrl}${next}`);
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    res.cookies.delete("oa_oauth_state");
    res.cookies.delete("oa_oauth_next");
    return res;
  } catch (e) {
    console.error("[auth/callback]", e);
    return NextResponse.redirect(`${baseUrl}/?login_error=discord`);
  }
}
