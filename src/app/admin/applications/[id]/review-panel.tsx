"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Status } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  claimApplication,
  decideApplication,
  reopenApplication,
  retryRoleSync,
  saveInternalNote,
  setPaymentVerified,
  type Decision,
} from "../../actions";

type Props = {
  id: string;
  role: "admin" | "reviewer" | "finance";
  me: string;
  status: Status;
  tier: "normal" | "express";
  interview: boolean;
  paymentVerified: boolean;
  claimedBy: { id: string; name: string } | null;
  internalNote: string;
  reasonTemplates: string[];
  roleSync: string | null;
  nextId: string | null;
};

export function ReviewPanel(p: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState(p.internalNote);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Decision | null>(null);

  const canReview = p.role === "admin" || p.role === "reviewer";
  const open = p.status === "pending" || p.status === "reviewing";
  const decidable = open || p.status === "interview";
  const claimedByOther = p.claimedBy && p.claimedBy.id !== p.me && p.status === "reviewing";
  const needPayment = p.tier === "express" && !p.paymentVerified;

  function act(fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    setFlash(null);
    start(async () => {
      const r = await fn();
      if (r.message || !r.ok) setFlash({ ok: r.ok, text: r.message ?? "เกิดข้อผิดพลาด" });
      if (r.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  function decide(d: Decision, goNext = false) {
    act(
      () => decideApplication(p.id, d, reason),
      () => {
        setReason("");
        setConfirm(null);
        if (goNext && p.nextId) router.push(`/admin/applications/${p.nextId}`);
      },
    );
  }

  // คีย์ลัด
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.tagName === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "c" && canReview && open) act(() => claimApplication(p.id));
      if (e.key === "a" && canReview && decidable) setConfirm(p.interview && p.status !== "interview" ? "interview" : "approved");
      if (e.key === "e" && canReview && decidable) setConfirm("needs_edit");
      if (e.key === "r" && canReview && decidable) setConfirm("rejected");
      if (e.key === "p" && p.tier === "express") act(() => setPaymentVerified(p.id, !p.paymentVerified));
      if (e.key === "n" && p.nextId) router.push(`/admin/applications/${p.nextId}`);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.id, p.status, p.paymentVerified, p.nextId]);

  const decisionLabel: Record<Decision, string> = {
    approved: p.status === "interview" ? "ผ่านสัมภาษณ์ (อนุมัติ)" : "อนุมัติ (ผ่าน)",
    interview: "ผ่านคัดเลือก → นัดสัมภาษณ์",
    needs_edit: "ขอให้แก้ไข",
    rejected: "ไม่ผ่าน",
  };

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold">การตรวจสอบ</h2>
        {canReview && open && (
          p.status === "reviewing" && p.claimedBy?.id === p.me ? (
            <button disabled={pending} onClick={() => act(() => claimApplication(p.id, true))} className="btn-ghost px-3 py-1.5 text-xs">
              ปล่อยเรื่อง
            </button>
          ) : (
            <button disabled={pending} onClick={() => act(() => claimApplication(p.id))} className="btn-ghost px-3 py-1.5 text-xs">
              รับเรื่องตรวจ <kbd className="ml-1 text-muted">C</kbd>
            </button>
          )
        )}
      </div>

      {claimedByOther && (
        <p className="mb-4 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
          {p.claimedBy!.name} กำลังตรวจใบนี้อยู่ — ระวังตรวจซ้อนกัน
        </p>
      )}

      {flash && (
        <p className={cn("mb-4 rounded-lg px-3 py-2 text-sm", flash.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800")}>
          {flash.text}
        </p>
      )}

      {p.tier === "express" && (
        <label className={cn("mb-4 flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", p.paymentVerified ? "border-emerald-200 bg-emerald-50" : "border-orange-200 bg-orange-50")}>
          <input
            type="checkbox"
            checked={p.paymentVerified}
            disabled={pending}
            onChange={(e) => act(() => setPaymentVerified(p.id, e.target.checked))}
            className="h-4 w-4 accent-emerald-500"
          />
          <span className="flex-1">{p.paymentVerified ? "ตรวจสลิปแล้ว ยอดถูกต้อง" : "ยังไม่ได้ตรวจสลิป"}</span>
          <kbd className="text-xs text-muted">P</kbd>
        </label>
      )}

      {canReview && decidable && (
        <>
          <label className="label">ข้อความถึงผู้เล่น (เหตุผล)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="input resize-y"
            placeholder="จำเป็นเมื่อ 'ขอให้แก้ไข' หรือ 'ไม่ผ่าน'"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.reasonTemplates.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setReason((r) => (r ? `${r}\n- ${t}` : `- ${t}`))}
                className="rounded-md border border-line px-2 py-1 text-[11px] text-muted hover:border-gold/50 hover:text-ink"
              >
                + {t}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {p.interview && p.status !== "interview" ? (
              <button disabled={pending} onClick={() => setConfirm("interview")} className="btn col-span-2 bg-violet-700 text-white hover:bg-violet-800">
                {decisionLabel.interview} <kbd className="opacity-60">A</kbd>
              </button>
            ) : (
              <button
                disabled={pending || needPayment}
                title={needPayment ? "ต้องยืนยันสลิปก่อน" : ""}
                onClick={() => setConfirm("approved")}
                className="btn-success col-span-2"
              >
                {decisionLabel.approved} <kbd className="opacity-60">A</kbd>
              </button>
            )}
            <button disabled={pending} onClick={() => setConfirm("needs_edit")} className="btn bg-orange-600 text-white hover:bg-orange-700">
              ขอแก้ไข <kbd className="opacity-60">E</kbd>
            </button>
            <button disabled={pending} onClick={() => setConfirm("rejected")} className="btn-danger">
              ไม่ผ่าน <kbd className="opacity-60">R</kbd>
            </button>
          </div>
          {needPayment && !(p.interview && p.status !== "interview") && (
            <p className="mt-2 text-xs text-orange-800">* ใบ Express ต้องติ๊กยืนยันสลิปก่อนจึงจะอนุมัติได้</p>
          )}
        </>
      )}

      {!decidable && (
        <div className="space-y-2 text-sm text-muted">
          <p>ใบสมัครนี้ตัดสินแล้ว{p.status === "needs_edit" ? " (รอผู้เล่นแก้ไข)" : ""}</p>
          {p.status === "approved" && (
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded px-2 py-0.5 text-xs", p.roleSync === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800")}>
                ให้ยศ: {p.roleSync ?? "-"}
              </span>
              {canReview && p.roleSync !== "ok" && (
                <button disabled={pending} onClick={() => act(() => retryRoleSync(p.id))} className="btn-ghost px-2 py-1 text-xs">ลองให้ยศอีกครั้ง</button>
              )}
            </div>
          )}
          {p.role === "admin" && (
            <button disabled={pending} onClick={() => act(() => reopenApplication(p.id))} className="btn-ghost px-3 py-1.5 text-xs">
              เปิดเรื่องใหม่ (กลับไปรอตรวจ)
            </button>
          )}
        </div>
      )}

      {/* Confirm */}
      {confirm && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
          <p className="text-sm">
            ยืนยัน <b>{decisionLabel[confirm]}</b>?
            {confirm === "approved" && " — ระบบจะให้ยศใน Discord และแจ้งผู้เล่นทาง DM"}
          </p>
          {(confirm === "rejected" || confirm === "needs_edit") && !reason.trim() && (
            <p className="mt-1 text-xs text-rose-800">กรุณาใส่เหตุผลก่อน</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button disabled={pending} onClick={() => decide(confirm)} className="btn-gold px-3 py-1.5 text-xs">
              {pending ? "กำลังบันทึก…" : "ยืนยัน"}
            </button>
            {p.nextId && (
              <button disabled={pending} onClick={() => decide(confirm, true)} className="btn-ghost px-3 py-1.5 text-xs">
                ยืนยันแล้วไปใบถัดไป →
              </button>
            )}
            <button onClick={() => setConfirm(null)} className="btn px-3 py-1.5 text-xs text-muted">ยกเลิก</button>
          </div>
        </div>
      )}

      {/* Internal note */}
      <div className="mt-6 border-t border-line pt-4">
        <label className="label">โน้ตภายใน (ผู้เล่นไม่เห็น)</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="input resize-y" />
        <button
          disabled={pending || note === p.internalNote}
          onClick={() => act(() => saveInternalNote(p.id, note))}
          className="btn-ghost mt-2 px-3 py-1.5 text-xs"
        >
          บันทึกโน้ต
        </button>
      </div>

      <p className="mt-4 text-[11px] text-muted">
        คีย์ลัด: <kbd>C</kbd> รับเรื่อง · <kbd>A</kbd> ผ่าน · <kbd>E</kbd> ขอแก้ไข · <kbd>R</kbd> ไม่ผ่าน · <kbd>P</kbd> ยืนยันสลิป · <kbd>N</kbd> ใบถัดไป
      </p>
    </div>
  );
}
