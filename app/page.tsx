import Link from "next/link";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-20 text-center sm:px-6">
        <div className="space-y-4">
          <span className="inline-block rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs font-medium text-brand-muted">
            Para educadores e IBs de World Binary
          </span>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sorteos con ruleta para tu comunidad de trading
          </h1>
          <p className="mx-auto max-w-2xl text-brand-muted">
            Creá tu sorteo, cargá tus cuentas bono como premio, y compartí el link con tu
            comunidad. Nosotros nos encargamos del branding, el registro de participantes y el
            sorteo en vivo.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/signup">
            <Button size="lg">Crear cuenta de educador</Button>
          </Link>
          <Link href="/mis-premios">
            <Button size="lg" variant="secondary">
              Ya participé, ver mis premios
            </Button>
          </Link>
        </div>

        <div className="grid w-full gap-4 pt-10 text-left sm:grid-cols-3">
          <Card>
            <CardTitle>Sorteo en vivo con ruleta</CardTitle>
            <CardDescription className="mt-2">
              Todos tus inscriptos entran a la ruleta; elegís cuántos ganadores salen y disparás
              el sorteo cuando quieras.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle>Cuentas bono como premio</CardTitle>
            <CardDescription className="mt-2">
              Cargá tus códigos por archivo o a mano; World Binary también puede distribuirte
              códigos directamente.
            </CardDescription>
          </Card>
          <Card>
            <CardTitle>Leads centralizados</CardTitle>
            <CardDescription className="mt-2">
              Nombre, email y educador de cada participante, listo para exportar.
            </CardDescription>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
