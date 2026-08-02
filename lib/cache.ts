import "server-only";

import { unstable_cache } from "next/cache";
import QRCode from "qrcode";

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
