import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-brand-border bg-brand-bg/95 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-brand-text"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-brand-accent" />
          <span className="whitespace-nowrap">
            World Binary <span className="hidden text-brand-primary sm:inline">Sorteos</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm text-brand-muted sm:gap-4">
          <Link href="/mis-premios" className="hidden hover:text-brand-text sm:inline">
            Mis Premios
          </Link>
          <Link href="/login" className="hover:text-brand-text">
            Ingresar
          </Link>
          <Link
            href="/signup"
            className="whitespace-nowrap rounded-md bg-brand-primary px-2.5 py-1.5 font-medium text-brand-primary-foreground hover:bg-brand-primary-hover sm:px-3"
          >
            <span className="sm:hidden">Educador</span>
            <span className="hidden sm:inline">Soy educador/IB</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
