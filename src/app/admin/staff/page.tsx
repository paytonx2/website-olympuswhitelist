import { requireStaff } from "@/lib/session";
import { db } from "@/lib/supabase";
import { avatarUrl, fmtDate } from "@/lib/utils";
import { PageTitle } from "@/components/ui";
import { StaffManager } from "./staff-manager";

export const metadata = { title: "ทีมงาน" };

export default async function StaffPage() {
  const { user } = await requireStaff(["admin"]);
  const { data: staff } = await db().from("staff").select("*").order("created_at");
  const ids = (staff ?? []).map((s) => s.discord_id);
  const { data: profiles } = ids.length
    ? await db().from("profiles").select("discord_id, username, global_name, avatar").in("discord_id", ids)
    : { data: [] as { discord_id: string; username: string; global_name: string | null; avatar: string | null }[] };
  const envAdmins = (process.env.ADMIN_DISCORD_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const rows = (staff ?? []).map((s) => {
    const p = profiles?.find((x) => x.discord_id === s.discord_id);
    return {
      discord_id: s.discord_id as string,
      role: s.role as "admin" | "reviewer" | "finance",
      note: (s.note as string) ?? "",
      name: p ? p.global_name || p.username : "(ยังไม่เคยล็อกอิน)",
      avatar: avatarUrl(s.discord_id, p?.avatar),
      added: fmtDate(s.created_at),
    };
  });

  return (
    <div>
      <PageTitle title="ทีมงาน" subtitle="กำหนดว่าใครเข้าหลังบ้านได้ และมีสิทธิ์ระดับไหน" />
      <div className="card mb-6 p-5 text-sm text-muted">
        <p><b className="text-ink">Admin</b> — ทำได้ทุกอย่าง รวมถึงตั้งค่าและจัดการทีมงาน</p>
        <p><b className="text-ink">Reviewer</b> — ตรวจและตัดสินใบสมัคร, ยืนยันสลิป</p>
        <p><b className="text-ink">Finance</b> — ดูใบสมัครและยืนยันสลิปได้เท่านั้น</p>
        {envAdmins.length > 0 && (
          <p className="mt-3 text-xs">
            Admin จากไฟล์ .env (ADMIN_DISCORD_IDS): <span className="font-mono">{envAdmins.join(", ")}</span>
          </p>
        )}
      </div>
      <StaffManager rows={rows} me={user.id} />
    </div>
  );
}
