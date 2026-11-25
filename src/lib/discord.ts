import "server-only";

const API = "https://discord.com/api/v10";

export function oauthConfig() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const baseUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!clientId || !clientSecret) {
    throw new Error("ยังไม่ได้ตั้งค่า DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET");
  }
  return { clientId, clientSecret, redirectUri: `${baseUrl}/api/auth/callback`, baseUrl };
}

export type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

export async function exchangeCode(code: string): Promise<DiscordUser> {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  const tokenRes = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!tokenRes.ok) throw new Error(`Discord token error ${tokenRes.status}`);
  const token = (await tokenRes.json()) as { access_token: string; token_type: string };

  const meRes = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `${token.token_type} ${token.access_token}` },
    cache: "no-store",
  });
  if (!meRes.ok) throw new Error(`Discord user error ${meRes.status}`);
  return (await meRes.json()) as DiscordUser;
}

// ---------------------------------------------------------------- Bot ----

function botHeaders() {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return null;
  return { Authorization: `Bot ${token}`, "Content-Type": "application/json" };
}

const guildId = () => process.env.DISCORD_GUILD_ID ?? "";

export function botConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && guildId());
}

async function botFetch(path: string, init: RequestInit = {}) {
  const headers = botHeaders();
  if (!headers) throw new Error("ยังไม่ได้ตั้งค่า DISCORD_BOT_TOKEN");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, "X-Audit-Log-Reason": "OLYMPUS Whitelist" },
    cache: "no-store",
  });
  if (!res.ok && res.status !== 204) {
    let msg = `${res.status}`;
    try {
      const j = await res.json();
      msg += ` ${j.message ?? ""}`;
    } catch {}
    throw new Error(msg.trim());
  }
  return res;
}

/** true = อยู่ในเซิร์ฟเวอร์, false = ไม่อยู่, null = เช็คไม่ได้ (ไม่มีบอท) */
export async function isGuildMember(userId: string): Promise<boolean | null> {
  if (!botConfigured()) return null;
  try {
    await botFetch(`/guilds/${guildId()}/members/${userId}`);
    return true;
  } catch (e) {
    if (String(e).includes("404")) return false;
    return null;
  }
}

export function parseIds(s: string | undefined | null): string[] {
  return (s ?? "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter((x) => /^\d{15,25}$/.test(x));
}

/** ให้ยศ/ถอดยศ คืนค่าเป็นข้อความสรุป */
export async function syncRoles(userId: string, add: string[], remove: string[]) {
  if (!botConfigured()) return "skipped:ยังไม่ได้ตั้งค่าบอท";
  const errors: string[] = [];
  for (const r of add) {
    try {
      await botFetch(`/guilds/${guildId()}/members/${userId}/roles/${r}`, { method: "PUT" });
    } catch (e) {
      errors.push(`+${r}: ${(e as Error).message}`);
    }
  }
  for (const r of remove) {
    try {
      await botFetch(`/guilds/${guildId()}/members/${userId}/roles/${r}`, { method: "DELETE" });
    } catch (e) {
      errors.push(`-${r}: ${(e as Error).message}`);
    }
  }
  if (add.length === 0 && remove.length === 0) return "skipped:ไม่ได้ตั้ง Role ID";
  return errors.length ? `failed:${errors.join(" | ")}` : "ok";
}

type Embed = {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
};

export async function sendDM(userId: string, embed: Embed) {
  if (!process.env.DISCORD_BOT_TOKEN) return false;
  try {
    const ch = await botFetch(`/users/@me/channels`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: userId }),
    });
    const { id } = (await ch.json()) as { id: string };
    await botFetch(`/channels/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed] }),
    });
    return true;
  } catch {
    return false; // ผู้เล่นปิด DM
  }
}

export async function sendChannel(channelId: string, embed: Embed) {
  if (!process.env.DISCORD_BOT_TOKEN || !channelId) return false;
  try {
    await botFetch(`/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
    });
    return true;
  } catch {
    return false;
  }
}

export const COLORS = {
  gold: 0xd4af37,
  green: 0x34d399,
  red: 0xf43f5e,
  orange: 0xfb923c,
  violet: 0xa78bfa,
  blue: 0x38bdf8,
};
