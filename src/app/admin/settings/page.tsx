import { requireStaff } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { PageTitle } from "@/components/ui";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "ตั้งค่า" };

export default async function SettingsPage() {
  await requireStaff(["admin"]);
  const settings = await getSettings();
  return (
    <div>
      <PageTitle title="ตั้งค่า" subtitle="เปิด/ปิดรับ, ข้อมูลการชำระเงิน, สายเลือดเทพ และการให้ยศ Discord" />
      <SettingsForm initial={settings} />
    </div>
  );
}
