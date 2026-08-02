import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sorteos World Binary",
    short_name: "WB Sorteos",
    description: "Sorteos y ruletas para educadores e IBs de World Binary.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#191919",
    theme_color: "#191919",
    icons: [
      { src: "/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/icon-512", sizes: "512x512", type: "image/png" },
    ],
  };
}
