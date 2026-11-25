import Link from "next/link";
import { EVENT_LABEL } from "@/lib/constants";
import { db } from "@/lib/supabase";
import { fmtDate } from "@/lib/utils";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Log การทำงาน" };

export default async function LogsPage({ searchParams }: PageProps<"/admin/logs">) {
  const sp = await searchParams;
  const actor = typeof sp.actor === "string" ? sp.actor : "";
  const action = typeof sp.action === "string" ? sp.action : "";

  let q = db().from("application_events").select("*").order("created_at", { ascending: false }).limit(200);
  if (actor) q = q.eq("actor_id", actor);
  if (action) q = q.eq("action", action);
  const { data: events } = await q;

  const ids = [...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = ids.length
    ? await db().from("profiles").select("discord_id, username, global_name").in("discord_id", ids)
    : { data: [] as { discord_id: string; username: string; global_name: string | null }[] };
  const name = (id: string | null) => {
    const p = profiles?.find((x) => x.discord_id === id);
    return p ? p.global_name || p.username : id ?? "ระบบ";
  };

  return (
    <div>
      <PageTitle title="Log การทำงาน" subtitle="บันทึกทุกการกระทำในระบบ (200 รายการล่าสุด)" />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" action="/admin/logs">
        <input name="actor" defaultValue={actor} placeholder="Discord ID ผู้กระทำ" className="input font-mono" />
        <select name="action" defaultValue={action} className="input">
          <option value="">ทุกการกระทำ</option>
          {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-gold">กรอง</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">เวลา</th>
              <th className="px-4 py-3 font-normal">ผู้กระทำ</th>
              <th className="px-4 py-3 font-normal">การกระทำ</th>
              <th className="px-4 py-3 font-normal">ใบสมัคร</th>
              <th className="px-4 py-3 font-normal">รายละเอียด</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((e) => (
              <tr key={e.id} className="border-b border-line/50">
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">{fmtDate(e.created_at)}</td>
                <td className="px-4 py-2.5">
                  <Link href={`/admin/logs?actor=${e.actor_id ?? ""}`} className="hover:text-gold">{name(e.actor_id)}</Link>
                </td>
                <td className="px-4 py-2.5">{EVENT_LABEL[e.action] ?? e.action}</td>
                <td className="px-4 py-2.5">
                  {e.application_id ? (
                    <Link href={`/admin/applications/${e.application_id}`} className="font-mono text-xs text-gold hover:underline">
                      #{e.application_id.slice(0, 8)}
                    </Link>
                  ) : "-"}
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-xs text-muted">
                  {e.detail ? Object.entries(e.detail).map(([k, v]) => `${k}: ${v}`).join(" · ") : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
