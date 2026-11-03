import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./ui/components/dashboard-sidebar";
import { DashboardNavbar } from "./ui/components/dashboard-navbar";
import { ShortcutsModal } from "./ui/components/shortcuts-modal";

interface Props {
  children: React.ReactNode;
}

const Layout = async ({ children }: Props) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/sign-in");
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="flex flex-col">
        <DashboardNavbar />
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] bg-slate-50 p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>

      <ShortcutsModal />
    </SidebarProvider>
  );
};

export default Layout;
