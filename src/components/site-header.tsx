import Link from "next/link";
import { getSession, getStaffRole } from "@/lib/session";
import { avatarUrl } from "@/lib/utils";
import { NavLinks } from "./nav-links";
import { Monogram } from "./greek";

export async function SiteHeader() {
  const user = await getSession();
  const role = user ? await getStaffRole(user.id).catch(() => null) : null;

  const links = [
    { href: "/", label: "ภาพรวม" },
    { href: "/submit", label: "ส่ง Whitelist" },
    { href: "/my", label: "My Whitelist" },
    ...(role ? [{ href: "/admin", label: "หลังบ้าน" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Monogram className="h-10 w-10" />
          <span className="hidden leading-tight sm:block">
            <span className="display block text-[15px] font-semibold text-ink">OLYMPUS</span>
            <span className="display block text-[10px] tracking-[0.42em] text-gold">ACADEMY</span>
          </span>
        </Link>

        <NavLinks links={links} />

        <div className="ml-auto flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden items-center gap-2.5 sm:flex">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarUrl(user.id, user.avatar)}
                  alt=""
                  className="h-8 w-8 rounded-full ring-2 ring-gold-soft/60 ring-offset-2 ring-offset-white"
                />
                <span className="max-w-32 truncate text-sm text-ink">{user.name}</span>
              </div>
              <form action="/api/auth/logout" method="post">
                <button className="btn-ghost px-3.5 py-1.5 text-xs">ออกจากระบบ</button>
              </form>
            </>
          ) : (
            <a href="/api/auth/login" className="btn-gold px-4 py-2 text-xs">
              <DiscordIcon /> เข้าสู่ระบบ
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

export function DiscordIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
