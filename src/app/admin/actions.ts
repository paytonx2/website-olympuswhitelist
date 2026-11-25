"use server";

import { revalidatePath } from "next/cache";
import { CATEGORY_MAP, type Category, type Status } from "@/lib/constants";
import { assertStaff, type StaffRole } from "@/lib/session";
import { getSettings, saveSettings, type SiteSettings } from "@/lib/settings";
import { db } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import { COLORS, parseIds, sendChannel, sendDM, syncRoles } from "@/lib/discord";

type Result = { ok: true; message?: string } | { ok: false; message: string };

const appUrl = (id: string) => `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/admin/applications/${id}`;
const playerUrl = (id: string) => `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/my/${id}`;

async function loadApp(id: string) {
  const { data } = await db().from("applications").select("*").eq("id", id).maybeSingle();
  if (!data) throw new Error("ไม่พบใบสมัคร");
  return data as {
    id: string;
    discord_id: string;
    category: Category;
    tier: "normal" | "express";
    status: Status;
    lineage: string | null;
    extra_role: string | null;
    ic_name: string;
    payment_verified: boolean;
    claimed_by: string | null;
  };
}

function done(id: string) {
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath("/admin/queue");
  revalidatePath("/admin");
}

async function run(fn: () => Promise<Result>): Promise<Result> {
  try {
    return await fn();
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

// ----------------------------------------------------------------- claim ----

export async function claimApplication(id: string, release = false): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin", "reviewer"]);
    const app = await loadApp(id);
    if (release) {
      if (app.status !== "reviewing") return { ok: true };
      await db().from("applications").update({ status: "pending", claimed_by: null, claimed_at: null }).eq("id", id);
      await logEvent(id, user.id, "unclaimed");
    } else {
      if (app.status !== "pending" && app.status !== "reviewing") {
        return { ok: false, message: "ใบสมัครนี้ไม่ได้อยู่ในสถานะรอตรวจ" };
      }
      if (app.claimed_by && app.claimed_by !== user.id) {
        // ยังให้แย่งได้ แต่บันทึกไว้
      }
      await db()
        .from("applications")
        .update({ status: "reviewing", claimed_by: user.id, claimed_at: new Date().toISOString() })
        .eq("id", id);
      await logEvent(id, user.id, "claimed", app.claimed_by && app.claimed_by !== user.id ? { from: app.claimed_by } : undefined);
    }
    done(id);
    return { ok: true };
  });
}

// --------------------------------------------------------------- payment ----

export async function setPaymentVerified(id: string, verified: boolean): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin", "reviewer", "finance"]);
    await db()
      .from("applications")
      .update({ payment_verified: verified, payment_verified_by: verified ? user.id : null })
      .eq("id", id);
    await logEvent(id, user.id, verified ? "payment_verified" : "payment_unverified");
    done(id);
    return { ok: true };
  });
}

// ------------------------------------------------------------------ note ----

export async function saveInternalNote(id: string, note: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin", "reviewer", "finance"]);
    await db().from("applications").update({ internal_note: note.slice(0, 4000) }).eq("id", id);
    await logEvent(id, user.id, "note");
    done(id);
    return { ok: true, message: "บันทึกโน้ตแล้ว" };
  });
}

// -------------------------------------------------------------- decision ----

export type Decision = "approved" | "rejected" | "needs_edit" | "interview";

function rolesFor(app: { category: Category; lineage: string | null; extra_role: string | null }, s: SiteSettings) {
  const add = parseIds(s.categoryRoles[app.category]);
  if (app.lineage) add.push(...parseIds(s.lineages.find((l) => l.key === app.lineage)?.roleId));
  if (app.extra_role) add.push(...parseIds(s.extraRoles.find((r) => r.key === app.extra_role)?.roleId));
  return { add: [...new Set(add)], remove: parseIds(s.removeRoleOnApprove) };
}

