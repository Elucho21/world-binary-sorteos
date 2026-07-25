import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import type { Profile } from "@/types/database.types";

export function DashboardHeader({
  profile,
  homeHref,
  title,
}: {
  profile: Profile;
  homeHref: string;
  title: string;
}) {
  return (
    <header className="border-b border-brand-border bg-brand-bg/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href={homeHref} className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" />
          {title}
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-brand-muted">{profile.display_name ?? "Cuenta"}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Salir
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
