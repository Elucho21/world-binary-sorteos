import { createClient } from "@supabase/supabase-js";

// Runs every 6 hours. Emails an educator when one of their active,
// undrawn sorteos doesn't have enough available prize codes to cover its
// winners_count — inert unless RESEND_API_KEY is configured (sendEmail()
// no-ops otherwise). Throttled via audit_log so the same sorteo doesn't
// get re-emailed every run while it stays understocked.
const RENOTIFY_AFTER_HOURS = 24;

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

const notifyLowStock = async () => {
  if (!process.env.RESEND_API_KEY) return; // avoid the DB round-trips entirely when inert

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sorteos, error } = await supabase
    .from("sorteos")
    .select("id, name, educator_id, winners_count")
    .eq("status", "active")
    .is("drawn_at", null);

  if (error) {
    console.error("notify-low-stock: failed to list sorteos:", error.message);
    return;
  }

  const cutoff = new Date(Date.now() - RENOTIFY_AFTER_HOURS * 60 * 60 * 1000).toISOString();

  for (const sorteo of sorteos ?? []) {
    const { count: availableCount } = await supabase
      .from("prize_codes")
      .select("id", { count: "exact", head: true })
      .eq("sorteo_id", sorteo.id)
      .eq("status", "available");

    if ((availableCount ?? 0) >= sorteo.winners_count) continue;

    const { data: recentNotice } = await supabase
      .from("audit_log")
      .select("id")
      .eq("action", "low_stock_email_sent")
      .eq("target_id", sorteo.id)
      .gt("created_at", cutoff)
      .maybeSingle();
    if (recentNotice) continue;

    const { data: userData } = await supabase.auth.admin.getUserById(sorteo.educator_id);
    const email = userData?.user?.email;
    if (!email) continue;

    const sent = await sendEmailViaResend(
      email,
      `Pocos premios cargados: ${sorteo.name}`,
      `<p>Tu sorteo "${sorteo.name}" tiene ${availableCount ?? 0} de ${sorteo.winners_count} cuentas bono disponibles.</p><p>Cargá más antes de sortear para poder cubrir a todos los ganadores.</p>`
    );
    if (!sent) continue;

    await supabase.from("audit_log").insert({
      action: "low_stock_email_sent",
      target_id: sorteo.id,
      metadata: { available: availableCount ?? 0, winners_count: sorteo.winners_count },
    });
  }
};

export default notifyLowStock;

export const config = {
  schedule: "0 */6 * * *",
};
