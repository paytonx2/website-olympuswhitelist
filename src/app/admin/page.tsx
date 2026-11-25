import Link from "next/link";
import { CATEGORIES, EVENT_LABEL, type Status } from "@/lib/constants";
import { db } from "@/lib/supabase";
import { botConfigured } from "@/lib/discord";
import { fmtDate, timeAgo } from "@/lib/utils";
import { PageTitle } from "@/components/ui";
import { CategoryIcon } from "@/components/greek";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: apps }, { data: events }, { data: profiles }] = await Promise.all([
    db().from("applications").select("id, category, tier, status, created_at, decided_at, payment_verified"),
    db()
      .from("application_events")
      .select("id, application_id, actor_id, action, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
    db().from("profiles").select("discord_id, username, global_name"),
  ]);
  const all = apps ?? [];
  const names = new Map((profiles ?? []).map((p) => [p.discord_id, p.global_name || p.username]));

  const count = (f: (a: (typeof all)[number]) => boolean) => all.filter(f).length;
  const waiting = (a: { status: Status }) => a.status === "pending" || a.status === "reviewing";

  const stats = [
    { label: "รอตรวจทั้งหมด", value: count(waiting), href: "/admin/queue", tone: "text-amber-800" },
    { label: "Express รอตรวจ", value: count((a) => waiting(a) && a.tier === "express"), href: "/admin/queue?tier=express", tone: "text-gold" },
    { label: "สลิปยังไม่ยืนยัน", value: count((a) => waiting(a) && a.tier === "express" && !a.payment_verified), href: "/admin/queue?tier=express&payment=unverified", tone: "text-orange-800" },
    { label: "รอสัมภาษณ์", value: count((a) => a.status === "interview"), href: "/admin/queue?status=interview", tone: "text-violet-800" },
    { label: "ส่งเข้ามาวันนี้", value: count((a) => new Date(a.created_at) >= startOfDay), href: "/admin/queue?status=all", tone: "text-sky-800" },
    { label: "ตัดสินแล้ววันนี้", value: count((a) => !!a.decided_at && new Date(a.decided_at) >= startOfDay), href: "/admin/logs", tone: "text-emerald-800" },
  ];

  const oldest = all
    .filter(waiting)
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0];

  return (
    <div>
      <PageTitle title="Dashboard" subtitle="ภาพรวมระบบ Whitelist">
        <Link href="/admin/queue" className="btn-gold">เริ่มตรวจคิว →</Link>
      </PageTitle>

      {!botConfigured() && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ยังไม่ได้ตั้งค่า Discord Bot (DISCORD_BOT_TOKEN / DISCORD_GUILD_ID) — ระบบจะยังไม่ให้ยศและไม่ส่ง DM อัตโนมัติ
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 transition hover:border-gold/40">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`display mt-3 text-4xl font-semibold ${s.tone}`}>{s.value}</p>
          </Link>
        ))}
      </div>

      {oldest && (
        <p className="mt-4 text-sm text-muted">
          ใบสมัครที่รอนานที่สุด: ส่งเมื่อ {timeAgo(oldest.created_at)} ·{" "}
          <Link href={`/admin/applications/${oldest.id}`} className="text-gold hover:underline">เปิดดู</Link>
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">แยกตามประเภท</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="pb-2 font-normal">ประเภท</th>
                <th className="pb-2 text-right font-normal">รอตรวจ</th>
                <th className="pb-2 text-right font-normal">ผ่าน</th>
                <th className="pb-2 text-right font-normal">ไม่ผ่าน</th>
                <th className="pb-2 text-right font-normal">ทั้งหมด</th>
              </tr>
            </thead>
            <tbody>
              {CATEGORIES.map((c) => {
                const rows = all.filter((a) => a.category === c.key);
                return (
                  <tr key={c.key} className="border-t border-line/60">
                    <td className="py-2.5">
                      <Link href={`/admin/queue?category=${c.key}`} className="flex items-center gap-2 hover:text-gold"><CategoryIcon category={c.key} className="h-4 w-4 text-gold" />{c.name}</Link>
                    </td>
                    <td className="text-right text-amber-800">{rows.filter(waiting).length}</td>
                    <td className="text-right text-emerald-800">{rows.filter((a) => a.status === "approved").length}</td>
                    <td className="text-right text-rose-800">{rows.filter((a) => a.status === "rejected").length}</td>
                    <td className="text-right">{rows.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">กิจกรรมล่าสุด</h2>
            <Link href="/admin/logs" className="text-xs text-gold hover:underline">ดูทั้งหมด</Link>
          </div>
          <ul className="space-y-3 text-sm">
            {(events ?? []).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3">
                <span>
                  <span className="text-ink">{names.get(e.actor_id) ?? e.actor_id ?? "ระบบ"}</span>{" "}
                  <span className="text-muted">{EVENT_LABEL[e.action] ?? e.action}</span>
                  {e.application_id && (
                    <Link href={`/admin/applications/${e.application_id}`} className="ml-1 text-gold hover:underline">#{e.application_id.slice(0, 6)}</Link>
                  )}
                </span>
                <span className="shrink-0 text-xs text-muted" title={fmtDate(e.created_at)}>{timeAgo(e.created_at)}</span>
              </li>
            ))}
            {!events?.length && <li className="text-muted">ยังไม่มีกิจกรรม</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
