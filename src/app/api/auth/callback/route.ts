import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, oauthConfig } from "@/lib/discord";
import { createSessionCookie } from "@/lib/session";
import { db } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { baseUrl } = oauthConfig();
  const fail = (code: string, detail?: unknown) => {
    if (detail) console.error(`[auth/callback] ${code}:`, detail);
    return NextResponse.redirect(`${baseUrl}/?login_error=${code}`);
  };

  const discordError = req.nextUrl.searchParams.get("error");
  if (discordError) return fail("cancelled", discordError);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("oa_oauth_state")?.value;
  const next = req.cookies.get("oa_oauth_next")?.value ?? "/";

  if (!code || !state || state !== savedState) {
    return fail("state", { hasCode: !!code, hasState: !!state, hasCookie: !!savedState });
  }

  let user;
  try {
    user = await exchangeCode(code);
  } catch (e) {
    return fail("discord", e);
  }

  try {
    const { error } = await db().from("profiles").upsert({
      discord_id: user.id,
      username: user.username,
      global_name: user.global_name,
      avatar: user.avatar,
      last_login: new Date().toISOString(),
    });
    if (error) throw new Error(`${error.code ?? ""} ${error.message}`);
  } catch (e) {
    return fail("database", e);
  }

  let cookie;
  try {
    cookie = await createSessionCookie({
      id: user.id,
      username: user.username,
      name: user.global_name || user.username,
      avatar: user.avatar,
    });
  } catch (e) {
    return fail("secret", e);
  }

  const res = NextResponse.redirect(`${baseUrl}${next}`);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  res.cookies.delete("oa_oauth_state");
  res.cookies.delete("oa_oauth_next");
  return res;
}
