import "server-only";

// Best-effort outbound notification to the CRM URL configured in
// admin_settings.webhook_url (see /admin/settings). Used both at
// registration time and after a draw resolves each participant's result —
// a CRM outage should never affect either flow, hence the swallowed errors.

export interface CrmWebhookPayload {
  name: string;
  email: string;
  sorteo_slug: string;
  sorteo_name: string | null;
  educador: string | null;
  evento: string;
  gano: boolean | null;
  codigo: string | null;
}

export async function sendCrmWebhook(url: string, payload: CrmWebhookPayload) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => undefined);
    clearTimeout(timeout);
  } catch {
    // Best-effort only.
  }
}
