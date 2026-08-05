import "server-only";
import { promises as dns } from "node:dns";

// Known disposable/throwaway email domains. Not exhaustive — just enough to
// keep the obvious "mailinator it" crowd out of /admin/leads without trying
// to maintain a full anti-fraud domain list.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.info",
  "10minutemail.com",
  "10minutemail.net",
  "temp-mail.org",
  "tempmail.com",
  "tempmailo.com",
  "throwawaymail.com",
  "yopmail.com",
  "trashmail.com",
  "fakeinbox.com",
  "getnada.com",
  "dispostable.com",
  "sharklasers.com",
  "mintemail.com",
  "maildrop.cc",
  "moakt.com",
]);

export function isDisposableDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// Best-effort MX check to filter out obviously-fake email domains on the
// public spin form. Never blocks on our own infra problems: a timeout or
// any error other than a definitive "no such domain" lets the email through.
export async function hasMxRecord(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  if (!domain) return false;

  const lookup = dns.resolveMx(domain).then(
    (records) => (records.length > 0 ? "yes" : "no"),
    (err: NodeJS.ErrnoException) => (err.code === "ENOTFOUND" || err.code === "ENODATA" ? "no" : "unknown")
  );
  const timeout = new Promise<"unknown">((resolve) => setTimeout(() => resolve("unknown"), 2500));

  const result = await Promise.race([lookup, timeout]);
  return result !== "no";
}
