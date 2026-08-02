import { Button } from "@/components/ui/button";

export function DownloadReportButton({ sorteoId }: { sorteoId: string }) {
  return (
    <a href={`/api/dashboard/sorteos/${sorteoId}/report`}>
      <Button variant="secondary" size="sm">
        Descargar reporte PDF
      </Button>
    </a>
  );
}
