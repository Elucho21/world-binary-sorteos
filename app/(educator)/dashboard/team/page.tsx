import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InviteTeamForm } from "@/components/dashboard/invite-team-form";
import { removeTeamMember, resendTeamInvite } from "./actions";

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

  const admin = createAdminClient();
  const membersWithInviteStatus = await Promise.all(
    (members ?? []).map(async (member) => {
      const { data } = await admin.auth.admin.getUserById(member.id);
      return { ...member, invitePending: !data.user?.last_sign_in_at };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi equipo</h1>
        <p className="text-sm text-brand-muted">
          Invitá a alguien que te ayude a gestionar tus sorteos. Va a tener el mismo acceso que
          vos sobre tus sorteos, premios y participantes.
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
          <CardTitle>Miembros ({membersWithInviteStatus.length})</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {membersWithInviteStatus.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-border/60 py-2"
            >
              <div>
                <p>{member.display_name}</p>
                <Badge tone={member.invitePending ? "warning" : "accent"}>
                  {member.invitePending ? "Invitación pendiente" : "Miembro del equipo"}
                </Badge>
              </div>
              <div className="flex gap-2">
                {member.invitePending && (
                  <form action={resendTeamInvite.bind(null, member.id)}>
                    <Button type="submit" size="sm" variant="secondary">
                      Reenviar invitación
                    </Button>
                  </form>
                )}
                <form action={removeTeamMember.bind(null, member.id)}>
                  <Button type="submit" size="sm" variant="danger">
                    Quitar
                  </Button>
                </form>
              </div>
            </div>
          ))}
          {membersWithInviteStatus.length === 0 && (
            <p className="text-sm text-brand-muted">Todavía no invitaste a nadie.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
