import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between text-sm text-brand-muted">
      <span>
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={buildHref(page - 1)}>
            <Button type="button" size="sm" variant="secondary">
              Anterior
            </Button>
          </Link>
        )}
        {page < totalPages && (
          <Link href={buildHref(page + 1)}>
            <Button type="button" size="sm" variant="secondary">
              Siguiente
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
