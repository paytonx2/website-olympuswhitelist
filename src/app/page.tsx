import Link from "next/link";
import { CATEGORIES, TIER_LABEL } from "@/lib/constants";
import { getSettings } from "@/lib/settings";
import { getSession } from "@/lib/session";
import { DiscordIcon } from "@/components/site-header";
import { CategoryIcon, IconSeal, Ornament, roman } from "@/components/greek";
import { Alert } from "@/components/ui";

export default async function OverviewPage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const [settings, user] = await Promise.all([getSettings(), getSession()]);

  return (
    <div>
      {/* Hero */}
      <section className="marble relative overflow-hidden border-b border-line">
        <TempleWatermark />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-20 pb-24 text-center sm:pt-28 sm:pb-28">
          <p className="eyebrow">FiveM Roleplay Server</p>
          <h1 className="display mt-6 text-[44px] leading-none font-semibold gold-text sm:text-7xl">OLYMPUS</h1>
          <p className="display mt-3 text-sm tracking-[0.6em] text-ink/70 sm:text-base">ACADEMY</p>
          <Ornament className="mt-8" />
          <p className="mt-8 max-w-xl text-[15px] leading-relaxed text-muted">
            ระบบส่ง Whitelist ออนไลน์ เลือกประเภทที่ต้องการ กรอกข้อมูล แนบไฟล์
            แล้วติดตามผลได้ทุกขั้นตอนที่หน้า My Whitelist
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {user ? (
              <>
                <Link href="/submit" className="btn-gold px-8 py-3">ส่ง Whitelist</Link>
                <Link href="/my" className="btn-ghost px-8 py-3">ติดตามสถานะ</Link>
              </>
            ) : (
              <a href="/api/auth/login" className="btn-gold px-8 py-3">
                <DiscordIcon /> เข้าสู่ระบบด้วย Discord
              </a>
            )}
          </div>
        </div>
        <div className="meander" />
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-8 space-y-3">
          {sp.login_error && (
            <Alert tone="error">
              เข้าสู่ระบบไม่สำเร็จ — {LOGIN_ERRORS[String(sp.login_error)] ?? "กรุณาลองใหม่อีกครั้ง"}
              <span className="ml-2 font-mono text-xs opacity-60">({String(sp.login_error)})</span>
            </Alert>
          )}
          {sp.denied && <Alert tone="error">คุณไม่มีสิทธิ์เข้าถึงหน้านั้น</Alert>}
          {settings.announcement && (
            <Alert tone="info">
              <span className="eyebrow mr-3">ประกาศ</span>
              <span className="whitespace-pre-line">{settings.announcement}</span>
            </Alert>
          )}
        </div>

        {/* Categories */}
        <section className="pt-16">
          <div className="text-center">
            <p className="eyebrow">Whitelist</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">ประเภทที่เปิดรับ</h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {CATEGORIES.map((c, i) => {
              const open = settings.open[c.key];
              return (
                <article key={c.key} className="card group relative flex flex-col overflow-hidden p-7 transition hover:-translate-y-0.5 hover:border-gold-soft">
                  <CategoryIcon
                    category={c.key}
                    className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 text-gold/[0.06] transition group-hover:text-gold/[0.1]"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <IconSeal category={c.key} size="lg" />
                      <div>
                        <p className="display text-[11px] text-gold">{roman(i + 1)} · {c.short.toUpperCase()}</p>
                        <h3 className="mt-1 text-xl font-semibold text-ink">{c.name}</h3>
                      </div>
                    </div>
                    <span
                      className={
                        open
                          ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200"
                          : "rounded-full bg-panel-2 px-2.5 py-1 text-[11px] font-medium text-muted ring-1 ring-line"
                      }
                    >
                      {open ? "เปิดรับ" : "ปิดรับชั่วคราว"}
                    </span>
                  </div>

                  <p className="mt-5 flex-1 text-sm leading-relaxed text-muted">{c.description}</p>

                  {c.key === "demigod" && (
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {settings.lineages.map((l) => (
                        <span key={l.key} title={l.title} className="display rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[9px] text-gold-deep">
                          {l.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-5 text-xs text-muted">
                    {c.tiers.map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <span className={t === "express" ? "h-1.5 w-1.5 rounded-full bg-gold" : "h-1.5 w-1.5 rounded-full bg-line"} />
                        {TIER_LABEL[t]}
                        {t === "express" && <span className="text-gold-deep">{settings.expressPrice} บาท</span>}
                      </span>
                    ))}
                    {c.interview && (
                      <span className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                        สัมภาษณ์ผ่าน Ticket
                      </span>
                    )}
                    <span className="ml-auto">
                      {open ? (
                        <Link href={`/submit/${c.key}`} className="btn-gold px-5 py-2 text-xs">
                          สมัคร <Arrow />
                        </Link>
                      ) : (
                        <span className="btn-ghost cursor-not-allowed px-5 py-2 text-xs opacity-60">ปิดรับ</span>
                      )}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Steps */}
        <section className="pt-24">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold text-ink">ขั้นตอนการส่ง</h2>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["เข้าสู่ระบบ", "ล็อกอินด้วยบัญชี Discord ของคุณ"],
              ["เลือกประเภท", "เลือก Whitelist และรูปแบบ Normal หรือ Express"],
              ["กรอกข้อมูล", "กรอกข้อมูล แนบไฟล์ PDF และสลิปสำหรับ Express"],
              ["ติดตามผล", "ดูสถานะที่ My Whitelist และรอแจ้งเตือนทาง Discord"],
            ].map(([t, d], i) => (
              <li key={t} className="bg-panel p-7">
                <span className="display text-3xl font-semibold gold-text">{roman(i + 1)}</span>
                <p className="mt-4 font-medium text-ink">{t}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

const LOGIN_ERRORS: Record<string, string> = {
  cancelled: "คุณกดยกเลิกการอนุญาตใน Discord",
  state: "เซสชันล็อกอินหมดอายุ กรุณากดเข้าสู่ระบบใหม่อีกครั้ง",
  discord: "เชื่อมต่อ Discord ไม่ได้ (ตรวจ DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / Redirect URI)",
  database: "บันทึกข้อมูลไม่ได้ (ตรวจว่ารัน schema.sql แล้ว และคีย์ Supabase ถูกต้อง)",
  secret: "ตั้งค่า AUTH_SECRET ไม่ถูกต้อง (ต้องยาวอย่างน้อย 32 ตัวอักษร)",
};

function Arrow() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/** ภาพวิหารเส้นบาง ๆ เป็นลายน้ำด้านหลัง hero */
function TempleWatermark() {
  return (
    <svg
      viewBox="0 0 600 300"
      className="pointer-events-none absolute left-1/2 top-1/2 w-[900px] max-w-none -translate-x-1/2 -translate-y-1/2 text-gold-soft/40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      aria-hidden
    >
      <path d="M60 90 300 20l240 70z" />
      <path d="M90 84 300 30l210 54" />
      <path d="M60 90h480M70 102h460" />
      {Array.from({ length: 8 }).map((_, i) => {
        const x = 100 + i * 57;
        return (
          <g key={i}>
            <path d={`M${x - 14} 106h28M${x - 11} 112h22`} />
            <path d={`M${x - 9} 112v150M${x + 9} 112v150`} />
            <path d={`M${x - 3} 116v142M${x + 3} 116v142`} strokeOpacity="0.5" />
            <path d={`M${x - 12} 262h24`} />
          </g>
        );
      })}
      <path d="M50 268h500M40 278h520M30 288h540" />
    </svg>
  );
}
