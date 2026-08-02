import "server-only";

import { unstable_cache } from "next/cache";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

// These wrap reads that are either public-safe (QR) or gated by an ownership
// check the caller already performed with the RLS-scoped client before ever
// reaching here (sorteo/admin stats) — see the note on createAdminClient().
// Numbers here don't need to be exact to the second (v1.7).

export const getCachedSorteoStats = unstable_cache(
  async (sorteoId: string) => {
    const supabase = createAdminClient();
    const [{ data: participants }, { count: prizesAvailable }] = await Promise.all([
      supabase.from("participants").select("created_at").eq("sorteo_id", sorteoId),
      supabase
        .from("prize_codes")
        .select("id", { count: "exact", head: true })
        .eq("sorteo_id", sorteoId)
        .eq("status", "available"),
    ]);
    return { participants: participants ?? [], prizesAvailable: prizesAvailable ?? 0 };
  },
  ["sorteo-stats"],
  { revalidate: 60 }
);

export const getCachedAdminStats = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const [
      { data: recentParticipants },
      { count: totalParticipants },
      { count: totalIssued },
      { count: totalRedeemed },
      { data: participantsBySorteo },
    ] = await Promise.all([
      supabase.from("participants").select("created_at").order("created_at", { ascending: false }).limit(5000),
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "issued"),
      supabase.from("prize_codes").select("id", { count: "exact", head: true }).eq("status", "redeemed"),
      supabase.from("participants").select("sorteo_id, sorteos(name)").limit(5000),
    ]);
    return {
      recentParticipants: recentParticipants ?? [],
      totalParticipants: totalParticipants ?? 0,
      totalIssued: totalIssued ?? 0,
      totalRedeemed: totalRedeemed ?? 0,
      participantsBySorteo: participantsBySorteo ?? [],
    };
  },
  ["admin-stats"],
  { revalidate: 60 }
);

export const getCachedSorteoValueReport = unstable_cache(
  async (sorteoId: string, educatorId: string) => {
    const supabase = createAdminClient();
    const [{ data: thisSorteo }, { data: otherSorteos }] = await Promise.all([
      supabase.from("participants").select("email").eq("sorteo_id", sorteoId),
      supabase.from("participants").select("email, sorteo_id").eq("educator_id", educatorId).neq("sorteo_id", sorteoId),
    ]);

    const seenElsewhere = new Set((otherSorteos ?? []).map((p) => p.email));
    const total = thisSorteo?.length ?? 0;
    const newCount = (thisSorteo ?? []).filter((p) => !seenElsewhere.has(p.email)).length;

    return { total, newCount, returningCount: total - newCount };
  },
  ["sorteo-value-report"],
  { revalidate: 60 }
);

// Content is a pure function of publicUrl — no time-based expiry needed.
export const getCachedQrDataUrl = unstable_cache(
  async (publicUrl: string) => {
    return QRCode.toDataURL(publicUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#191919", light: "#f7f7f7" },
    });
  },
  ["sorteo-qr"],
  { revalidate: false }
);
