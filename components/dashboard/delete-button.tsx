"use client";

import { Button } from "@/components/ui/button";

export function ConfirmButton({
  action,
  confirmText,
  children,
  variant = "danger",
}: {
  action: () => Promise<void> | void;
  confirmText: string;
  children: React.ReactNode;
  variant?: "danger" | "secondary" | "ghost";
}) {
  return (
    <form
      action={() => {
        if (window.confirm(confirmText)) {
          action();
        }
      }}
    >
      <Button type="submit" variant={variant} size="sm">
        {children}
      </Button>
    </form>
  );
}
