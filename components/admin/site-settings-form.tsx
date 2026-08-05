"use client";

import { useActionState, useState, useTransition } from "react";
import { updateSiteSettings, testWebhook, type FormState, type TestWebhookState } from "@/app/(admin)/admin/settings/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AdminSettings } from "@/types/database.types";

export function SiteSettingsForm({ settings }: { settings: AdminSettings }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(updateSiteSettings, undefined);
  const [webhookResult, setWebhookResult] = useState<TestWebhookState | null>(null);
  const [testPending, startTest] = useTransition();

  function handleTestWebhook() {
    setWebhookResult(null);
    startTest(async () => {
      const result = await testWebhook();
      setWebhookResult(result);
    });
  }

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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando..." : "Guardar"}
        </Button>
        {settings.webhook_url && (
          <Button type="button" variant="secondary" disabled={testPending} onClick={handleTestWebhook}>
            {testPending ? "Probando..." : "Probar webhook"}
          </Button>
        )}
      </div>
      {webhookResult?.error && <p className="text-sm text-brand-danger">{webhookResult.error}</p>}
      {webhookResult?.success && <p className="text-sm text-brand-success">{webhookResult.success}</p>}
    </form>
  );
}
