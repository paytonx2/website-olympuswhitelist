import { GENDERS, type Category, type Tier } from "./constants";

export type ApplicationInput = {
  category: Category;
  tier: Tier;
  lineage: string;
  extra_role: string;
  ic_name: string;
  ic_name_reading: string;
  academic_year: string;
  oc_age: string;
  oc_gender: string;
  hair_eye_color: string;
  steam_hex: string;
  facebook_url: string;
  email: string;
};

export type FieldErrors = Partial<Record<keyof ApplicationInput | "pdf" | "slip", string>>;

export function normalizeSteamHex(v: string) {
  const s = v.trim().toLowerCase().replace(/^steam:/, "");
  return `steam:${s}`;
}

const STEAM_RE = /^(steam:)?11000[0-9a-f]{10}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateApplication(
  v: ApplicationInput,
  opts: {
    tiers: Tier[];
    academicYears: string[];
    lineageKeys: string[];
    extraRoleKeys: string[];
  },
): FieldErrors {
  const e: FieldErrors = {};
  const req = (k: keyof ApplicationInput, label: string, max = 120) => {
    const val = (v[k] ?? "").trim();
    if (!val) e[k] = `กรุณากรอก${label}`;
    else if (val.length > max) e[k] = `${label}ยาวเกิน ${max} ตัวอักษร`;
  };

  if (!opts.tiers.includes(v.tier)) e.tier = "รูปแบบการส่งไม่ถูกต้อง";
  if (v.category === "demigod" && !opts.lineageKeys.includes(v.lineage)) e.lineage = "กรุณาเลือกสายเลือดเทพ";
  if (v.category === "extra" && !opts.extraRoleKeys.includes(v.extra_role)) e.extra_role = "กรุณาเลือกตำแหน่ง";

  req("ic_name", "ชื่อตัวละคร IC", 60);
  req("ic_name_reading", "คำอ่านชื่อตัวละคร", 80);
  req("hair_eye_color", "สีผม/สีตา", 120);

  if (!opts.academicYears.includes(v.academic_year)) e.academic_year = "กรุณาเลือกปีการศึกษา";

  const age = Number(v.oc_age);
  if (!v.oc_age || !Number.isInteger(age)) e.oc_age = "กรุณากรอกอายุเป็นตัวเลข";
  else if (age < 10 || age > 80) e.oc_age = "อายุไม่ถูกต้อง";

  if (!GENDERS.includes(v.oc_gender)) e.oc_gender = "กรุณาเลือกเพศ";

  if (!STEAM_RE.test(v.steam_hex.trim())) e.steam_hex = "รูปแบบ SteamHex ไม่ถูกต้อง (เช่น steam:110000112345678)";

  const fb = v.facebook_url.trim();
  try {
    const u = new URL(fb);
    if (!/^https?:$/.test(u.protocol) || !/(^|\.)(facebook\.com|fb\.com|fb\.me)$/i.test(u.hostname)) {
      e.facebook_url = "กรุณาใส่ลิงก์ Facebook (facebook.com)";
    }
  } catch {
    e.facebook_url = "กรุณาใส่ลิงก์ Facebook ให้ถูกต้อง (ขึ้นต้นด้วย https://)";
  }

  if (!EMAIL_RE.test(v.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
  return e;
}
