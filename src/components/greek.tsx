import type { Category } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** ตราสัญลักษณ์ OA ในวงแหวนคู่ */
export function Monogram({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <defs>
        <linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9a24e" />
          <stop offset="1" stopColor="#7c5f22" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22.5" fill="#fff" stroke="url(#mg)" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="url(#mg)" strokeWidth="0.6" strokeDasharray="1.2 2" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fontFamily="var(--font-cinzel), serif"
        fontSize="15"
        fontWeight="700"
        fill="url(#mg)"
        letterSpacing="0.5"
      >
        OA
      </text>
    </svg>
  );
}

/** เส้นคั่นแบบมีเพชรตรงกลาง */
export function Ornament({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 text-gold-soft", className)} aria-hidden>
      <span className="h-px w-16 bg-linear-to-r from-transparent to-gold-soft" />
      <svg viewBox="0 0 24 12" className="h-3 w-6" fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M2 6h5M17 6h5" />
        <path d="M12 1l5 5-5 5-5-5z" />
        <circle cx="12" cy="6" r="1.2" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-linear-to-l from-transparent to-gold-soft" />
    </div>
  );
}

const ICONS: Record<Category, React.ReactNode> = {
  // หนังสือเปิด
  student: (
    <path d="M12 6.5C10 5.2 7.3 4.5 4 4.5v13c3.3 0 6 .7 8 2 2-1.3 4.7-2 8-2v-13c-3.3 0-6 .7-8 2zm0 0v13" />
  ),
  // วิหารกรีก
  teacher: <path d="M3 9.5 12 4l9 5.5M4.5 9.5h15M6.5 9.5v8M10 9.5v8M14 9.5v8M17.5 9.5v8M4.5 17.5h15M3 20.5h18" />,
  // สายฟ้า
  demigod: <path d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11H12.5l1-8z" />,
  // โถแอมโฟรา
  extra: (
    <path d="M9 3h6M10 3v2.2c0 1-3.2 2.2-3.2 6.3 0 4.2 2.2 7 3.2 8V21h4v-1.5c1-1 3.2-3.8 3.2-8 0-4.1-3.2-5.3-3.2-6.3V3M6.8 8.2C5 8.2 4 9.3 4 11s1 2.3 2.3 2.3M17.2 8.2c1.8 0 2.8 1.1 2.8 2.8s-1 2.3-2.3 2.3M8 12.5h8" />
  ),
};

export function CategoryIcon({ category, className = "h-6 w-6" }: { category: Category; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[category]}
    </svg>
  );
}

/** กรอบไอคอนแบบวงกลมทอง */
export function IconSeal({ category, size = "md" }: { category: Category; size?: "sm" | "md" | "lg" }) {
  const s = { sm: "h-10 w-10", md: "h-12 w-12", lg: "h-14 w-14" }[size];
  const i = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-7 w-7" }[size];
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-full border border-gold-soft bg-linear-to-b from-white to-cream text-gold shadow-[inset_0_0_0_3px_#fff]", s)}>
      <CategoryIcon category={category} className={i} />
    </span>
  );
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
export const roman = (n: number) => ROMAN[n - 1] ?? String(n);
