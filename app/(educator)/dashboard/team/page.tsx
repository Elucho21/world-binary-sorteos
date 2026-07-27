import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteTeamForm } from "@/components/dashboard/invite-team-form";
import { removeTeamMember } from "./actions";

export default async function TeamPage() {
  const profile = await requireApprovedEducator();

  if (profile.managed_by) {
    return (
      <Card>
        <CardTitle>Mi equipo</CardTitle>
        <CardDescription className="mt-2">
          Esta sección solo la puede usar el dueño de la cuenta.
        </CardDescription>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, display_name, status, created_at")
    .eq("managed_by", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi equipo</h1>
        <p className="text-sm text-brand-muted">
          Invitá a alguien que te ayude a gestionar tus sorteos. Va a tener el mismo acceso que
          vos sobre tus sorteos, segmentos, códigos y participantes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invitar</CardTitle>
        </CardHeader>
        <InviteTeamForm />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Miembros ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {(members ?? []).map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between border-b border-brand-border/60 py-2"
            >
              <div>
                <p>{member.display_name}</p>
                <Badge tone="accent">Miembro del equipo</Badge>
              </div>
              <form action={removeTeamMember.bind(null, member.id)}>
                <Button type="submit" size="sm" variant="danger">
                  Quitar
                </Button>
              </form>
            </div>
          ))}
          {(!members || members.length === 0) && (
            <p className="text-sm text-brand-muted">Todavía no invitaste a nadie.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
