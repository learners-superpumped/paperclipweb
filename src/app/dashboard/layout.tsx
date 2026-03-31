import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
