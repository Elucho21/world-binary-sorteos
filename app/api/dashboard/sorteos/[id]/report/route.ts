import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

interface WinnerRow {
  position: number;
  drawn_at: string;
  participants: { name: string } | { name: string }[] | null;
  prize_codes: { code: string; tier: string | null } | { code: string; tier: string | null }[] | null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireApprovedEducator();
  const { id } = await params;
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("sorteos")
    .select("id, name, winners_count, drawn_at, draw_seed, draw_participants_hash")
    .eq("id", id)
    .single();

  // RLS already scopes `sorteos` to rows the caller owns/can see — a
  // not-found or not-yet-drawn sorteo simply can't produce a report.
  if (!sorteo || !sorteo.drawn_at) {
    return NextResponse.json({ error: "Este sorteo todavía no fue sorteado." }, { status: 404 });
  }

  const { data: winnersData } = await supabase
    .from("raffle_winners")
    .select("position, drawn_at, participants(name), prize_codes(code, tier)")
    .eq("sorteo_id", id)
    .order("position", { ascending: true });

  const winners = ((winnersData ?? []) as unknown as WinnerRow[]).map((w) => {
    const participant = Array.isArray(w.participants) ? w.participants[0] : w.participants;
    const code = Array.isArray(w.prize_codes) ? w.prize_codes[0] : w.prize_codes;
    return {
      position: w.position,
      name: participant?.name ?? "?",
      code: code?.code ?? "—",
      tier: code?.tier ?? null,
    };
  });

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); // A4
  let y = 800;
  const marginX = 50;

  function line(text: string, options: { size?: number; useBold?: boolean; color?: [number, number, number]; gap?: number } = {}) {
    const { size = 11, useBold = false, color = [0.1, 0.1, 0.1], gap = 18 } = options;
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, { x: marginX, y, size, font: useBold ? bold : font, color: rgb(...color) });
    y -= gap;
  }

  line("World Binary — Reporte de sorteo", { size: 18, useBold: true, gap: 28 });
  line(sorteo.name, { size: 14, useBold: true, gap: 22 });
  line(`Sorteado el ${new Date(sorteo.drawn_at).toLocaleString("es-AR")}`, { color: [0.4, 0.4, 0.4] });
  line(`Ganadores sorteados: ${winners.length} de ${sorteo.winners_count} configurados`, {
    color: [0.4, 0.4, 0.4],
    gap: 26,
  });

  line("Ganadores", { size: 13, useBold: true, gap: 20 });
  for (const w of winners) {
    const tierLabel = w.tier ? ` (${w.tier})` : "";
    line(`#${w.position} — ${w.name}${tierLabel} — código: ${w.code}`);
  }

  if (sorteo.draw_seed) {
    line("", { gap: 10 });
    line("Sorteo verificable", { size: 13, useBold: true, gap: 18 });
    line(
      "Los ganadores salieron de un algoritmo determinístico (mulberry32 + Fisher-Yates) sobre la",
      { size: 10, color: [0.4, 0.4, 0.4] }
    );
    line("lista de inscriptos ordenada por fecha de registro.", { size: 10, color: [0.4, 0.4, 0.4] });
    line(`Semilla: ${sorteo.draw_seed}`, { size: 10 });
    if (sorteo.draw_participants_hash) {
      line(`Hash de participantes: ${sorteo.draw_participants_hash}`, { size: 9 });
    }
  }

  const bytes = await pdf.save();
  const filename = `sorteo-${sorteo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-reporte.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
