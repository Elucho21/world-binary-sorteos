import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManualCodesForm, FileCodesForm } from "@/components/dashboard/code-upload-forms";

export default async function CodesPage() {
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: codes } = await supabase
    .from("prize_codes")
    .select("id, code, status, source, created_at")
    .eq("educator_id", profile.id)
    .order("created_at", { ascending: false });

  const all = codes ?? [];
  const unassigned = all.filter((c) => c.status === "unassigned");
  const counts = {
    unassigned: unassigned.length,
    available: all.filter((c) => c.status === "available").length,
    issued: all.filter((c) => c.status === "issued").length,
    redeemed: all.filter((c) => c.status === "redeemed").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Cuentas bono</h1>
        <p className="text-sm text-brand-muted">
          Tu pool general de códigos. Los que no tenés asignados a ningún sorteo quedan
          disponibles para asignar desde la sección &quot;Códigos&quot; de cada sorteo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{counts.unassigned}</p>
          <p className="text-xs text-brand-muted">Sin asignar</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{counts.available}</p>
          <p className="text-xs text-brand-muted">Disponibles en sorteo</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{counts.issued}</p>
          <p className="text-xs text-brand-muted">Emitidos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{counts.redeemed}</p>
          <p className="text-xs text-brand-muted">Canjeados</p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cargar a mano</CardTitle>
          </CardHeader>
          <ManualCodesForm />
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cargar por archivo</CardTitle>
          </CardHeader>
          <FileCodesForm />
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sin asignar ({unassigned.length})</CardTitle>
          <CardDescription>
            Estos códigos están disponibles para asignar a un segmento desde cualquier sorteo.
          </CardDescription>
        </CardHeader>
        <div className="max-h-80 space-y-1 overflow-y-auto font-mono text-sm">
          {unassigned.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-brand-border/60 py-1.5">
              <span>{c.code}</span>
              <Badge tone={c.source === "admin_bulk" ? "accent" : "neutral"}>
                {c.source === "admin_bulk" ? "World Binary" : "Propio"}
              </Badge>
            </div>
          ))}
          {unassigned.length === 0 && (
            <p className="font-sans text-sm text-brand-muted">No tenés códigos sin asignar.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
