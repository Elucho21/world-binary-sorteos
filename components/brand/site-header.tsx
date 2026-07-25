import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-brand-border bg-brand-bg/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-brand-text">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" />
          World Binary <span className="text-brand-primary">Sorteos</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-brand-muted">
          <Link href="/mis-premios" className="hover:text-brand-text">
            Mis Premios
          </Link>
          <Link href="/login" className="hover:text-brand-text">
            Ingresar
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-brand-primary px-3 py-1.5 font-medium text-brand-primary-foreground hover:bg-brand-primary-hover"
          >
            Soy educador/IB
          </Link>
        </nav>
      </div>
    </header>
  );
}
