import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_MAP, EVENT_LABEL, STATUS_INFO, type Status } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { db, signedUrl } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { Field, StatusBadge, TierBadge } from "@/components/ui";
import { IconSeal } from "@/components/greek";
import { Alert } from "@/components/ui";

const PLAYER_VISIBLE = ["submitted", "resubmitted", "claimed", "needs_edit", "interview", "approved", "rejected", "payment_verified"];

const NEXT_STEP: Record<Status, string> = {
  pending: "ใบสมัครของคุณอยู่ในคิว รอทีมงานตรวจสอบ",
  reviewing: "ทีมงานกำลังตรวจสอบใบสมัครของคุณ",
  needs_edit: "ทีมงานขอให้แก้ไขข้อมูล กดปุ่ม “แก้ไขใบสมัคร” เพื่อแก้ไขและส่งใหม่",
  interview: "คุณผ่านการคัดเลือกแล้ว! กรุณาเปิด Ticket ใน Discord เพื่อนัดสัมภาษณ์",
  approved: "ยินดีด้วย! คุณผ่าน Whitelist แล้ว เข้าเล่นได้เลย",
  rejected: "ใบสมัครนี้ไม่ผ่าน สามารถส่งใบสมัครใหม่ได้",
};

export default async function MyDetail({ params, searchParams }: PageProps<"/my/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/my/${id}`);
  const { data: a } = await db().from("applications").select("*").eq("id", id).maybeSingle();
  if (!a || a.discord_id !== user.id) notFound();

  const [settings, { data: events }, pdfUrl, slipUrl] = await Promise.all([
    getSettings(),
    db()
      .from("application_events")
      .select("action, created_at, detail")
      .eq("application_id", id)
      .in("action", PLAYER_VISIBLE)
      .order("created_at"),
    signedUrl(a.pdf_path),
    signedUrl(a.slip_path),
  ]);

  const cat = CATEGORY_MAP[a.category as keyof typeof CATEGORY_MAP];
  const status = a.status as Status;
  const lineage = settings.lineages.find((l) => l.key === a.lineage);
  const extra = settings.extraRoles.find((r) => r.key === a.extra_role);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/my" className="text-sm text-muted hover:text-ink">← My Whitelist</Link>

      {sp.submitted && (
        <div className="mt-4">
          <Alert tone="success">ส่งใบสมัครเรียบร้อยแล้ว ระบบจะแจ้งผลผ่าน Discord DM และหน้านี้</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <IconSeal category={a.category} size="lg" />
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{cat.name}</h1>
        <TierBadge tier={a.tier} />
        <StatusBadge status={status} />
      </div>

      <div className={`card mt-6 p-5 ring-1 ${STATUS_INFO[status].className}`}>
        <p className="text-sm">{NEXT_STEP[status]}</p>
        {a.reason && (status === "needs_edit" || status === "rejected" || status === "interview" || status === "approved") && (
          <p className="mt-2 whitespace-pre-line text-sm opacity-90">ข้อความจากทีมงาน: {a.reason}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "needs_edit" && (
            <Link href={`/submit/${a.category}?edit=${a.id}`} className="btn bg-orange-600 text-white hover:bg-orange-700">แก้ไขใบสมัคร</Link>
          )}
          {status === "interview" && settings.ticketUrl && (
            <a href={settings.ticketUrl} target="_blank" rel="noreferrer" className="btn bg-violet-700 text-white hover:bg-violet-800">เปิด Ticket สัมภาษณ์</a>
          )}
          {status === "rejected" && <Link href={`/submit/${a.category}`} className="btn-gold">ส่งใบสมัครใหม่</Link>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="card p-5">
          <h2 className="mb-4 font-semibold">ข้อมูลที่ส่ง</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {lineage && <Field label="สายเลือดเทพ" value={`${lineage.name} — ${lineage.title}`} />}
            {extra && <Field label="ตำแหน่ง" value={extra.name} />}
            <Field label="ชื่อตัวละคร IC" value={a.ic_name} />
            <Field label="คำอ่าน" value={a.ic_name_reading} />
            <Field label="ปีการศึกษา" value={a.academic_year} />
            <Field label="สีผม / สีตา" value={a.hair_eye_color} />
            <Field label="อายุ OC" value={a.oc_age} />
            <Field label="เพศ OC" value={a.oc_gender} />
            <Field label="SteamHex" value={a.steam_hex} mono />
            <Field label="Discord ID" value={a.discord_id} mono />
            <Field label="Facebook" value={<a href={a.facebook_url} target="_blank" rel="noreferrer" className="text-gold hover:underline">{a.facebook_url}</a>} />
            <Field label="Email" value={a.email} />
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="btn-ghost text-xs">ดูไฟล์ Whitelist</a>}
            {slipUrl && <a href={slipUrl} target="_blank" rel="noreferrer" className="btn-ghost text-xs">ดูสลิป</a>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 font-semibold">ไทม์ไลน์</h2>
          <ol className="relative space-y-4 border-l border-line pl-5">
            {(events ?? []).map((e, i) => (
              <li key={i} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rotate-45 border border-gold bg-white" />
                <p className="text-sm">{EVENT_LABEL[e.action] ?? e.action}</p>
                <p className="text-xs text-muted">{fmtDate(e.created_at)}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
