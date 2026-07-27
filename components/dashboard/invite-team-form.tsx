"use client";

import { useActionState } from "react";
import { inviteTeamMember, type FormState } from "@/app/(educator)/dashboard/team/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function InviteTeamForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(inviteTeamMember, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Label htmlFor="email">Email a invitar</Label>
        <Input id="email" name="email" type="email" required placeholder="asistente@email.com" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Invitando..." : "Invitar"}
      </Button>
      {state?.error && <p className="text-sm text-brand-danger sm:basis-full">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success sm:basis-full">{state.success}</p>}
    </form>
  );
}
