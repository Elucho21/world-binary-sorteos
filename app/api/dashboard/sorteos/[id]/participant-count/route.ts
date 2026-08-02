import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

// Lightweight poll target for the "Pulso en vivo" card on the Sortear screen
// (v1.7). RLS on `participants` already scopes rows to the caller's own
// sorteos, so a sorteoId the caller doesn't own just resolves to 0.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "super_admin" && profile.status !== "approved")) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const { count } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("sorteo_id", id);

  return NextResponse.json({ count: count ?? 0 });
}
