import Link from "next/link";
import { CATEGORIES, ACTIVE_STATUSES, type Status, type Category } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/supabase";
import { PageTitle, StatusBadge } from "@/components/ui";
import { IconSeal } from "@/components/greek";

export const metadata = { title: "ส่ง Whitelist" };

export default async function SubmitIndex() {
  const user = await requireUser("/submit");
  const settings = await getSettings();
  const { data } = await db()
    .from("applications")
    .select("category, status")
    .eq("discord_id", user.id)
    .in("status", [...ACTIVE_STATUSES, "approved"]);
  const current = new Map<Category, Status>((data ?? []).map((r) => [r.category, r.status]));

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageTitle eyebrow="Submit" title="ส่ง Whitelist" subtitle="เลือกประเภท Whitelist ที่ต้องการสมัคร" />
      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c) => {
          const st = current.get(c.key);
          const open = settings.open[c.key];
          const disabled = !open || !!st;
          const body = (
            <>
              <div className="flex items-center gap-3">
                <IconSeal category={c.key} />
                <div className="flex-1">
                  <p className="text-lg font-semibold text-ink" style={{ fontFamily: "var(--font-heading)" }}>{c.name}</p>
                  <p className="text-xs text-muted">
                    {c.tiers.length > 1 ? "Normal / Express" : "Normal"}
                    {c.interview ? " · มีสัมภาษณ์" : ""}
                  </p>
                </div>
                {st ? <StatusBadge status={st} /> : !open ? <span className="text-xs text-muted">ปิดรับ</span> : <span className="text-sm text-gold">เลือก</span>}
              </div>
              <p className="mt-3 text-sm text-muted">{c.description}</p>
            </>
          );
          return disabled ? (
            <div key={c.key} className="card cursor-not-allowed p-6 opacity-60">{body}</div>
          ) : (
            <Link key={c.key} href={`/submit/${c.key}`} className="card p-6 transition hover:-translate-y-0.5 hover:border-gold-soft">
              {body}
            </Link>
          );
        })}
      </div>
      {current.size > 0 && (
        <p className="mt-6 text-sm text-muted">
          ประเภทที่มีใบสมัครค้างอยู่หรือผ่านแล้วจะส่งซ้ำไม่ได้ ดูรายละเอียดได้ที่{" "}
          <Link href="/my" className="text-gold underline-offset-4 hover:underline">My Whitelist</Link>
        </p>
      )}
    </div>
  );
}
