"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/educators", label: "Educadores" },
  { href: "/admin/codes", label: "Cuentas bono" },
  { href: "/admin/sorteos", label: "Sorteos" },
  { href: "/admin/stats", label: "Estadísticas" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/audit", label: "Auditoría" },
  { href: "/admin/settings", label: "Config" },
  { href: "/admin/security", label: "Seguridad" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-brand-border px-4 sm:px-6">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 -mb-px",
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
