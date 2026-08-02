"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes, createHash } from "node:crypto";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sorteoSchema } from "@/lib/validation";

// Seeded shuffle so a draw can be reproduced and checked independently (v1.7
// "sorteo verificable"): given the revealed seed and the same participant
// list (created_at asc, id asc — see drawWinners), anyone can re-run this
// exact algorithm and confirm the winner order matches.
function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export type FormState = { error?: string } | undefined;

function toTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createSorteo(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const parsed = sorteoSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxEntries: formData.get("maxEntries") || undefined,
    winnersCount: formData.get("winnersCount") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sorteos")
    .insert({
      educator_id: effectiveEducatorId(profile),
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      starts_at: toTimestamp(parsed.data.startsAt),
      ends_at: toTimestamp(parsed.data.endsAt),
      max_entries: parsed.data.maxEntries ?? null,
      winners_count: parsed.data.winnersCount,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ese slug ya está en uso, probá con otro." };
    return { error: "No se pudo crear el sorteo." };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/sorteos/${data.id}?new=1`);
}

export async function updateSorteo(sorteoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedEducator();
  const parsed = sorteoSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxEntries: formData.get("maxEntries") || undefined,
    winnersCount: formData.get("winnersCount") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sorteos")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      starts_at: toTimestamp(parsed.data.startsAt),
      ends_at: toTimestamp(parsed.data.endsAt),
      max_entries: parsed.data.maxEntries ?? null,
      winners_count: parsed.data.winnersCount,
    })
    .eq("id", sorteoId);

  if (error) {
    if (error.code === "23505") return { error: "Ese slug ya está en uso, probá con otro." };
    return { error: "No se pudo guardar." };
  }

  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  return undefined;
}

export async function setSorteoStatus(
  sorteoId: string,
  status: "draft" | "active" | "paused" | "ended"
): Promise<FormState> {
  await requireApprovedEducator();
  const supabase = await createClient();

  if (status === "active") {
    const { count: availableCount } = await supabase
      .from("prize_codes")
      .select("id", { count: "exact", head: true })
      .eq("sorteo_id", sorteoId)
      .eq("status", "available");

    if (!availableCount || availableCount === 0) {
      return {
        error:
          "No podés activar este sorteo: todavía no le cargaste ninguna cuenta bono como premio.",
      };
    }
  }

  const { error } = await supabase.from("sorteos").update({ status }).eq("id", sorteoId);
  if (error) return { error: "No se pudo cambiar el estado del sorteo." };
  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  revalidatePath("/dashboard");
  return undefined;
}

export async function cloneSorteo(sorteoId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: original } = await supabase.from("sorteos").select("*").eq("id", sorteoId).single();
  if (!original) throw new Error("Sorteo no encontrado.");

  const slug = `${original.slug}-copia-${Date.now().toString(36)}`;

  const { data: newSorteo, error } = await supabase
    .from("sorteos")
    .insert({
      educator_id: original.educator_id,
      name: `${original.name} (copia)`,
      slug,
      description: original.description,
      max_entries: original.max_entries,
      winners_count: original.winners_count,
    })
    .select("id")
    .single();

  if (error || !newSorteo) throw new Error("No se pudo duplicar el sorteo.");

  revalidatePath("/dashboard");
  redirect(`/dashboard/sorteos/${newSorteo.id}`);
}

export async function deleteSorteo(sorteoId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase.from("sorteos").delete().eq("id", sorteoId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// --- the draw ---

export type DrawnWinner = { participantId: string; name: string; code: string | null; tier: string | null };
export type DrawResult = { error?: string; winners?: DrawnWinner[] };

export async function drawWinners(sorteoId: string): Promise<DrawResult> {
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("*").eq("id", sorteoId).single();
  if (!sorteo) return { error: "Sorteo no encontrado." };
  if (sorteo.drawn_at) return { error: "Este sorteo ya fue sorteado." };

  // Deterministic order: this exact list (and order) is what the seeded
  // shuffle below runs over, and what draw_participants_hash commits to.
  const { data: participants } = await supabase
    .from("participants")
    .select("id, name")
    .eq("sorteo_id", sorteoId)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (!participants || participants.length === 0) {
    return { error: "Todavía no hay participantes registrados." };
  }

  // Lowest tier_priority first, so position 1 always lands the top-tier prize.
  const { data: availableCodes } = await supabase
    .from("prize_codes")
    .select("id, tier")
    .eq("sorteo_id", sorteoId)
    .eq("status", "available")
    .order("tier_priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(sorteo.winners_count);

  if (!availableCodes || availableCodes.length === 0) {
    return { error: "No hay premios cargados para este sorteo. Cargá códigos primero." };
  }

  const winnersCount = Math.min(sorteo.winners_count, participants.length, availableCodes.length);

  const seedHex = randomBytes(4).toString("hex");
  const rng = mulberry32(parseInt(seedHex, 16));
  const participantsHash = createHash("sha256").update(JSON.stringify(participants.map((p) => p.id))).digest("hex");

  const shuffled = seededShuffle(participants, rng);
  const chosen = shuffled.slice(0, winnersCount);

  const results: DrawnWinner[] = [];

  for (let i = 0; i < chosen.length; i++) {
    const participant = chosen[i];
    const code = availableCodes[i];

    const { data: claimedCode, error: claimError } = await supabase
      .from("prize_codes")
      .update({ status: "issued", issued_to: participant.id, issued_at: new Date().toISOString() })
      .eq("id", code.id)
      .eq("status", "available")
      .select("code")
      .single();

    if (claimError || !claimedCode) continue;

    await supabase.from("raffle_winners").insert({
      sorteo_id: sorteoId,
      participant_id: participant.id,
      prize_code_id: code.id,
      position: i + 1,
    });

    results.push({ participantId: participant.id, name: participant.name, code: claimedCode.code, tier: code.tier });
  }

  if (results.length === 0) {
    return { error: "No se pudo completar el sorteo. Probá de nuevo." };
  }

  await supabase
    .from("sorteos")
    .update({
      drawn_at: new Date().toISOString(),
      status: "ended",
      draw_seed: seedHex,
      draw_participants_hash: participantsHash,
    })
    .eq("id", sorteoId);

  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  revalidatePath("/dashboard");

  return { winners: results };
}
