import "server-only";
import { promises as dns } from "node:dns";

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
