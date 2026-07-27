"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/input";

function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoValue(local: string) {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export function DateTimeLocalInput({
  id,
  name,
  label,
  defaultValueIso,
}: {
  id: string;
  name: string;
  label: string;
  defaultValueIso?: string | null;
}) {
  const [local, setLocal] = useState(() => toLocalInputValue(defaultValueIso));

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} />
      <input type="hidden" name={name} value={toIsoValue(local)} />
    </div>
  );
}
