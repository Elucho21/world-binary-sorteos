import { ImageResponse } from "next/og";
import { getPublicSorteo } from "./data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sorteo = await getPublicSorteo(slug);
  const educatorLabel = sorteo?.educator_brand_name || sorteo?.educator_display_name || "World Binary";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#191919",
          color: "#f7f7f7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 600, color: "#2AA76D" }}>
          🎉 Sorteo de {educatorLabel}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            marginTop: 24,
            maxWidth: 980,
            lineHeight: 1.15,
          }}
        >
          {sorteo?.name ?? "Sorteo"}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#a3a3a3", marginTop: 32 }}>
          Registrate gratis y participá — World Binary
        </div>
      </div>
    ),
    { ...size }
  );
}
