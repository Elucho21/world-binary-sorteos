"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareCopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard API unavailable — nothing to fall back to gracefully here.
        }
      }}
    >
      {copied ? "¡Copiado!" : label}
    </Button>
  );
}
