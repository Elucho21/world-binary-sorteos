"use client";

import Script from "next/script";
import { useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => void;
    };
  }
}

export function TurnstileWidget({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const rawId = useId();
  const containerId = `turnstile-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const rendered = useRef(false);

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => {
          if (rendered.current || !window.turnstile) return;
          rendered.current = true;
          window.turnstile.render(`#${containerId}`, { sitekey: siteKey, callback: onToken });
        }}
      />
      <div id={containerId} />
    </>
  );
}
