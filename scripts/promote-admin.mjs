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

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/promote-admin.mjs <email>");
  process.exit(1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let targetUser = null;
let page = 1;
while (!targetUser) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("Error listing users:", error.message);
    process.exit(1);
  }
  targetUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (targetUser || data.users.length < 200) break;
  page += 1;
}

if (!targetUser) {
  console.error(`No se encontró ningún usuario registrado con el email ${email}. Registrate primero en /signup.`);
  process.exit(1);
}

const { error: updateError } = await supabase
  .from("profiles")
  .update({ role: "super_admin", status: "approved" })
  .eq("id", targetUser.id);

if (updateError) {
  console.error("Error updating profile:", updateError.message);
  process.exit(1);
}

await supabase.from("audit_log").insert({
  actor_id: targetUser.id,
  action: "promoted_to_super_admin",
  target_id: targetUser.id,
  metadata: { via: "scripts/promote-admin.mjs", email },
});

console.log(`Listo: ${email} ahora es super_admin y está approved.`);
