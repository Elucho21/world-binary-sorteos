import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { getCachedQrDataUrl } from "@/lib/cache";

// Facebook post template (v1.7 "más formatos de material de marketing").
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
          alignItems: "center",
          justifyContent: "space-between",
          padding: "70px",
          background: "#191919",
          color: "#f7f7f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 680 }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: "#2AA76D" }}>
            🎉 ¡Sorteo activo!
          </div>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, marginTop: 16, lineHeight: 1.2 }}>
            {sorteo.name}
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#a3a3a3", marginTop: 24 }}>
            Registrate gratis y participá por una cuenta bono de World Binary.
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse JSX, not a Next <Image> */}
        <img src={qrDataUrl} width={260} height={260} alt="" style={{ borderRadius: 16 }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
  response.headers.set("Content-Disposition", `attachment; filename="${sorteo.slug}-post-facebook.png"`);
  return response;
}
