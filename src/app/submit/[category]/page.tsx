import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ACTIVE_STATUSES, CATEGORY_MAP, isCategory } from "@/lib/constants";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/supabase";
import { ApplicationForm } from "@/components/application-form";
import type { ApplicationInput } from "@/lib/validation";
import { IconSeal } from "@/components/greek";

export default async function SubmitCategoryPage({ params, searchParams }: PageProps<"/submit/[category]">) {
  const { category } = await params;
  const sp = await searchParams;
  if (!isCategory(category)) notFound();
  const cat = CATEGORY_MAP[category];
  const editId = typeof sp.edit === "string" ? sp.edit : null;

  const user = await requireUser(`/submit/${category}${editId ? `?edit=${editId}` : ""}`);
  const settings = await getSettings();

  let initial: Partial<ApplicationInput> | undefined;
  let existingFiles: { pdf: boolean; slip: boolean } | undefined;
  let reason: string | null = null;

  if (editId) {
    const { data } = await db().from("applications").select("*").eq("id", editId).maybeSingle();
    if (!data || data.discord_id !== user.id || data.category !== category) notFound();
    if (data.status !== "needs_edit") redirect(`/my/${editId}`);
    initial = {
      tier: data.tier,
      lineage: data.lineage ?? "",
      extra_role: data.extra_role ?? "",
      ic_name: data.ic_name,
      ic_name_reading: data.ic_name_reading,
      academic_year: data.academic_year,
      oc_age: String(data.oc_age),
      oc_gender: data.oc_gender,
      hair_eye_color: data.hair_eye_color,
      steam_hex: data.steam_hex,
      facebook_url: data.facebook_url,
      email: data.email,
    };
    existingFiles = { pdf: !!data.pdf_path, slip: !!data.slip_path };
    reason = data.reason;
  } else {
    if (!settings.open[category]) {
      return (
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <p className="text-lg font-semibold">{cat.name} ปิดรับชั่วคราว</p>
          <Link href="/submit" className="btn-ghost mt-6">กลับ</Link>
        </div>
      );
    }
    const { data: dup } = await db()
      .from("applications")
      .select("id, status")
      .eq("discord_id", user.id)
      .eq("category", category)
      .in("status", [...ACTIVE_STATUSES, "approved"])
      .limit(1);
    if (dup?.length) {
      if (dup[0].status === "needs_edit") redirect(`/submit/${category}?edit=${dup[0].id}`);
      redirect(`/my/${dup[0].id}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/submit" className="text-sm text-muted hover:text-ink">← เลือกประเภทอื่น</Link>
      <div className="mt-6 mb-10 flex items-center gap-5 border-b border-line pb-8">
        <IconSeal category={category} size="lg" />
        <div>
          <p className="eyebrow mb-1">{cat.short}</p>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
            {editId ? "แก้ไขใบสมัคร · " : "สมัคร "}
            {cat.name}
          </h1>
          <p className="mt-1 text-sm text-muted">{cat.description}</p>
        </div>
      </div>

      {reason && (
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm">
          <p className="font-medium text-orange-800">สิ่งที่ทีมงานขอให้แก้ไข</p>
          <p className="mt-1 whitespace-pre-line text-orange-900/80">{reason}</p>
        </div>
      )}

      <ApplicationForm
        category={category}
        tiers={cat.tiers}
        discordId={user.id}
        editId={editId}
        initial={initial}
        existingFiles={existingFiles}
        options={{
          academicYears: settings.academicYears,
          lineages: settings.lineages.map(({ key, name, title }) => ({ key, name, title })),
          extraRoles: settings.extraRoles.map(({ key, name }) => ({ key, name })),
          expressPrice: settings.expressPrice,
          bank: settings.bank,
          qrImageUrl: settings.qrImageUrl,
        }}
      />
    </div>
  );
}
