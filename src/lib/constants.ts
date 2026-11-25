export const SERVER_NAME = "OLYMPUS ACADEMY";

export type Category = "student" | "teacher" | "demigod" | "extra";
export type Tier = "normal" | "express";
export type Status =
  | "pending"
  | "reviewing"
  | "needs_edit"
  | "interview"
  | "approved"
  | "rejected";

export type CategoryInfo = {
  key: Category;
  name: string;
  short: string;
  description: string;
  tiers: Tier[];
  interview: boolean; // ผ่านคัดเลือกแล้วต้องเปิด Ticket สัมภาษณ์
};

export const CATEGORIES: CategoryInfo[] = [
  {
    key: "student",
    name: "นักเรียนทั่วไป",
    short: "Student",
    description: "Whitelist สำหรับนักเรียนทั่วไป เลือกส่งแบบ Normal หรือ Express",
    tiers: ["normal", "express"],
    interview: false,
  },
  {
    key: "teacher",
    name: "อาจารย์",
    short: "Professor",
    description:
      "Whitelist ของอาจารย์เท่านั้น เมื่อกรอกข้อมูลเสร็จแล้ว และได้รับการแจ้งเตือนผ่านการคัดเลือก รบกวนเปิด Ticket ติดต่อเพื่อรับการสัมภาษณ์",
    tiers: ["normal"],
    interview: true,
  },
  {
    key: "demigod",
    name: "ลูกครึ่งเทพ",
    short: "Demigod",
    description: "โรลพิเศษ ต้องเลือกสายเลือดของเทพ เลือกส่งแบบ Normal หรือ Express",
    tiers: ["normal", "express"],
    interview: false,
  },
  {
    key: "extra",
    name: "Extra Role",
    short: "Extra Role",
    description:
      "พ่อบ้าน ภารโรง แม่บ้าน พ่อครัว ชาวบ้านในหมู่บ้าน เมื่อกรอกข้อมูลเสร็จแล้ว และได้รับการแจ้งเตือนผ่านการคัดเลือก รบกวนเปิด Ticket ติดต่อเพื่อรับการสัมภาษณ์",
    tiers: ["normal"],
    interview: true,
  },
];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
) as Record<Category, CategoryInfo>;

export function isCategory(v: unknown): v is Category {
  return typeof v === "string" && v in CATEGORY_MAP;
}

export const TIER_LABEL: Record<Tier, string> = {
  normal: "Normal",
  express: "Express",
};

export const STATUS_INFO: Record<
  Status,
  { label: string; className: string; dot: string }
> = {
  pending: { label: "รอตรวจ", className: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  reviewing: { label: "กำลังตรวจ", className: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-500" },
  needs_edit: { label: "ต้องแก้ไข", className: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500" },
  interview: { label: "ผ่านคัดเลือก · รอสัมภาษณ์", className: "bg-violet-50 text-violet-800 ring-violet-200", dot: "bg-violet-500" },
  approved: { label: "ผ่าน", className: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "ไม่ผ่าน", className: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500" },
};

export const ALL_STATUSES = Object.keys(STATUS_INFO) as Status[];
/** สถานะที่ถือว่ายัง "ค้างอยู่" — ห้ามส่งซ้ำประเภทเดียวกัน */
export const ACTIVE_STATUSES: Status[] = ["pending", "reviewing", "needs_edit", "interview"];

export const GENDERS = ["ชาย", "หญิง", "อื่น ๆ / ไม่ระบุ"];

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
export const MAX_SLIP_BYTES = 5 * 1024 * 1024;
export const SLIP_MIME = ["image/png", "image/jpeg", "image/webp"];

export const EVENT_LABEL: Record<string, string> = {
  submitted: "ส่งใบสมัคร",
  resubmitted: "แก้ไขและส่งใหม่",
  claimed: "รับเรื่องตรวจ",
  unclaimed: "ปล่อยเรื่อง",
  needs_edit: "ขอให้แก้ไข",
  interview: "ผ่านคัดเลือก · รอสัมภาษณ์",
  approved: "อนุมัติ (ผ่าน)",
  rejected: "ไม่ผ่าน",
  payment_verified: "ยืนยันสลิปแล้ว",
  payment_unverified: "ยกเลิกการยืนยันสลิป",
  note: "แก้ไขโน้ตภายใน",
  role_sync: "ให้ยศ Discord",
  reopened: "เปิดเรื่องใหม่",
  settings: "แก้ไขการตั้งค่า",
  staff_add: "เพิ่มทีมงาน",
  staff_remove: "ลบทีมงาน",
};
