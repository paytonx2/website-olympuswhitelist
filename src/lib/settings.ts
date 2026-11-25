import "server-only";
import { cache } from "react";
import { db } from "./supabase";
import type { Category } from "./constants";

export type Lineage = { key: string; name: string; title: string; roleId: string };
export type ExtraRole = { key: string; name: string; roleId: string };

export type SiteSettings = {
  open: Record<Category, boolean>;
  announcement: string;
  expressPrice: number;
  bank: { bankName: string; accountNumber: string; accountName: string };
  qrImageUrl: string; // ใส่ภายหลัง
  ticketUrl: string;
  discordInviteUrl: string;
  academicYears: string[];
  lineages: Lineage[];
  extraRoles: ExtraRole[];
  /** Role ID ที่จะให้เมื่อ "ผ่าน" แยกตามประเภท (คั่นด้วย , ได้หลายยศ) */
  categoryRoles: Record<Category, string>;
  /** Role ID ที่จะถอดออกเมื่อผ่าน เช่น ยศ "รอ Whitelist" */
  removeRoleOnApprove: string;
  logChannelId: string;
  dmOnDecision: boolean;
  requireGuildMember: boolean;
  reasonTemplates: string[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  open: { student: true, teacher: true, demigod: true, extra: true },
  announcement: "",
  expressPrice: 200,
  bank: {
    bankName: "ธนาคารกสิกรไทย",
    accountNumber: "000-0-00000-0",
    accountName: "OLYMPUS ACADEMY",
  },
  qrImageUrl: "",
  ticketUrl: "",
  discordInviteUrl: "",
  academicYears: ["ปี 1", "ปี 2", "ปี 3", "ปี 4"],
  lineages: [
    { key: "zeus", name: "ZEUS", title: "เทพแห่งสายฟ้า", roleId: "" },
    { key: "hera", name: "HERA", title: "ราชินีแห่งทวยเทพ", roleId: "" },
    { key: "poseidon", name: "POSEIDON", title: "เทพแห่งท้องทะเล", roleId: "" },
    { key: "demeter", name: "DEMETER", title: "เทพีแห่งการเกษตร", roleId: "" },
    { key: "athena", name: "ATHENA", title: "เทพีแห่งปัญญาและกลยุทธ์", roleId: "" },
    { key: "apollo", name: "APOLLO", title: "เทพแห่งแสง ดนตรี และคำพยากรณ์", roleId: "" },
    { key: "artemis", name: "ARTEMIS", title: "เทพีแห่งการล่าสัตว์และดวงจันทร์", roleId: "" },
    { key: "ares", name: "ARES", title: "เทพแห่งสงคราม", roleId: "" },
    { key: "aphrodite", name: "APHRODITE", title: "เทพีแห่งความรักและความงาม", roleId: "" },
    { key: "hephaestus", name: "HEPHAESTUS", title: "เทพแห่งไฟและงานช่าง", roleId: "" },
    { key: "hermes", name: "HERMES", title: "เทพแห่งการสื่อสารและการเดินทาง", roleId: "" },
    { key: "dionysus", name: "DIONYSUS", title: "เทพแห่งไวน์และการเฉลิมฉลอง", roleId: "" },
  ],
  extraRoles: [
    { key: "butler", name: "พ่อบ้าน", roleId: "" },
    { key: "janitor", name: "ภารโรง", roleId: "" },
    { key: "maid", name: "แม่บ้าน", roleId: "" },
    { key: "chef", name: "พ่อครัว", roleId: "" },
    { key: "villager", name: "ชาวบ้านในหมู่บ้าน", roleId: "" },
  ],
  categoryRoles: { student: "", teacher: "", demigod: "", extra: "" },
  removeRoleOnApprove: "",
  logChannelId: "",
  dmOnDecision: true,
  requireGuildMember: false,
  reasonTemplates: [
    "ไฟล์ PDF ไม่ครบถ้วนตามแบบฟอร์ม",
    "SteamHex ไม่ถูกต้อง",
    "ลิงก์ Facebook เปิดดูไม่ได้",
    "ชื่อตัวละครไม่เหมาะสม / ซ้ำกับผู้อื่น",
    "สลิปโอนเงินไม่ถูกต้องหรือยอดไม่ตรง",
    "เนื้อหาประวัติตัวละครไม่สอดคล้องกับโลกของเซิร์ฟเวอร์",
  ],
};

function merge(stored: Partial<SiteSettings> | null): SiteSettings {
  if (!stored) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    open: { ...DEFAULT_SETTINGS.open, ...(stored.open ?? {}) },
    bank: { ...DEFAULT_SETTINGS.bank, ...(stored.bank ?? {}) },
    categoryRoles: { ...DEFAULT_SETTINGS.categoryRoles, ...(stored.categoryRoles ?? {}) },
  };
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  try {
    const { data } = await db()
      .from("settings")
      .select("value")
      .eq("key", "site")
      .maybeSingle();
    return merge((data?.value as Partial<SiteSettings>) ?? null);
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export async function saveSettings(value: SiteSettings, actorId: string) {
  const { error } = await db()
    .from("settings")
    .upsert({ key: "site", value, updated_by: actorId, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}
