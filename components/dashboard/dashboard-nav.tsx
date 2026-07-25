"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Mis sorteos" },
  { href: "/dashboard/codes", label: "Cuentas bono" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b border-brand-border px-4 sm:px-6">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "px-3 py-3 text-sm font-medium border-b-2 -mb-px",
              active
                ? "border-brand-primary text-brand-text"
                : "border-transparent text-brand-muted hover:text-brand-text"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
