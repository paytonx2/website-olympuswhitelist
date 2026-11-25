"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AdminNav({ role }: { role: "admin" | "reviewer" | "finance" }) {
  const path = usePathname();
  const items = [
    { href: "/admin", label: "Dashboard", exact: true },
    { href: "/admin/queue", label: "คิวตรวจ" },
    { href: "/admin/logs", label: "Log การทำงาน" },
    ...(role === "admin"
      ? [
          { href: "/admin/settings", label: "ตั้งค่า" },
          { href: "/admin/staff", label: "ทีมงาน" },
        ]
      : []),
  ];
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href) || (i.href === "/admin/queue" && path.startsWith("/admin/applications"));
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition",
              active ? "bg-panel-2 font-medium text-gold-deep shadow-[inset_2px_0_0_var(--color-gold)]" : "text-muted hover:bg-panel-2 hover:text-ink",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
