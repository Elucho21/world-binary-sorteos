"use client";

import { useActionState } from "react";
import { updateSiteSettings, type FormState } from "@/app/(admin)/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AdminSettings } from "@/types/database.types";

export function SiteSettingsForm({ settings }: { settings: AdminSettings }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateSiteSettings, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="siteName">Nombre del sitio</Label>
        <Input id="siteName" name="siteName" defaultValue={settings.site_name} />
      </div>
      <div>
        <Label htmlFor="supportEmail">Email de soporte</Label>
        <Input id="supportEmail" name="supportEmail" type="email" defaultValue={settings.support_email ?? ""} />
      </div>
      <div>
        <Label htmlFor="webhookUrl">Webhook hacia el CRM (opcional)</Label>
        <Input
          id="webhookUrl"
          name="webhookUrl"
          type="url"
          placeholder="https://tu-crm.com/webhooks/leads"
          defaultValue={settings.webhook_url ?? ""}
        />
        <p className="mt-1 text-xs text-brand-muted">
          Si lo cargás, mandamos dos POST a esta URL con nombre, email, sorteo y educador: uno
          apenas alguien se registra, y otro cuando se sortea el sorteo, con si ganó o no y el
          código del premio — útil para conectar con GoHighLevel u otro CRM.
        </p>
      </div>
      {state?.error && <p className="text-sm text-brand-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-brand-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
