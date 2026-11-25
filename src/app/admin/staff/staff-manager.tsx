"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaff, removeStaff } from "../actions";

type Row = { discord_id: string; role: "admin" | "reviewer" | "finance"; note: string; name: string; avatar: string; added: string };

export function StaffManager({ rows, me }: { rows: Row[]; me: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [id, setId] = useState("");
  const [role, setRole] = useState<Row["role"]>("reviewer");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) =>
    start(async () => {
      setErr(null);
      const r = await fn();
      if (!r.ok) setErr(r.message ?? "ไม่สำเร็จ");
      else {
        after?.();
        router.refresh();
      }
    });

  return (
    <div className="space-y-6">
      <form
        className="card grid gap-3 p-5 sm:grid-cols-[1.3fr_1fr_1.3fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addStaff(id, role, note), () => { setId(""); setNote(""); });
        }}
      >
        <input className="input font-mono" placeholder="Discord ID" value={id} onChange={(e) => setId(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setRole(e.target.value as Row["role"])}>
          <option value="reviewer">Reviewer</option>
          <option value="finance">Finance</option>
          <option value="admin">Admin</option>
        </select>
        <input className="input" placeholder="หมายเหตุ (ไม่บังคับ)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn-gold" disabled={pending}>เพิ่ม / แก้สิทธิ์</button>
        {err && <p className="text-sm text-rose-800 sm:col-span-4">{err}</p>}
      </form>

      <div className="card divide-y divide-line/60">
        {rows.length === 0 && <p className="p-5 text-sm text-muted">ยังไม่มีทีมงานในฐานข้อมูล</p>}
        {rows.map((r) => (
          <div key={r.discord_id} className="flex flex-wrap items-center gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.avatar} alt="" className="h-9 w-9 rounded-full" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">{r.name}</p>
              <p className="font-mono text-xs text-muted">{r.discord_id}{r.note ? ` · ${r.note}` : ""}</p>
            </div>
            <span className="rounded-md bg-gold/10 px-2 py-0.5 text-xs capitalize text-gold">{r.role}</span>
            {r.discord_id !== me && (
              <button
                className="btn-ghost px-3 py-1.5 text-xs"
                disabled={pending}
                onClick={() => confirm(`ลบสิทธิ์ของ ${r.name}?`) && run(() => removeStaff(r.discord_id))}
              >
                ลบ
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
