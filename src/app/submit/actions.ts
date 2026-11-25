"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  ACTIVE_STATUSES,
  CATEGORY_MAP,
  MAX_PDF_BYTES,
  MAX_SLIP_BYTES,
  SLIP_MIME,
  isCategory,
} from "@/lib/constants";
import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { BUCKET, db } from "@/lib/supabase";
import { logEvent } from "@/lib/events";
import { isGuildMember, sendChannel, COLORS } from "@/lib/discord";
import {
  normalizeSteamHex,
  validateApplication,
  type ApplicationInput,
  type FieldErrors,
} from "@/lib/validation";

export async function createUploadTarget(kind: "pdf" | "slip", contentType: string, size: number) {
  const user = await getSession();
  if (!user) return { ok: false as const, error: "กรุณาเข้าสู่ระบบใหม่" };

  if (kind === "pdf") {
    if (contentType !== "application/pdf") return { ok: false as const, error: "รองรับเฉพาะไฟล์ PDF" };
    if (size > MAX_PDF_BYTES) return { ok: false as const, error: "ไฟล์ PDF ต้องไม่เกิน 10MB" };
  } else {
    if (!SLIP_MIME.includes(contentType)) return { ok: false as const, error: "สลิปต้องเป็นไฟล์รูป PNG/JPG/WEBP" };
    if (size > MAX_SLIP_BYTES) return { ok: false as const, error: "รูปสลิปต้องไม่เกิน 5MB" };
  }

  const ext = kind === "pdf" ? "pdf" : contentType.split("/")[1].replace("jpeg", "jpg");
  const path = `${user.id}/${kind}-${randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, error: "สร้างลิงก์อัปโหลดไม่สำเร็จ" };
  return { ok: true as const, path: data.path, token: data.token };
}

async function fileExists(path: string) {
  const slash = path.lastIndexOf("/");
  const { data } = await db()
    .storage.from(BUCKET)
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 });
  return Boolean(data?.some((f) => f.name === path.slice(slash + 1)));
}

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; message?: string; errors?: FieldErrors };

export async function submitApplication(payload: {
  input: ApplicationInput;
  pdfPath: string | null;
  slipPath: string | null;
  editId: string | null;
}): Promise<SubmitResult> {
  const user = await getSession();
  if (!user) return { ok: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };

  const { input, editId } = payload;
  if (!isCategory(input.category)) return { ok: false, message: "ประเภทไม่ถูกต้อง" };
  const cat = CATEGORY_MAP[input.category];
  const settings = await getSettings();

  if (!editId && !settings.open[cat.key]) return { ok: false, message: "ประเภทนี้ปิดรับชั่วคราว" };

  const errors = validateApplication(input, {
    tiers: cat.tiers,
    academicYears: settings.academicYears,
    lineageKeys: settings.lineages.map((l) => l.key),
    extraRoleKeys: settings.extraRoles.map((r) => r.key),
  });

  // ตรวจไฟล์: ต้องเป็นไฟล์ในโฟลเดอร์ของผู้ใช้เอง
  const own = (p: string | null) => !!p && p.startsWith(`${user.id}/`);

  let existing: { pdf_path: string; slip_path: string | null; status: string; revision: number } | null = null;
  if (editId) {
    const { data } = await db()
      .from("applications")
      .select("pdf_path, slip_path, status, revision, discord_id, category")
      .eq("id", editId)
      .maybeSingle();
    if (!data || data.discord_id !== user.id || data.category !== cat.key) {
      return { ok: false, message: "ไม่พบใบสมัครที่ต้องการแก้ไข" };
    }
    if (data.status !== "needs_edit") return { ok: false, message: "ใบสมัครนี้ไม่ได้อยู่ในสถานะให้แก้ไขแล้ว" };
    existing = data;
  }

  const pdfPath = payload.pdfPath ?? existing?.pdf_path ?? null;
  const slipPath = input.tier === "express" ? payload.slipPath ?? existing?.slip_path ?? null : null;

  if (!pdfPath) errors.pdf = "กรุณาแนบไฟล์ Whitelist (PDF)";
  else if (payload.pdfPath && (!own(payload.pdfPath) || !(await fileExists(payload.pdfPath)))) {
    errors.pdf = "อัปโหลดไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่";
  }
  if (input.tier === "express") {
    if (!slipPath) errors.slip = "กรุณาแนบหลักฐานการโอนเงิน";
    else if (payload.slipPath && (!own(payload.slipPath) || !(await fileExists(payload.slipPath)))) {
      errors.slip = "อัปโหลดสลิปไม่สำเร็จ กรุณาลองใหม่";
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors, message: "กรุณาตรวจสอบข้อมูลที่ไฮไลต์ไว้" };

  // ต้องอยู่ในดิสคอร์ด (ถ้าเปิดตัวเลือกไว้)
  if (settings.requireGuildMember) {
    const member = await isGuildMember(user.id);
    if (member === false) {
      return { ok: false, message: "กรุณาเข้าร่วม Discord ของเซิร์ฟเวอร์ก่อนส่ง Whitelist" };
    }
  }

  // ห้ามส่งซ้ำประเภทเดียวกันระหว่างที่ยังค้างอยู่ / ผ่านไปแล้ว
  if (!editId) {
    const { data: dup } = await db()
      .from("applications")
      .select("id, status")
      .eq("discord_id", user.id)
      .eq("category", cat.key)
      .in("status", [...ACTIVE_STATUSES, "approved"])
      .limit(1);
    if (dup && dup.length) {
      return {
        ok: false,
        message:
          dup[0].status === "approved"
            ? "คุณผ่าน Whitelist ประเภทนี้แล้ว"
            : "คุณมีใบสมัครประเภทนี้ที่ยังรอดำเนินการอยู่ ดูได้ที่ My Whitelist",
      };
    }
  }

  const row = {
    category: cat.key,
    tier: input.tier,
    lineage: cat.key === "demigod" ? input.lineage : null,
    extra_role: cat.key === "extra" ? input.extra_role : null,
    ic_name: input.ic_name.trim(),
    ic_name_reading: input.ic_name_reading.trim(),
    academic_year: input.academic_year,
    oc_age: Number(input.oc_age),
    oc_gender: input.oc_gender,
    hair_eye_color: input.hair_eye_color.trim(),
    steam_hex: normalizeSteamHex(input.steam_hex),
    facebook_url: input.facebook_url.trim(),
    email: input.email.trim(),
    pdf_path: pdfPath!,
    slip_path: slipPath,
    updated_at: new Date().toISOString(),
  };

  let id: string;
  if (existing && editId) {
    const { error } = await db()
      .from("applications")
      .update({
        ...row,
        status: "pending",
        revision: existing.revision + 1,
        claimed_by: null,
        claimed_at: null,
        payment_verified: payload.slipPath ? false : undefined,
      })
      .eq("id", editId)
      .eq("status", "needs_edit");
    if (error) return { ok: false, message: "บันทึกไม่สำเร็จ: " + error.message };
    id = editId;
    await logEvent(id, user.id, "resubmitted", { revision: existing.revision + 1 });

    // ลบไฟล์เก่าที่ถูกแทนที่
    const old = [
      payload.pdfPath && existing.pdf_path !== payload.pdfPath ? existing.pdf_path : null,
      payload.slipPath && existing.slip_path && existing.slip_path !== payload.slipPath ? existing.slip_path : null,
    ].filter(Boolean) as string[];
    if (old.length) await db().storage.from(BUCKET).remove(old);
  } else {
    const { data, error } = await db()
      .from("applications")
      .insert({ ...row, discord_id: user.id })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: "บันทึกไม่สำเร็จ: " + (error?.message ?? "") };
    id = data.id;
    await logEvent(id, user.id, "submitted", { category: cat.key, tier: input.tier });
  }

  await sendChannel(settings.logChannelId, {
    title: editId ? "แก้ไขใบสมัครและส่งใหม่" : "ใบสมัครใหม่",
    color: input.tier === "express" ? COLORS.gold : COLORS.blue,
    fields: [
      { name: "ผู้เล่น", value: `<@${user.id}> (${user.username})`, inline: true },
      { name: "ประเภท", value: `${cat.name} · ${input.tier === "express" ? "Express" : "Normal"}`, inline: true },
      { name: "ชื่อ IC", value: row.ic_name, inline: true },
    ],
    url: `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/admin/applications/${id}`,
    timestamp: new Date().toISOString(),
  });

  revalidatePath("/my");
  return { ok: true, id };
}
