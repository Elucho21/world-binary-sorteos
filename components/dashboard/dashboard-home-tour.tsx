"use client";

import { GuidedTour } from "@/components/tour/guided-tour";

export function DashboardHomeTour({ autoStart }: { autoStart: boolean }) {
  return <GuidedTour tourId="dashboard-home" autoStart={autoStart} />;
}
