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

export type TestWebhookState = { error?: string; success?: string };

export async function testWebhook(): Promise<TestWebhookState> {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const { data: settings } = await supabase.from("admin_settings").select("webhook_url").eq("id", true).single();
  const url = settings?.webhook_url;
  if (!url) return { error: "No hay ningún webhook configurado todavía." };

  let ok = false;
  let detail: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: "test_webhook", timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ok = res.ok;
    detail = `HTTP ${res.status}`;
  } catch (err) {
    detail = err instanceof Error ? err.message : "error desconocido";
  }

  await supabase.from("audit_log").insert({
    actor_id: admin.id,
    action: "webhook_test",
    metadata: { success: ok, detail, url },
  });
  revalidatePath("/admin/audit");

  return ok ? { success: `El webhook respondió OK (${detail}).` } : { error: `El webhook falló (${detail}).` };
}
