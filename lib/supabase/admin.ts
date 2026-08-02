import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Service-role client. Bypasses RLS entirely — only import this from
// server-only code (Route Handlers, Server Actions) that has already
// verified the caller is a super admin, or (e.g. lib/cache.ts) has
// independently verified ownership of the exact resource being read before
// this client is ever called. Never expose this key to the client.
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
