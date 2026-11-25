import { STATUS_INFO, type Status, TIER_LABEL, type Tier } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Ornament } from "./greek";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = STATUS_INFO[status] ?? STATUS_INFO.pending;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1",
        s.className,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={cn(
        "display inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold",
        tier === "express"
          ? "bg-linear-to-b from-[#c9a24e] to-gold text-white"
          : "bg-panel-2 text-muted ring-1 ring-line",
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

export function PageTitle({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
      <Ornament />
      <p className="font-medium text-ink">{title}</p>
      {children}
    </div>
  );
}

export function Field({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className={cn("mt-1 break-words text-sm text-ink", mono && "font-mono")}>{value || "-"}</dd>
    </div>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success" | "warn" | "info"; children: React.ReactNode }) {
  const cls = {
    error: "border-rose-200 bg-rose-50 text-rose-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-900",
    info: "border-gold-soft/60 bg-panel-2 text-ink",
  }[tone];
  return <div className={cn("rounded-xl border px-4 py-3 text-sm", cls)}>{children}</div>;
}
