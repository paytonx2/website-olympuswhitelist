import { requireStaff } from "@/lib/session";
import { AdminNav } from "./admin-nav";

const ROLE_LABEL = { admin: "Admin", reviewer: "Reviewer", finance: "Finance" } as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { role } = await requireStaff();
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
      <aside className="lg:w-52 lg:shrink-0">
        <div className="card p-3 lg:sticky lg:top-24">
          <p className="px-3 pb-3 text-xs text-muted">
            สิทธิ์ของคุณ: <span className="text-gold">{ROLE_LABEL[role]}</span>
          </p>
          <AdminNav role={role} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
