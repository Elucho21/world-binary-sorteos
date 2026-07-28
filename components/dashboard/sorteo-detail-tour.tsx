"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { GuidedTour } from "@/components/tour/guided-tour";

export function SorteoDetailTour() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "1";
  const strippedRef = useRef(false);

  useEffect(() => {
    if (!isNew || strippedRef.current) return;
    strippedRef.current = true;
    const params = new URLSearchParams(searchParams);
    params.delete("new");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [isNew, searchParams, pathname, router]);

  return <GuidedTour tourId="sorteo-detail" autoStart={isNew} />;
}
