import { createClient } from "@supabase/supabase-js";

// Runs daily. Early warning for the most common way a small self-hosted
// Supabase project actually runs out of quota: the free tier's 500MB
// database cap. Inert unless RESEND_API_KEY is configured. Only the DB size
// is checked here — Netlify bandwidth/build-minute usage would need their
// account API wired with a personal token, left as a documented follow-up
// (see README) rather than guessed at.
const WARNING_THRESHOLD_BYTES = 400 * 1024 * 1024; // ~80% of the 500MB free tier
const RENOTIFY_AFTER_DAYS = 7;

async function sendEmailViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const from = process.env.RESEND_FROM_EMAIL || "World Binary Sorteos <notificaciones@worldbinary.pro>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const checkQuota = async () => {
  if (!process.env.RESEND_API_KEY) return;

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: settings } = await supabase.from("admin_settings").select("support_email").eq("id", true).single();
  const to = settings?.support_email;
  if (!to) return;

  const { data: sizeBytes, error } = await supabase.rpc("get_database_size_bytes");
  if (error || typeof sizeBytes !== "number" || sizeBytes < WARNING_THRESHOLD_BYTES) return;

  const cutoff = new Date(Date.now() - RENOTIFY_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentNotice } = await supabase
    .from("audit_log")
    .select("id")
    .eq("action", "db_quota_warning_sent")
    .gt("created_at", cutoff)
    .maybeSingle();
  if (recentNotice) return;

  const mb = Math.round(sizeBytes / (1024 * 1024));
  const sent = await sendEmailViaResend(
    to,
    "Alerta: base de datos cerca del límite del plan free",
    `<p>La base de datos de Supabase está usando ~${mb} MB, cerca del límite de 500 MB del plan free.</p><p>Puede ser buen momento para revisar el uso o considerar upgradear el plan.</p>`
  );
  if (!sent) return;

  await supabase.from("audit_log").insert({ action: "db_quota_warning_sent", metadata: { size_bytes: sizeBytes } });
};

export default checkQuota;

export const config = {
  schedule: "@daily",
};
