import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getCachedQrDataUrl } from "@/lib/cache";

// Instagram story template (v1.7 "más formatos de material de marketing").
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireApprovedEducator();
  const { id } = await params;
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("id, name, slug").eq("id", id).single();
  if (!sorteo) notFound();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const publicUrl = `${siteUrl}/s/${sorteo.slug}`;
  const qrDataUrl = await getCachedQrDataUrl(publicUrl);

  const response = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "100px 60px",
          background: "#191919",
          color: "#f7f7f7",
          fontFamily: "sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, fontWeight: 600, color: "#2AA76D" }}>
          🎉 ¡Sorteo activo!
        </div>
        <div style={{ display: "flex", fontSize: 72, fontWeight: 700, lineHeight: 1.15, maxWidth: 880 }}>
          {sorteo.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse JSX, not a Next <Image> */}
          <img src={qrDataUrl} width={300} height={300} alt="" style={{ borderRadius: 16 }} />
          <div style={{ display: "flex", fontSize: 36, color: "#a3a3a3" }}>Escaneá para participar</div>
        </div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#F5B400" }}>World Binary</div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
  response.headers.set("Content-Disposition", `attachment; filename="${sorteo.slug}-story-instagram.png"`);
  return response;
}
