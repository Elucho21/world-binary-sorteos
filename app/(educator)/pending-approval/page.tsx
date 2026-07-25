import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/dal";
import { logout } from "../../(auth)/actions";
import { SiteHeader } from "@/components/brand/site-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function PendingApprovalPage() {
  const profile = await requireAuth();

  if (profile.role === "super_admin") redirect("/admin");
  if (profile.status === "approved") redirect("/dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>
              {profile.status === "rejected" ? "Cuenta no aprobada" : "Cuenta en revisión"}
            </CardTitle>
            <CardDescription>
              {profile.status === "rejected"
                ? "Tu cuenta no fue aprobada. Contactá a World Binary si creés que es un error."
                : "World Binary está revisando tu cuenta de educador/IB. Te vamos a avisar por email apenas esté aprobada."}
            </CardDescription>
          </CardHeader>
          <form action={logout}>
            <Button type="submit" variant="secondary" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
