"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useGuidedTourContext } from "@/components/tour/guided-tour";

const links = [
  { href: "/dashboard", label: "Mis sorteos", tour: undefined },
  { href: "/dashboard/codes", label: "Cuentas bono", tour: "nav-codes" },
  { href: "/dashboard/team", label: "Mi equipo", tour: "nav-team" },
];

export function DashboardNav() {
  const pathname = usePathname();
  const tourCtx = useGuidedTourContext();

  function replayCurrentTour() {
    if (pathname === "/dashboard" && tourCtx) tourCtx.replay("dashboard-home");
  }

  return (
    <nav className="flex items-center justify-between gap-1 border-b border-brand-border px-4 sm:px-6">
      <div className="flex gap-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              data-tour={link.tour}
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
      </div>
      {pathname === "/dashboard" && (
        <button
          type="button"
          onClick={replayCurrentTour}
          className="hidden text-xs text-brand-muted underline hover:text-brand-text sm:inline"
        >
          ¿Cómo funciona?
        </button>
      )}
    </nav>
  );
}
