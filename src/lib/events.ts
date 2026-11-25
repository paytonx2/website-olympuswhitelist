import "server-only";
import { db } from "./supabase";

export async function logEvent(
  applicationId: string | null,
  actorId: string | null,
  action: string,
  detail?: Record<string, unknown>,
) {
  await db()
    .from("application_events")
    .insert({ application_id: applicationId, actor_id: actorId, action, detail: detail ?? null });
}
