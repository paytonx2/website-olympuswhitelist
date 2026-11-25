import { NextResponse, type NextRequest } from "next/server";
import { oauthConfig } from "@/lib/discord";

export async function GET(req: NextRequest) {
  const { clientId, redirectUri } = oauthConfig();
  const nextParam = req.nextUrl.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const state = crypto.randomUUID();

  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "identify");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url);
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("oa_oauth_state", state, opts);
  res.cookies.set("oa_oauth_next", next, opts);
  return res;
}
