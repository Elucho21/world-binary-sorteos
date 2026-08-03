import "server-only";

// Transactional email via Resend's HTTP API — inert unless RESEND_API_KEY is
// set. When not configured, sendEmail() is a no-op that returns false, so
// every call site must already treat email as best-effort (never block a
// real user action on this). Uses raw fetch instead of the resend package to
// avoid a new dependency, same call as lib/turnstile.ts.
export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const from = process.env.RESEND_FROM_EMAIL || "World Binary Sorteos <notificaciones@worldbinary.pro>";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: params.to, subject: params.subject, html: params.html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
