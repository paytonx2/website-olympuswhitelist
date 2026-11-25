import Link from "next/link";
import { ALL_STATUSES, CATEGORIES, CATEGORY_MAP, STATUS_INFO, type Category, type Status, type Tier } from "@/lib/constants";
import { db } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { avatarUrl, cn, fmtDate, timeAgo } from "@/lib/utils";
import { Empty, PageTitle, StatusBadge, TierBadge } from "@/components/ui";
import { CategoryIcon } from "@/components/greek";

export const metadata = { title: "คิวตรวจ" };

const PAGE_SIZE = 50;

type Row = {
  id: string;
  discord_id: string;
  category: Category;
  tier: Tier;
  status: Status;
  ic_name: string;
  steam_hex: string;
  lineage: string | null;
  extra_role: string | null;
  payment_verified: boolean;
  claimed_by: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export default async function QueuePage({ searchParams }: PageProps<"/admin/queue">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const status = str("status") || "open";
  const category = str("category");
  const tier = str("tier");
  const payment = str("payment");
  const q = str("q").trim();
  const sort = str("sort") || "priority";
  const page = Math.max(1, Number(str("page")) || 1);

  let query = db()
    .from("applications")
    .select(
      "id, discord_id, category, tier, status, ic_name, steam_hex, lineage, extra_role, payment_verified, claimed_by, revision, created_at, updated_at",
      { count: "exact" },
    );

  if (status === "open") query = query.in("status", ["pending", "reviewing"]);
  else if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (tier) query = query.eq("tier", tier);
  if (payment === "unverified") query = query.eq("payment_verified", false);

  let profileMatches: string[] = [];
  if (q) {
    const safe = q.replace(/["\%*,()]/g, "");
    const { data: ps } = await db()
      .from("profiles")
      .select("discord_id")
      .or(`username.ilike."%${safe}%",global_name.ilike."%${safe}%"`)
      .limit(50);
    profileMatches = (ps ?? []).map((p) => p.discord_id);
    const ors = [
      `ic_name.ilike."%${safe}%"`,
      `ic_name_reading.ilike."%${safe}%"`,
      `steam_hex.ilike."%${safe}%"`,
      `discord_id.eq.${/^\d+$/.test(safe) ? safe : "0"}`,
    ];
    if (profileMatches.length) ors.push(`discord_id.in.(${profileMatches.join(",")})`);
    query = query.or(ors.join(","));
  }

  if (sort === "priority") {
    // Express ก่อน แล้วเรียงตามเวลาที่ส่ง (เก่าสุดก่อน)
    query = query.order("tier", { ascending: true }).order("updated_at", { ascending: true });
  } else if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = (data ?? []) as Row[];

  const ids = [...new Set(rows.flatMap((r) => [r.discord_id, r.claimed_by].filter(Boolean) as string[]))];
  const [{ data: profiles }, settings] = await Promise.all([
    ids.length
      ? db().from("profiles").select("discord_id, username, global_name, avatar").in("discord_id", ids)
      : Promise.resolve({ data: [] as { discord_id: string; username: string; global_name: string | null; avatar: string | null }[] }),
    getSettings(),
  ]);
  const pmap = new Map((profiles ?? []).map((p) => [p.discord_id, p]));
  const sub = (r: Row) =>
    r.lineage
      ? settings.lineages.find((l) => l.key === r.lineage)?.name
      : r.extra_role
        ? settings.extraRoles.find((x) => x.key === r.extra_role)?.name
        : null;

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    const cur = { status, category, tier, payment, q, sort, ...patch };
    Object.entries(cur).forEach(([k, v]) => v && !(k === "status" && v === "open") && p.set(k, v));
    if (!("page" in patch)) p.delete("page");
    const s = p.toString();
    return `/admin/queue${s ? `?${s}` : ""}`;
  };

  const statusTabs: { key: string; label: string }[] = [
    { key: "open", label: "รอตรวจ" },
    ...ALL_STATUSES.filter((s) => s !== "pending" && s !== "reviewing").map((s) => ({ key: s, label: STATUS_INFO[s].label })),
    { key: "all", label: "ทั้งหมด" },
  ];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageTitle title="คิวตรวจ" subtitle={`พบ ${count ?? 0} รายการ · Express จะแสดงก่อนเสมอเมื่อเรียงตามความสำคัญ`} />

      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {statusTabs.map((t) => (
          <Link
            key={t.key}
            href={link({ status: t.key })}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              status === t.key ? "border-gold text-gold" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto]" action="/admin/queue">
        {status !== "open" && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={q} placeholder="ค้นหา ชื่อ IC / SteamHex / Discord ID / ชื่อ Discord" className="input" />
        <select name="category" defaultValue={category} className="input">
          <option value="">ทุกประเภท</option>
          {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
        <select name="tier" defaultValue={tier} className="input">
          <option value="">Normal + Express</option>
          <option value="express">Express</option>
          <option value="normal">Normal</option>
        </select>
        <select name="sort" defaultValue={sort} className="input">
          <option value="priority">เรียงตามความสำคัญ</option>
          <option value="oldest">เก่าสุดก่อน</option>
          <option value="newest">ใหม่สุดก่อน</option>
        </select>
        <button className="btn-gold">กรอง</button>
      </form>

      {rows.length === 0 ? (
        <Empty title="ไม่มีรายการในคิวนี้" />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-line text-left text-xs text-muted">
              <tr>
                <th className="px-4 py-3 font-normal">ผู้เล่น</th>
                <th className="px-4 py-3 font-normal">ประเภท</th>
                <th className="px-4 py-3 font-normal">ชื่อ IC</th>
                <th className="px-4 py-3 font-normal">สถานะ</th>
                <th className="px-4 py-3 font-normal">ส่งเมื่อ</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const p = pmap.get(r.discord_id);
                const claimer = r.claimed_by ? pmap.get(r.claimed_by) : null;
                const cat = CATEGORY_MAP[r.category];
                return (
                  <tr key={r.id} className={cn("border-b border-line/50 transition hover:bg-panel-2/60", r.tier === "express" && "bg-panel-2/50")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={avatarUrl(r.discord_id, p?.avatar)} alt="" className="h-8 w-8 rounded-full" />
                        <div className="min-w-0">
                          <p className="truncate">{p?.global_name || p?.username || r.discord_id}</p>
                          <p className="truncate font-mono text-[11px] text-muted">{r.discord_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5"><CategoryIcon category={r.category} className="h-4 w-4 text-gold" />{cat.name}{sub(r) ? <span className="display ml-1 text-xs text-gold">{sub(r)}</span> : null}</span>
                        <span className="flex gap-1">
                          <TierBadge tier={r.tier} />
                          {r.tier === "express" && (
                            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px]", r.payment_verified ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800")}>
                              {r.payment_verified ? "สลิปยืนยันแล้ว" : "สลิปยังไม่ตรวจ"}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p>{r.ic_name}</p>
                      {r.revision > 0 && <p className="text-[11px] text-orange-800">แก้ไขครั้งที่ {r.revision}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                      {claimer && <p className="mt-1 text-[11px] text-muted">โดย {claimer.global_name || claimer.username}</p>}
                    </td>
                    <td className="px-4 py-3 text-muted" title={fmtDate(r.created_at)}>{timeAgo(r.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/applications/${r.id}`} className="btn-ghost px-3 py-1.5 text-xs">ตรวจ →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <Link href={link({ page: String(page - 1) })} className="btn-ghost px-3 py-1.5">←</Link>}
          <span className="text-muted">หน้า {page} / {totalPages}</span>
          {page < totalPages && <Link href={link({ page: String(page + 1) })} className="btn-ghost px-3 py-1.5">→</Link>}
        </div>
      )}
    </div>
  );
}
