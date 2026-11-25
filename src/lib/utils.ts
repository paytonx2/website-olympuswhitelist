export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function avatarUrl(id: string, avatar: string | null | undefined, size = 64) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=${size}`;
  let idx = 0;
  try {
    idx = Number((BigInt(id) >> BigInt(22)) % BigInt(6));
  } catch {}
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

const dtf = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function fmtDate(v: string | Date | null | undefined) {
  if (!v) return "-";
  return dtf.format(new Date(v));
}

export function timeAgo(v: string | Date) {
  const diff = Date.now() - new Date(v).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  const d = Math.floor(h / 24);
  return `${d} วันที่แล้ว`;
}
