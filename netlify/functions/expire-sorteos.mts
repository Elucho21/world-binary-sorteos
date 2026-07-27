import { createClient } from "@supabase/supabase-js";

// Runs hourly (see `config.schedule` below). Flips any sorteo that's past
// its ends_at back to 'ended' — spin_wheel() already refuses to run past
// that date, this just keeps the visible status honest so it doesn't look
// "active" in dashboards when it isn't playable anymore.
const expireSorteos = async () => {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("sorteos")
    .update({ status: "ended" })
    .in("status", ["active", "paused"])
    .not("ends_at", "is", null)
    .lt("ends_at", new Date().toISOString());

  if (error) {
    console.error("expire-sorteos failed:", error.message);
  }
};

export default expireSorteos;

export const config = {
  schedule: "@hourly",
};
