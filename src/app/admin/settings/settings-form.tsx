"use client";

import { useState, useTransition } from "react";
import { CATEGORIES } from "@/lib/constants";
import type { SiteSettings } from "@/lib/settings";
import { updateSettings } from "../actions";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/greek";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const up = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((x) => ({ ...x, [k]: v }));

  function save() {
    setFlash(null);
    start(async () => {
      const r = await updateSettings(s);
      setFlash({ ok: r.ok, text: r.message ?? (r.ok ? "บันทึกแล้ว" : "บันทึกไม่สำเร็จ") });
    });
  }

  return (
    <div className="space-y-6 pb-24">
      <Card title="เปิด / ปิดรับสมัคร">
        <div className="grid gap-3 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3">
              <span className="flex items-center gap-2"><CategoryIcon category={c.key} className="h-4 w-4 text-gold" />{c.name}</span>
              <Toggle checked={s.open[c.key]} onChange={(v) => up("open", { ...s.open, [c.key]: v })} />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <label className="label">ประกาศหน้าแรก (เว้นว่างถ้าไม่มี)</label>
          <textarea className="input" rows={2} value={s.announcement} onChange={(e) => up("announcement", e.target.value)} />
        </div>
      </Card>

      <Card title="การชำระเงิน Express">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="ราคา Express (บาท)" type="number" value={String(s.expressPrice)} onChange={(v) => up("expressPrice", Number(v))} />
          <Text label="ลิงก์รูป QR Code" value={s.qrImageUrl} onChange={(v) => up("qrImageUrl", v)} placeholder="https://… (ใส่ภายหลังได้)" />
          <Text label="ธนาคาร" value={s.bank.bankName} onChange={(v) => up("bank", { ...s.bank, bankName: v })} />
          <Text label="เลขบัญชี" value={s.bank.accountNumber} onChange={(v) => up("bank", { ...s.bank, accountNumber: v })} />
          <Text label="ชื่อบัญชี" value={s.bank.accountName} onChange={(v) => up("bank", { ...s.bank, accountName: v })} />
        </div>
      </Card>

      <Card title="ลิงก์ & ตัวเลือกฟอร์ม">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="ลิงก์ห้อง Ticket (Discord)" value={s.ticketUrl} onChange={(v) => up("ticketUrl", v)} placeholder="https://discord.com/channels/…" />
          <Text label="ลิงก์เชิญเข้า Discord" value={s.discordInviteUrl} onChange={(v) => up("discordInviteUrl", v)} placeholder="https://discord.gg/…" />
          <div>
            <label className="label">ปีการศึกษา (บรรทัดละ 1 ตัวเลือก)</label>
            <textarea className="input" rows={4} value={s.academicYears.join("\n")} onChange={(e) => up("academicYears", e.target.value.split("\n"))} />
          </div>
          <div>
            <label className="label">เหตุผลสำเร็จรูป (บรรทัดละ 1 ข้อ)</label>
            <textarea className="input" rows={4} value={s.reasonTemplates.join("\n")} onChange={(e) => up("reasonTemplates", e.target.value.split("\n"))} />
          </div>
        </div>
      </Card>

      <Card title="สายเลือดเทพ (ลูกครึ่งเทพ)" subtitle="ใส่ Role ID เพื่อให้ยศสายเลือดอัตโนมัติเมื่อผ่าน">
        <div className="space-y-2">
          {s.lineages.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_1.4fr_auto] gap-2">
              <input className="input display" value={l.name} placeholder="ชื่อเทพ" onChange={(e) => up("lineages", s.lineages.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" value={l.title} placeholder="คำอธิบาย" onChange={(e) => up("lineages", s.lineages.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
              <input className="input font-mono text-xs" value={l.roleId} placeholder="Role ID" onChange={(e) => up("lineages", s.lineages.map((x, j) => (j === i ? { ...x, roleId: e.target.value } : x)))} />
              <button className="btn-ghost px-3" onClick={() => up("lineages", s.lineages.filter((_, j) => j !== i))} title="ลบ">ลบ</button>
            </div>
          ))}
          <button className="btn-ghost text-xs" onClick={() => up("lineages", [...s.lineages, { key: "", name: "", title: "", roleId: "" }])}>+ เพิ่มเทพ</button>
        </div>
      </Card>

      <Card title="ตำแหน่ง Extra Role">
        <div className="space-y-2">
          {s.extraRoles.map((r, i) => (
            <div key={i} className="grid grid-cols-[2fr_1.4fr_auto] gap-2">
              <input className="input" value={r.name} placeholder="ชื่อตำแหน่ง" onChange={(e) => up("extraRoles", s.extraRoles.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input font-mono text-xs" value={r.roleId} placeholder="Role ID" onChange={(e) => up("extraRoles", s.extraRoles.map((x, j) => (j === i ? { ...x, roleId: e.target.value } : x)))} />
              <button className="btn-ghost px-3" onClick={() => up("extraRoles", s.extraRoles.filter((_, j) => j !== i))} title="ลบ">ลบ</button>
            </div>
          ))}
          <button className="btn-ghost text-xs" onClick={() => up("extraRoles", [...s.extraRoles, { key: "", name: "", roleId: "" }])}>+ เพิ่มตำแหน่ง</button>
        </div>
      </Card>

      <Card title="Discord Bot" subtitle="Role ID หลายตัวคั่นด้วยเครื่องหมาย , — คลิกขวาที่ Role ใน Discord → Copy Role ID">
        <div className="grid gap-4 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <Text
              key={c.key}
              label={`ยศเมื่อผ่าน: ${c.name}`}
              value={s.categoryRoles[c.key]}
              onChange={(v) => up("categoryRoles", { ...s.categoryRoles, [c.key]: v })}
              placeholder="Role ID"
              mono
            />
          ))}
          <Text label="ยศที่จะถอดออกเมื่อผ่าน (เช่น รอ Whitelist)" value={s.removeRoleOnApprove} onChange={(v) => up("removeRoleOnApprove", v)} placeholder="Role ID" mono />
          <Text label="Channel ID ห้อง Log แอดมิน" value={s.logChannelId} onChange={(v) => up("logChannelId", v)} placeholder="Channel ID" mono />
        </div>
        <div className="mt-4 space-y-3">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3 text-sm">
            <span>ส่ง DM แจ้งผลให้ผู้เล่นอัตโนมัติ</span>
            <Toggle checked={s.dmOnDecision} onChange={(v) => up("dmOnDecision", v)} />
          </label>
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3 text-sm">
            <span>ต้องอยู่ใน Discord เซิร์ฟเวอร์ก่อนจึงจะส่ง Whitelist ได้</span>
            <Toggle checked={s.requireGuildMember} onChange={(v) => up("requireGuildMember", v)} />
          </label>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3">
          {flash && <span className={cn("text-sm", flash.ok ? "text-emerald-800" : "text-rose-800")}>{flash.text}</span>}
          <button onClick={() => setS(initial)} className="btn-ghost" disabled={pending}>รีเซ็ต</button>
          <button onClick={save} className="btn-gold px-6" disabled={pending}>{pending ? "กำลังบันทึก…" : "บันทึกการตั้งค่า"}</button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type={type} className={cn("input", mono && "font-mono text-xs")} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-gold" : "bg-line")}
    >
      <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}
