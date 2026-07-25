import { requireApprovedEducator } from "@/lib/auth/dal";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireApprovedEducator();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader profile={profile} homeHref="/dashboard" title="Panel de educador" />
      <DashboardNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
