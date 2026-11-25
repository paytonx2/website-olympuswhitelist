import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORY_MAP, EVENT_LABEL, type Status } from "@/lib/constants";
import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { db, signedUrl } from "@/lib/supabase";
import { avatarUrl, fmtDate, timeAgo } from "@/lib/utils";
import { Field, StatusBadge, TierBadge } from "@/components/ui";
import { ReviewPanel } from "./review-panel";
import { CategoryIcon } from "@/components/greek";

export const metadata = { title: "ตรวจใบสมัคร" };

export default async function ReviewPage({ params }: PageProps<"/admin/applications/[id]">) {
  const { id } = await params;
  const { user, role } = await requireStaff();
  const { data: a } = await db().from("applications").select("*").eq("id", id).maybeSingle();
  if (!a) notFound();

  const q = (v: unknown) => `"${String(v).replace(/["\%*]/g, "")}"`;
  const [settings, { data: profile }, { data: events }, { data: history }, { data: dupes }, pdfUrl, slipUrl, { data: nextApp }] =
    await Promise.all([
      getSettings(),
      db().from("profiles").select("*").eq("discord_id", a.discord_id).maybeSingle(),
      db().from("application_events").select("*").eq("application_id", id).order("created_at", { ascending: false }),
      db()
        .from("applications")
        .select("id, category, tier, status, ic_name, created_at")
        .eq("discord_id", a.discord_id)
        .neq("id", id)
        .order("created_at", { ascending: false }),
      db()
        .from("applications")
        .select("id, discord_id, ic_name, steam_hex, status, category")
        .neq("discord_id", a.discord_id)
        .or(`steam_hex.ilike.${q(a.steam_hex)},ic_name.ilike.${q(a.ic_name)},email.ilike.${q(a.email)}`)
        .limit(10),
      signedUrl(a.pdf_path, 60 * 60),
      signedUrl(a.slip_path, 60 * 60),
      db()
        .from("applications")
        .select("id")
        .in("status", ["pending"])
        .neq("id", id)
        .order("tier", { ascending: true })
        .order("updated_at", { ascending: true })
        .limit(1),
    ]);

  const actorIds = [...new Set([...(events ?? []).map((e) => e.actor_id), a.claimed_by, a.decided_by].filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await db().from("profiles").select("discord_id, username, global_name").in("discord_id", actorIds)
    : { data: [] as { discord_id: string; username: string; global_name: string | null }[] };
  const nameOf = (id: string | null) => {
    if (!id) return "-";
    const p = (actors ?? []).find((x) => x.discord_id === id);
    return p ? p.global_name || p.username : id;
  };

  const cat = CATEGORY_MAP[a.category as keyof typeof CATEGORY_MAP];
  const lineage = settings.lineages.find((l) => l.key === a.lineage);
  const extra = settings.extraRoles.find((r) => r.key === a.extra_role);
  const flags: string[] = [];
  if (dupes?.some((d) => d.steam_hex.toLowerCase() === a.steam_hex.toLowerCase())) flags.push("SteamHex นี้ถูกใช้โดย Discord อื่น");
  if (dupes?.some((d) => d.ic_name.toLowerCase() === a.ic_name.toLowerCase())) flags.push("ชื่อ IC ซ้ำกับผู้เล่นอื่น");
  if (dupes?.length && !flags.length) flags.push("อีเมลซ้ำกับผู้เล่นอื่น");
  if (a.oc_age < 15) flags.push(`อายุ OC น้อย (${a.oc_age} ปี)`);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/queue" className="text-sm text-muted hover:text-ink">← กลับไปคิวตรวจ</Link>
        {nextApp?.[0] && (
          <Link href={`/admin/applications/${nextApp[0].id}`} className="text-sm text-gold hover:underline">ใบถัดไปในคิว →</Link>
        )}
      </div>

      {/* Header */}
      <div className="card mb-5 flex flex-wrap items-center gap-4 p-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl(a.discord_id, profile?.avatar, 128)} alt="" className="h-14 w-14 rounded-full ring-2 ring-gold-soft ring-offset-2" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{a.ic_name}</h1>
            <span className="text-sm text-muted">({a.ic_name_reading})</span>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            {profile?.global_name || profile?.username} · <span className="font-mono">{a.discord_id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm"><CategoryIcon category={a.category} className="h-4 w-4 text-gold" />{cat.name}</span>
          {lineage && <span className="display rounded-md bg-gold/10 px-2 py-0.5 text-xs text-gold">{lineage.name}</span>}
          {extra && <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs text-gold">{extra.name}</span>}
          <TierBadge tier={a.tier} />
          <StatusBadge status={a.status as Status} />
        </div>
      </div>

      {flags.length > 0 && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-medium">ข้อควรตรวจสอบ</p>
          <ul className="mt-1 list-inside list-disc">
            {flags.map((f) => <li key={f}>{f}</li>)}
          </ul>
          {dupes?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {dupes.map((d) => (
                <Link key={d.id} href={`/admin/applications/${d.id}`} className="rounded bg-rose-100 px-2 py-0.5 text-xs hover:bg-rose-100">
                  {d.ic_name} · {d.steam_hex}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,1fr)]">
        {/* LEFT: PDF */}
        <div className="card flex min-h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-sm">
            <span className="font-medium">ไฟล์ Whitelist</span>
            {pdfUrl && <a href={pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-gold hover:underline">เปิดแท็บใหม่ ↗</a>}
          </div>
          {pdfUrl ? (
            <iframe src={pdfUrl} className="h-full min-h-[70vh] w-full flex-1 bg-panel-2" title="PDF" />
          ) : (
            <p className="p-6 text-sm text-muted">ไม่พบไฟล์</p>
          )}
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          <ReviewPanel
            id={a.id}
            role={role}
            me={user.id}
            status={a.status}
            tier={a.tier}
            interview={cat.interview}
            paymentVerified={a.payment_verified}
            claimedBy={a.claimed_by ? { id: a.claimed_by, name: nameOf(a.claimed_by) } : null}
            internalNote={a.internal_note ?? ""}
            reasonTemplates={settings.reasonTemplates}
            roleSync={a.role_sync}
            nextId={nextApp?.[0]?.id ?? null}
          />

          <div className="card p-5">
            <h2 className="mb-4 font-semibold">ข้อมูลในฟอร์ม</h2>
            <dl className="grid grid-cols-2 gap-4">
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
              <Field label="Facebook" value={<a href={a.facebook_url} target="_blank" rel="noreferrer" className="text-gold hover:underline">เปิดลิงก์ ↗</a>} />
              <Field label="Email" value={a.email} />
              <Field label="ส่งครั้งแรก" value={fmtDate(a.created_at)} />
              <Field label="แก้ไขแล้ว" value={`${a.revision} ครั้ง`} />
            </dl>
          </div>

          {a.tier === "express" && (
            <div className="card p-5">
              <h2 className="mb-3 font-semibold">สลิปโอนเงิน · {settings.expressPrice} บาท</h2>
              {slipUrl ? (
                <a href={slipUrl} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipUrl} alt="สลิป" className="max-h-[480px] w-full rounded-xl border border-line object-contain" />
                </a>
              ) : (
                <p className="text-sm text-muted">ไม่มีสลิป</p>
              )}
            </div>
          )}

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">ประวัติผู้เล่นคนนี้</h2>
            {history?.length ? (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <Link href={`/admin/applications/${h.id}`} className="truncate hover:text-gold">
                      {CATEGORY_MAP[h.category as keyof typeof CATEGORY_MAP].name} · {h.ic_name}
                      <span className="ml-1 text-xs text-muted">{timeAgo(h.created_at)}</span>
                    </Link>
                    <StatusBadge status={h.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">ไม่มีใบสมัครอื่น</p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-semibold">Log ของใบสมัครนี้</h2>
            <ol className="space-y-2.5 text-sm">
              {(events ?? []).map((e) => (
                <li key={e.id}>
                  <span className="text-ink">{nameOf(e.actor_id)}</span>{" "}
                  <span className="text-muted">{EVENT_LABEL[e.action] ?? e.action}</span>
                  {e.detail?.reason && <p className="ml-3 text-xs text-muted">“{e.detail.reason}”</p>}
                  {e.detail?.result && <p className="ml-3 text-xs text-muted">{e.detail.result}</p>}
                  <p className="text-[11px] text-muted/70">{fmtDate(e.created_at)}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
