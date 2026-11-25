"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex h-full items-stretch gap-1 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {links.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "relative flex items-center whitespace-nowrap px-3 transition",
              active ? "text-gold-deep" : "text-muted hover:text-ink",
            )}
          >
            {l.label}
            {active && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-gold" />}
          </Link>
        );
      })}
    </nav>
  );
}
