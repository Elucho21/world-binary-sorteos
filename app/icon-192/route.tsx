import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2AA76D",
          color: "#ffffff",
          fontFamily: "sans-serif",
          fontSize: 96,
          fontWeight: 700,
        }}
      >
        WB
      </div>
    ),
    { width: 192, height: 192 }
  );
}
