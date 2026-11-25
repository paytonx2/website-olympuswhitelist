import Link from "next/link";
import { CATEGORY_MAP, type Category, type Status, type Tier } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { Empty, PageTitle, StatusBadge, TierBadge } from "@/components/ui";
import { IconSeal } from "@/components/greek";

export const metadata = { title: "My Whitelist" };

type Row = {
  id: string;
  category: Category;
  tier: Tier;
  status: Status;
  ic_name: string;
  lineage: string | null;
  extra_role: string | null;
  reason: string | null;
  revision: number;
  created_at: string;
  updated_at: string;
};

export default async function MyPage() {
  const user = await requireUser("/my");
  const settings = await getSettings();
  const { data } = await db()
    .from("applications")
    .select("id, category, tier, status, ic_name, lineage, extra_role, reason, revision, created_at, updated_at")
    .eq("discord_id", user.id)
    .order("created_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const sub = (r: Row) =>
    r.lineage
      ? settings.lineages.find((l) => l.key === r.lineage)?.name
      : r.extra_role
        ? settings.extraRoles.find((x) => x.key === r.extra_role)?.name
        : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageTitle eyebrow="My Whitelist" title="ใบสมัครของฉัน" subtitle="ประวัติการส่ง Whitelist และสถานะล่าสุด">
        <Link href="/submit" className="btn-gold">ส่ง Whitelist ใหม่</Link>
      </PageTitle>

      {rows.length === 0 ? (
        <Empty title="ยังไม่เคยส่ง Whitelist">
          <Link href="/submit" className="btn-gold mt-2">เริ่มส่ง Whitelist</Link>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const cat = CATEGORY_MAP[r.category];
            return (
              <li key={r.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <IconSeal category={r.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{cat.name}</p>
                    {sub(r) && <span className="display text-[11px] text-gold-deep">{sub(r)}</span>}
                    <TierBadge tier={r.tier} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-muted">
                    {r.ic_name} · ส่งเมื่อ {fmtDate(r.created_at)}
                    {r.revision > 0 && ` · แก้ไข ${r.revision} ครั้ง`}
                  </p>
                  {(r.status === "needs_edit" || r.status === "rejected") && r.reason && (
                    <p className="mt-2 line-clamp-2 text-sm text-orange-800">เหตุผล: {r.reason}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                  <StatusBadge status={r.status} />
                  <div className="flex gap-2">
                    {r.status === "needs_edit" && (
                      <Link href={`/submit/${r.category}?edit=${r.id}`} className="btn bg-orange-600 px-3.5 py-1.5 text-xs text-white hover:bg-orange-700">
                        แก้ไข
                      </Link>
                    )}
                    {r.status === "interview" && settings.ticketUrl && (
                      <a href={settings.ticketUrl} target="_blank" rel="noreferrer" className="btn bg-violet-700 px-3.5 py-1.5 text-xs text-white hover:bg-violet-800">
                        เปิด Ticket
                      </a>
                    )}
                    <Link href={`/my/${r.id}`} className="btn-ghost px-3 py-1.5 text-xs">รายละเอียด</Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
