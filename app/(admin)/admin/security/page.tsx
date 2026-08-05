import { requireSuperAdmin } from "@/lib/auth/dal";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MfaSettings } from "@/components/admin/mfa-settings";

export default async function AdminSecurityPage() {
  await requireSuperAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Seguridad</h1>
        <p className="text-sm text-brand-muted">Verificación en dos pasos para tu cuenta de super admin.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verificación en dos pasos (TOTP)</CardTitle>
          <CardDescription>
            Opcional pero recomendado: pedí un código de una app autenticadora además de tu
            contraseña al iniciar sesión.
          </CardDescription>
        </CardHeader>
        <MfaSettings />
      </Card>
    </div>
  );
}
