import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database.types";

// Data Access Layer: every protected Server Component / Server Action /
// Route Handler should go through these instead of reading cookies/session
// directly, so the "who is this and are they allowed" check lives in one
// place. cache() memoizes per request so repeated calls in the same render
// pass don't re-hit Supabase.

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export async function requireAuth(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

// Educators must be approved before touching their dashboard; super admins
// always pass through since they can act on any educator's behalf.
export async function requireApprovedEducator(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role === "super_admin") return profile;
  if (profile.status === "pending") redirect("/pending-approval");
  if (profile.status === "rejected") redirect("/login?error=rejected");
  return profile;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await requireAuth();
  if (profile.role !== "super_admin") redirect("/dashboard");
  return profile;
}

// A "Mi equipo" sub-account manages the owning educator's sorteos, not its
// own — every educator_id read/write in the dashboard should go through
// this instead of profile.id directly.
export function effectiveEducatorId(profile: Profile): string {
  return profile.managed_by ?? profile.id;
}
