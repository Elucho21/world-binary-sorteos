// Reproducible local dev bootstrap: creates a super admin, an approved
// educator, and a sample active sorteo with a couple of available prize
// codes — so a fresh Supabase project doesn't start completely empty and
// nobody has to click through the UI + hand-run SQL every time (see
// supabase/seed.sql for the previous manual runbook, still valid as a
// fallback). Safe to re-run: every step checks for existing data first.
//
// Usage: node scripts/seed-dev.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ADMIN_EMAIL = "admin-dev@example.com";
const EDUCATOR_EMAIL = "educador-dev@example.com";
const PASSWORD = "password123";
const SORTEO_SLUG = "sorteo-demo";

async function findUserByEmail(email) {
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(email, displayName) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) throw new Error(`createUser(${email}): ${error.message}`);
  return data.user;
}

console.log("Creando super admin...");
const adminUser = await ensureUser(ADMIN_EMAIL, "Admin Dev");
const { error: adminError } = await supabase
  .from("profiles")
  .update({ role: "super_admin", status: "approved" })
  .eq("id", adminUser.id);
if (adminError) throw new Error(`profiles(admin): ${adminError.message}`);

console.log("Creando educador aprobado...");
const educatorUser = await ensureUser(EDUCATOR_EMAIL, "Educador Dev");
const { error: educatorError } = await supabase
  .from("profiles")
  .update({ status: "approved", brand_name: "World Binary Demo" })
  .eq("id", educatorUser.id);
if (educatorError) throw new Error(`profiles(educador): ${educatorError.message}`);

console.log("Creando sorteo de ejemplo...");
const { data: existingSorteo } = await supabase.from("sorteos").select("id").eq("slug", SORTEO_SLUG).maybeSingle();

let sorteoId = existingSorteo?.id;
if (!sorteoId) {
  const { data: sorteo, error: sorteoError } = await supabase
    .from("sorteos")
    .insert({
      educator_id: educatorUser.id,
      name: "Sorteo demo",
      slug: SORTEO_SLUG,
      description: "Sorteo de ejemplo para desarrollo local.",
      status: "active",
      winners_count: 2,
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (sorteoError) throw new Error(`sorteos: ${sorteoError.message}`);
  sorteoId = sorteo.id;

  const { data: batch, error: batchError } = await supabase
    .from("code_batches")
    .insert({
      created_by: adminUser.id,
      educator_id: educatorUser.id,
      origin: "admin",
      method: "manual",
      total_codes: 2,
    })
    .select("id")
    .single();
  if (batchError) throw new Error(`code_batches: ${batchError.message}`);

  const { error: codesError } = await supabase.from("prize_codes").insert([
    {
      educator_id: educatorUser.id,
      sorteo_id: sorteoId,
      batch_id: batch.id,
      code: "WB-DEMO-0001",
      status: "available",
      created_by: adminUser.id,
      source: "admin_bulk",
    },
    {
      educator_id: educatorUser.id,
      sorteo_id: sorteoId,
      batch_id: batch.id,
      code: "WB-DEMO-0002",
      status: "available",
      created_by: adminUser.id,
      source: "admin_bulk",
    },
  ]);
  if (codesError) throw new Error(`prize_codes: ${codesError.message}`);
}

console.log("\nListo. Credenciales de desarrollo:");
console.log(`  Super admin: ${ADMIN_EMAIL} / ${PASSWORD}`);
console.log(`  Educador:    ${EDUCATOR_EMAIL} / ${PASSWORD}`);
console.log(`  Sorteo demo: /s/${SORTEO_SLUG}`);