export async function decideApplication(id: string, decision: Decision, reason: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin", "reviewer"]);
    const app = await loadApp(id);
    const settings = await getSettings();
    const cat = CATEGORY_MAP[app.category];
    reason = reason.trim().slice(0, 2000);

    if ((decision === "rejected" || decision === "needs_edit") && !reason) {
      return { ok: false, message: "กรุณาระบุเหตุผลให้ผู้เล่น" };
    }
    if (decision === "interview" && !cat.interview) {
      return { ok: false, message: "ประเภทนี้ไม่มีขั้นตอนสัมภาษณ์" };
    }
    if (decision === "approved" && app.tier === "express" && !app.payment_verified) {
      return { ok: false, message: "ใบสมัคร Express ต้องยืนยันสลิปก่อนอนุมัติ" };
    }

    let roleSync: string | null = null;
    if (decision === "approved") {
      const r = rolesFor(app, settings);
      roleSync = await syncRoles(app.discord_id, r.add, r.remove);
    }

    const { error } = await db()
      .from("applications")
      .update({
        status: decision,
        reason: reason || null,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        claimed_by: null,
        claimed_at: null,
        ...(roleSync ? { role_sync: roleSync } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return { ok: false, message: error.message };

    await logEvent(id, user.id, decision, { reason: reason || undefined });
    if (roleSync) await logEvent(id, user.id, "role_sync", { result: roleSync });

    // แจ้งผู้เล่นทาง DM
    const msg: Record<Decision, { title: string; color: number; text: string }> = {
      approved: { title: "Whitelist ผ่านแล้ว", color: COLORS.green, text: `ยินดีด้วย ใบสมัคร **${cat.name}** ของคุณผ่านแล้ว` },
      rejected: { title: "Whitelist ไม่ผ่าน", color: COLORS.red, text: `ใบสมัคร **${cat.name}** ของคุณไม่ผ่านการพิจารณา` },
      needs_edit: { title: "กรุณาแก้ไข Whitelist", color: COLORS.orange, text: `ทีมงานขอให้แก้ไขใบสมัคร **${cat.name}** ของคุณ กดลิงก์เพื่อแก้ไขและส่งใหม่` },
      interview: {
        title: "ผ่านการคัดเลือก · รอสัมภาษณ์",
        color: COLORS.violet,
        text: `ใบสมัคร **${cat.name}** ของคุณผ่านการคัดเลือกแล้ว รบกวนเปิด Ticket ติดต่อเพื่อรับการสัมภาษณ์${settings.ticketUrl ? `\n${settings.ticketUrl}` : ""}`,
      },
    };
    const m = msg[decision];
    let dmSent = false;
    if (settings.dmOnDecision) {
      dmSent = await sendDM(app.discord_id, {
        title: m.title,
        description: `${m.text}${reason ? `\n\n**ข้อความจากทีมงาน:**\n${reason}` : ""}`,
        color: m.color,
        url: playerUrl(id),
        footer: { text: "OLYMPUS ACADEMY" },
        timestamp: new Date().toISOString(),
      });
    }

    await sendChannel(settings.logChannelId, {
      title: `${m.title} · ${cat.name} · ${app.ic_name}`,
      color: m.color,
      url: appUrl(id),
      fields: [
        { name: "ผู้เล่น", value: `<@${app.discord_id}>`, inline: true },
        { name: "ผู้ตรวจ", value: `<@${user.id}>`, inline: true },
        ...(reason ? [{ name: "เหตุผล", value: reason.slice(0, 1000) }] : []),
        ...(roleSync ? [{ name: "ให้ยศ", value: roleSync.slice(0, 1000) }] : []),
      ],
      timestamp: new Date().toISOString(),
    });

    done(id);
    revalidatePath("/my");
    const notes = [
      roleSync && roleSync !== "ok" ? `ให้ยศ: ${roleSync}` : null,
      settings.dmOnDecision && !dmSent ? "ส่ง DM ไม่สำเร็จ (ผู้เล่นอาจปิด DM หรือยังไม่ได้ตั้งค่าบอท)" : null,
    ].filter(Boolean);
    return { ok: true, message: notes.length ? `บันทึกแล้ว · ${notes.join(" · ")}` : "บันทึกแล้ว" };
  });
}

export async function reopenApplication(id: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin"]);
    await db()
      .from("applications")
      .update({ status: "pending", decided_by: null, decided_at: null, claimed_by: null, claimed_at: null })
      .eq("id", id);
    await logEvent(id, user.id, "reopened");
    done(id);
    return { ok: true };
  });
}

export async function retryRoleSync(id: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin", "reviewer"]);
    const app = await loadApp(id);
    if (app.status !== "approved") return { ok: false, message: "ให้ยศได้เฉพาะใบสมัครที่ผ่านแล้ว" };
    const r = rolesFor(app, await getSettings());
    const result = await syncRoles(app.discord_id, r.add, r.remove);
    await db().from("applications").update({ role_sync: result }).eq("id", id);
    await logEvent(id, user.id, "role_sync", { result });
    done(id);
    return result === "ok" ? { ok: true, message: "ให้ยศสำเร็จ" } : { ok: false, message: result };
  });
}

// --------------------------------------------------------------- settings ----

export async function updateSettings(value: SiteSettings): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin"]);
    const clean: SiteSettings = {
      ...value,
      expressPrice: Math.max(0, Number(value.expressPrice) || 0),
      academicYears: value.academicYears.map((s) => s.trim()).filter(Boolean),
      reasonTemplates: value.reasonTemplates.map((s) => s.trim()).filter(Boolean),
      lineages: value.lineages
        .filter((l) => l.name.trim())
        .map((l) => ({ ...l, key: (l.key || l.name).trim().toLowerCase().replace(/\s+/g, "-"), roleId: l.roleId.trim() })),
      extraRoles: value.extraRoles
        .filter((r) => r.name.trim())
        .map((r, i) => ({ ...r, key: (r.key || `role-${i + 1}`).trim(), roleId: r.roleId.trim() })),
    };
    await saveSettings(clean, user.id);
    await logEvent(null, user.id, "settings");
    revalidatePath("/", "layout");
    return { ok: true, message: "บันทึกการตั้งค่าแล้ว" };
  });
}

// ------------------------------------------------------------------ staff ----

export async function addStaff(discordId: string, role: StaffRole, note: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin"]);
    if (!/^\d{15,25}$/.test(discordId.trim())) return { ok: false, message: "Discord ID ไม่ถูกต้อง" };
    if (!["admin", "reviewer", "finance"].includes(role)) return { ok: false, message: "สิทธิ์ไม่ถูกต้อง" };
    const { error } = await db()
      .from("staff")
      .upsert({ discord_id: discordId.trim(), role, note: note.trim() || null, added_by: user.id });
    if (error) return { ok: false, message: error.message };
    await logEvent(null, user.id, "staff_add", { discord_id: discordId, role });
    revalidatePath("/admin/staff");
    return { ok: true };
  });
}

export async function removeStaff(discordId: string): Promise<Result> {
  return run(async () => {
    const { user } = await assertStaff(["admin"]);
    if (discordId === user.id) return { ok: false, message: "ลบสิทธิ์ตัวเองไม่ได้" };
    await db().from("staff").delete().eq("discord_id", discordId);
    await logEvent(null, user.id, "staff_remove", { discord_id: discordId });
    revalidatePath("/admin/staff");
    return { ok: true };
  });
}
