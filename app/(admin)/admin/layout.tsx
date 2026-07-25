import { requireSuperAdmin } from "@/lib/auth/dal";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AdminNav } from "@/components/dashboard/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireSuperAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <DashboardHeader profile={profile} homeHref="/admin/educators" title="World Binary — Admin" />
      <AdminNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
