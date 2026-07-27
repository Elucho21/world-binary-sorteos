"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

export async function updateSiteSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const siteName = String(formData.get("siteName") ?? "").trim();
  const supportEmail = String(formData.get("supportEmail") ?? "").trim();
  const webhookUrl = String(formData.get("webhookUrl") ?? "").trim();

  if (webhookUrl) {
    try {
      new URL(webhookUrl);
    } catch {
      return { error: "La URL del webhook no es válida." };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("admin_settings")
    .update({
      site_name: siteName || "World Binary Sorteos",
      support_email: supportEmail || null,
      webhook_url: webhookUrl || null,
    })
    .eq("id", true);

  if (error) return { error: "No se pudo guardar la configuración." };

  revalidatePath("/admin/settings");
  return { success: "Configuración guardada." };
}
