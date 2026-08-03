"use client";

import { useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import { Label, Textarea, Input } from "@/components/ui/input";

interface CodesPreview {
  unique: number;
  duplicates: number;
}

// Same parsing rule as lib/csv.ts's parseCodesFile — kept local so the
// preview never has to round-trip to the server just to count.
function previewCodes(text: string): CodesPreview {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const seen = new Set<string>();
  let duplicates = 0;
  for (const row of result.data) {
    for (const cell of row) {
      const value = String(cell ?? "").trim();
      if (!value || value.toLowerCase() === "code" || value.toLowerCase() === "codigo") continue;
      if (seen.has(value)) duplicates += 1;
      else seen.add(value);
    }
  }
  return { unique: seen.size, duplicates };
}

function PreviewLine({ preview, prefix }: { preview: CodesPreview; prefix?: string }) {
  return (
    <p className="mt-1 text-xs text-brand-muted">
      {prefix}
      {preview.unique} código{preview.unique === 1 ? "" : "s"} para cargar
      {preview.duplicates > 0 ? ` (${preview.duplicates} duplicado${preview.duplicates === 1 ? "" : "s"}, se ignoran)` : ""}.
    </p>
  );
}

export function CodeTextareaWithPreview({ id, name, rows = 4 }: { id: string; name: string; rows?: number }) {
  const [preview, setPreview] = useState<CodesPreview | null>(null);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value.trim();
    setPreview(text ? previewCodes(text) : null);
  }

  return (
    <div>
      <Label htmlFor={id}>Códigos (uno por línea o separados por coma)</Label>
      <Textarea id={id} name={name} rows={rows} placeholder={"WB-BONUS-0001\nWB-BONUS-0002"} onChange={handleChange} />
      {preview && <PreviewLine preview={preview} />}
    </div>
  );
}

export function CodeFileInputWithPreview({ id, name }: { id: string; name: string }) {
  const [preview, setPreview] = useState<CodesPreview | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const text = await file.text();
    setPreview(previewCodes(text));
  }

  return (
    <div>
      <Label htmlFor={id}>Archivo (.csv o .txt, un código por línea/columna)</Label>
      <Input id={id} name={name} type="file" accept=".csv,.txt" onChange={handleChange} />
      {preview && <PreviewLine preview={preview} prefix={`${fileName}: `} />}
    </div>
  );
}
