import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function VerifiableDrawCard({
  seed,
  participantsHash,
}: {
  seed: string;
  participantsHash: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sorteo verificable</CardTitle>
        <CardDescription>
          Cualquiera puede auditar que este sorteo no se manipuló.
        </CardDescription>
      </CardHeader>
      <div className="space-y-2 text-sm">
        <p className="text-brand-muted">
          Los ganadores salieron de un algoritmo determinístico (mulberry32 + Fisher-Yates) sobre
          la lista de inscriptos ordenada por fecha de registro. Con la semilla y el hash de abajo,
          cualquiera que tenga esa misma lista puede repetir el sorteo y confirmar que da el mismo
          resultado.
        </p>
        <div className="rounded-md border border-brand-border bg-brand-bg p-3 font-mono text-xs">
          <p>seed: {seed}</p>
          {participantsHash && <p className="mt-1 break-all">hash: {participantsHash}</p>}
        </div>
      </div>
    </Card>
  );
}
