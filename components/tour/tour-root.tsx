"use client";

import { InfoTooltipProvider } from "@/components/ui/info-tooltip";
import { GuidedTourProvider } from "@/components/tour/guided-tour";

export function TourRoot({ children }: { children: React.ReactNode }) {
  return (
    <InfoTooltipProvider>
      <GuidedTourProvider>{children}</GuidedTourProvider>
    </InfoTooltipProvider>
  );
}
