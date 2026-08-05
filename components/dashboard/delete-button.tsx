"use client";

import { Button } from "@/components/ui/button";

export function ConfirmButton({
  action,
  confirmText,
  children,
  variant = "danger",
  disabled = false,
}: {
  action: () => Promise<void> | void;
  confirmText: string;
  children: React.ReactNode;
  variant?: "danger" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <form
      action={() => {
        if (window.confirm(confirmText)) {
          action();
        }
      }}
    >
      <Button type="submit" variant={variant} size="sm" disabled={disabled}>
        {children}
      </Button>
    </form>
  );
}
