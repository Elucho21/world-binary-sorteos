import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ValueReportCard({
  total,
  newCount,
  returningCount,
}: {
  total: number;
  newCount: number;
  returningCount: number;
}) {
  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reporte de valor</CardTitle>
        <CardDescription>Qué te trajo este sorteo, más allá de los inscriptos.</CardDescription>
      </CardHeader>
      {total === 0 ? (
        <p className="text-sm text-brand-muted">Todavía no hay inscriptos para calcular esto.</p>
      ) : (
        <div className="space-y-1 text-sm">
          <p>
            Conseguiste <strong>{newCount} inscriptos nuevos</strong> ({newPct}%) que nunca habían
            participado en otro sorteo tuyo antes.
          </p>
          {returningCount > 0 && (
            <p className="text-brand-muted">
              Los otros {returningCount} ya te conocían de otro sorteo — siguen activos en tu comunidad.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
