"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GENDERS,
  MAX_PDF_BYTES,
  MAX_SLIP_BYTES,
  SLIP_MIME,
  TIER_LABEL,
  type Category,
  type Tier,
} from "@/lib/constants";
import { validateApplication, type ApplicationInput, type FieldErrors } from "@/lib/validation";
import { createUploadTarget, submitApplication } from "@/app/submit/actions";
import { browserSupabase } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";
import { roman } from "@/components/greek";

type Options = {
  academicYears: string[];
  lineages: { key: string; name: string; title: string }[];
  extraRoles: { key: string; name: string }[];
  expressPrice: number;
  bank: { bankName: string; accountNumber: string; accountName: string };
  qrImageUrl: string;
};

export function ApplicationForm({
  category,
  tiers,
  discordId,
  editId,
  initial,
  existingFiles,
  options,
}: {
  category: Category;
  tiers: Tier[];
  discordId: string;
  editId: string | null;
  initial?: Partial<ApplicationInput>;
  existingFiles?: { pdf: boolean; slip: boolean };
  options: Options;
}) {
  const router = useRouter();
  const [v, setV] = useState<ApplicationInput>({
    category,
    tier: tiers[0],
    lineage: "",
    extra_role: "",
    ic_name: "",
    ic_name_reading: "",
    academic_year: "",
    oc_age: "",
    oc_gender: "",
    hair_eye_color: "",
    steam_hex: "",
    facebook_url: "",
    email: "",
    ...initial,
  });
  const [pdf, setPdf] = useState<File | null>(null);
  const [slip, setSlip] = useState<File | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const showMode = tiers.length > 1 || category === "demigod" || category === "extra";
  const o = showMode ? 0 : -1;
  const slipPreview = useMemo(() => (slip ? URL.createObjectURL(slip) : null), [slip]);

  const set = (k: keyof ApplicationInput) => (e: { target: { value: string } }) => {
    setV((s) => ({ ...s, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function upload(kind: "pdf" | "slip", file: File) {
    const t = await createUploadTarget(kind, file.type, file.size);
    if (!t.ok) throw new Error(t.error);
    const { error } = await browserSupabase()
      .storage.from("whitelist")
      .uploadToSignedUrl(t.path, t.token, file, { contentType: file.type });
    if (error) throw new Error(`อัปโหลด${kind === "pdf" ? "ไฟล์ PDF" : "สลิป"}ไม่สำเร็จ`);
    return t.path;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const errs = validateApplication(v, {
      tiers,
      academicYears: options.academicYears,
      lineageKeys: options.lineages.map((l) => l.key),
      extraRoleKeys: options.extraRoles.map((r) => r.key),
    });
    if (!pdf && !existingFiles?.pdf) errs.pdf = "กรุณาแนบไฟล์ Whitelist (PDF)";
    if (v.tier === "express" && !slip && !existingFiles?.slip) errs.slip = "กรุณาแนบหลักฐานการโอนเงิน";
    if (!confirm) {
      setMessage("กรุณาติ๊กยืนยันว่าข้อมูลถูกต้องก่อนส่ง");
    }
    setErrors(errs);
    if (Object.keys(errs).length || !confirm) {
      if (Object.keys(errs).length) setMessage("กรุณาตรวจสอบข้อมูลที่ไฮไลต์ไว้");
      topRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }

    try {
      let pdfPath: string | null = null;
      let slipPath: string | null = null;
      if (pdf) {
        setBusy("กำลังอัปโหลดไฟล์ PDF…");
        pdfPath = await upload("pdf", pdf);
      }
      if (v.tier === "express" && slip) {
        setBusy("กำลังอัปโหลดสลิป…");
        slipPath = await upload("slip", slip);
      }
      setBusy("กำลังส่งใบสมัคร…");
      const res = await submitApplication({ input: v, pdfPath, slipPath, editId });
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setMessage(res.message ?? "ส่งไม่สำเร็จ");
        setBusy(null);
        topRef.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      router.push(`/my/${res.id}?submitted=1`);
    } catch (err) {
      setMessage((err as Error).message);
      setBusy(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div ref={topRef} />
      {message && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {message}
        </div>
      )}

      {/* รูปแบบ */}
      {showMode && (
        <Section title="รูปแบบการสมัคร" step={1}>
          {tiers.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {tiers.map((t) => (
                <label
                  key={t}
                  className={cn(
                    "flex cursor-pointer flex-col rounded-xl border p-4 transition",
                    v.tier === t ? "border-gold bg-panel-2 shadow-[inset_0_0_0_1px_var(--color-gold)]" : "border-line hover:border-gold/40",
                  )}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t}
                    checked={v.tier === t}
                    onChange={set("tier")}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between font-semibold">
                                        {TIER_LABEL[t]}
                    {t === "express" && <span className="text-sm text-gold">{options.expressPrice} บาท</span>}
                  </span>
                  <span className="mt-1 text-xs text-muted">
                    {t === "express" ? "ได้รับการตรวจก่อน (ต้องแนบสลิปโอนเงิน)" : "ตรวจตามคิวปกติ ไม่มีค่าใช้จ่าย"}
                  </span>
                </label>
              ))}
            </div>
          )}

          {category === "demigod" && (
            <div className={tiers.length > 1 ? "mt-6" : ""}>
              <p className="label">เลือกสายเลือดของเทพ</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {options.lineages.map((l) => (
                  <label
                    key={l.key}
                    className={cn(
                      "cursor-pointer rounded-xl border p-3 transition",
                      v.lineage === l.key ? "border-gold bg-panel-2 shadow-[inset_0_0_0_1px_var(--color-gold)]" : "border-line hover:border-gold/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="lineage"
                      value={l.key}
                      checked={v.lineage === l.key}
                      onChange={set("lineage")}
                      className="sr-only"
                    />
                    <span className="display block text-sm font-semibold text-gold-deep">{l.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{l.title}</span>
                  </label>
                ))}
              </div>
              <Err msg={errors.lineage} />
            </div>
          )}

          {category === "extra" && (
            <div>
              <p className="label">ตำแหน่งที่ต้องการสมัคร</p>
              <div className="flex flex-wrap gap-2">
                {options.extraRoles.map((r) => (
                  <label
                    key={r.key}
                    className={cn(
                      "cursor-pointer rounded-xl border px-4 py-2 text-sm transition",
                      v.extra_role === r.key ? "border-gold bg-panel-2 text-gold-deep shadow-[inset_0_0_0_1px_var(--color-gold)]" : "border-line hover:border-gold/40",
                    )}
                  >
                    <input
                      type="radio"
                      name="extra_role"
                      value={r.key}
                      checked={v.extra_role === r.key}
                      onChange={set("extra_role")}
                      className="sr-only"
                    />
                    {r.name}
                  </label>
                ))}
              </div>
              <Err msg={errors.extra_role} />
            </div>
          )}
        </Section>
      )}

      <Section title="ข้อมูลตัวละคร (IC)" step={2+o}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="ชื่อตัวละคร IC" value={v.ic_name} onChange={set("ic_name")} err={errors.ic_name} placeholder="เช่น Alexander Thorne" />
          <Input label="คำอ่านตัวละคร IC" value={v.ic_name_reading} onChange={set("ic_name_reading")} err={errors.ic_name_reading} placeholder="เช่น อเล็กซานเดอร์ ธอร์น" />
          <div>
            <label className="label">ปีการศึกษาที่สมัคร</label>
            <select className="input" value={v.academic_year} onChange={set("academic_year")}>
              <option value="">— เลือก —</option>
              {options.academicYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <Err msg={errors.academic_year} />
          </div>
          <Input label="สีผม / สีตาตัวละคร" value={v.hair_eye_color} onChange={set("hair_eye_color")} err={errors.hair_eye_color} placeholder="เช่น ผมสีเงิน / ตาสีฟ้า" />
        </div>
      </Section>

      <Section title="ข้อมูลผู้เล่น (OC)" step={3+o}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="อายุ OC" type="number" inputMode="numeric" value={v.oc_age} onChange={set("oc_age")} err={errors.oc_age} />
          <div>
            <label className="label">เพศ OC</label>
            <select className="input" value={v.oc_gender} onChange={set("oc_gender")}>
              <option value="">— เลือก —</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <Err msg={errors.oc_gender} />
          </div>
          <Input
            label="SteamHex"
            value={v.steam_hex}
            onChange={set("steam_hex")}
            err={errors.steam_hex}
            placeholder="steam:110000xxxxxxxxx"
            className="font-mono"
            hint="ดูได้จาก steamid.pro หรือ F8 ในเกม"
          />
          <div>
            <label className="label">Discord ID</label>
            <input className="input cursor-not-allowed bg-panel-2 font-mono text-muted" value={discordId} readOnly />
            <p className="hint">ดึงจากบัญชี Discord ที่ล็อกอินอัตโนมัติ</p>
          </div>
          <Input label="Link Facebook (IC หรือ OC)" value={v.facebook_url} onChange={set("facebook_url")} err={errors.facebook_url} placeholder="https://facebook.com/..." />
          <Input label="Email สำหรับรับจดหมาย" type="email" value={v.email} onChange={set("email")} err={errors.email} placeholder="you@example.com" />
        </div>
      </Section>

      <Section title="ไฟล์ Whitelist" step={4+o}>
        <FilePick
          accept="application/pdf"
          file={pdf}
          onFile={(f) => {
            if (f && f.type !== "application/pdf") return setErrors((e) => ({ ...e, pdf: "รองรับเฉพาะไฟล์ PDF" }));
            if (f && f.size > MAX_PDF_BYTES) return setErrors((e) => ({ ...e, pdf: "ไฟล์ต้องไม่เกิน 10MB" }));
            setPdf(f);
            setErrors((e) => ({ ...e, pdf: undefined }));
          }}
          label="เลือกไฟล์ PDF"
          hint={existingFiles?.pdf && !pdf ? "มีไฟล์เดิมอยู่แล้ว — เลือกไฟล์ใหม่ถ้าต้องการเปลี่ยน" : "PDF เท่านั้น ขนาดไม่เกิน 10MB"}
          icon="pdf"
        />
        <Err msg={errors.pdf} />
      </Section>

      {v.tier === "express" && (
        <Section title="ชำระเงิน Express" step={5+o}>
          <div className="grid gap-6 sm:grid-cols-[200px_1fr]">
            <div className="grid aspect-square place-items-center overflow-hidden rounded-xl border border-dashed border-gold-soft bg-panel-2">
              {options.qrImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={options.qrImageUrl} alt="QR Code" className="h-full w-full object-contain bg-white" />
              ) : (
                <span className="px-4 text-center text-xs text-muted">QR Code<br />(ยังไม่ได้ตั้งค่า)</span>
              )}
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-gold-soft/70 bg-panel-2 p-4">
                <p className="text-muted">ยอดที่ต้องชำระ</p>
                <p className="display text-3xl font-semibold gold-text">{options.expressPrice} บาท</p>
              </div>
              <dl className="grid gap-2">
                <Row k="ธนาคาร" v={options.bank.bankName} />
                <Row k="เลขบัญชี" v={<CopyText text={options.bank.accountNumber} />} />
                <Row k="ชื่อบัญชี" v={options.bank.accountName} />
              </dl>
            </div>
          </div>
          <div className="mt-6">
            <p className="label">หลักฐานการโอนเงิน (รูปสลิป)</p>
            <FilePick
              accept={SLIP_MIME.join(",")}
              file={slip}
              onFile={(f) => {
                if (f && !SLIP_MIME.includes(f.type)) return setErrors((e) => ({ ...e, slip: "รองรับ PNG/JPG/WEBP" }));
                if (f && f.size > MAX_SLIP_BYTES) return setErrors((e) => ({ ...e, slip: "รูปต้องไม่เกิน 5MB" }));
                setSlip(f);
                setErrors((e) => ({ ...e, slip: undefined }));
              }}
              label="เลือกรูปสลิป"
              hint={existingFiles?.slip && !slip ? "มีสลิปเดิมอยู่แล้ว — เลือกรูปใหม่ถ้าต้องการเปลี่ยน" : "PNG / JPG / WEBP ไม่เกิน 5MB"}
              icon="image"
            />
            {slipPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slipPreview} alt="ตัวอย่างสลิป" className="mt-3 max-h-72 rounded-xl border border-line" />
            )}
            <Err msg={errors.slip} />
          </div>
        </Section>
      )}

      <div className="card p-5">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#a07d32]"
          />
          <span>ข้าพเจ้ายืนยันว่าข้อมูลทั้งหมดถูกต้อง และยอมรับกฎของเซิร์ฟเวอร์ OLYMPUS ACADEMY</span>
        </label>
        <button type="submit" disabled={!!busy} className="btn-gold mt-5 w-full py-3 text-base">
          {busy ?? (editId ? "บันทึกการแก้ไขและส่งใหม่" : "ส่ง Whitelist")}
        </button>
      </div>
    </form>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="mb-6 flex items-center gap-4 border-b border-line pb-4 text-lg font-semibold text-ink">
        <span className="display grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gold-soft bg-panel-2 text-[13px] text-gold-deep">
          {roman(step)}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1.5 text-xs text-rose-800">{msg}</p>;
}

function Input({
  label,
  err,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; err?: string; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input {...props} className={cn("input", err && "border-rose-500/70", className)} />
      {err ? <Err msg={err} /> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

function FilePick({
  accept,
  file,
  onFile,
  label,
  hint,
  icon,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
  hint: string;
  icon: "pdf" | "image";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        onFile(e.dataTransfer.files?.[0] ?? null);
      }}
      className={cn(
        "flex cursor-pointer items-center gap-4 rounded-xl border border-dashed p-4 transition",
        drag ? "border-gold bg-panel-2 shadow-[inset_0_0_0_1px_var(--color-gold)]" : "border-line hover:border-gold/50",
      )}
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-panel-2 text-gold">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {icon === "pdf" ? (
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4" />
          ) : (
            <path d="M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM4 16l5-5 4 4 2-2 5 5M15.5 8.5h.01" />
          )}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file ? file.name : label}</p>
        <p className="text-xs text-muted">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : hint} · คลิกหรือลากไฟล์มาวาง
        </p>
      </div>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0">
      <dt className="text-muted">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  );
}

function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text.replace(/-/g, ""));
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="font-mono hover:text-gold"
      title="คัดลอก"
    >
      {text} <span className="ml-1 text-xs text-muted">{done ? "คัดลอกแล้ว" : "คัดลอก"}</span>
    </button>
  );
}
