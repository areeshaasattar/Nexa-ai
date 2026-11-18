import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { CSSProperties } from "react";
import { and, eq, gte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activities, agents, user } from "@/db/schema";
import { seedStarterAgent } from "@/lib/seed-starter-agent";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "./ui/components/dashboard-sidebar";
import { DashboardNavbar } from "./ui/components/dashboard-navbar";
import { ShortcutsModal } from "./ui/components/shortcuts-modal";

export const metadata = {
  robots: { index: false, follow: false },
};

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

  // Lazy safety net: catch missed seeding for recently created users without
  // re-seeding users who intentionally deleted their agent later.
  after(async () => {
    try {
      // eslint-disable-next-line react-hooks/purity -- runs in after() callback, not during render
      const recentCutoff = new Date(Date.now() - 10 * 60 * 1000);
      const [dbUser] = await db
        .select({ createdAt: user.createdAt })
        .from(user)
        .where(and(eq(user.id, session.user.id), gte(user.createdAt, recentCutoff)))
        .limit(1);

      if (!dbUser) return;

      const [existingAgent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.userId, session.user.id))
        .limit(1);
      if (existingAgent) return;

      const [createdActivity] = await db
        .select({ id: activities.id })
        .from(activities)
        .where(
          and(
            eq(activities.userId, session.user.id),
            eq(activities.type, "agent_created"),
          ),
        )
        .limit(1);
      if (createdActivity) return;

      await seedStarterAgent(session.user.id);
    } catch {
      // Never block or fail dashboard rendering.
    }
  });

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "200px",
          "--sidebar-width-icon": "3rem",
        } as CSSProperties
      }
    >
      <DashboardSidebar />
      <SidebarInset className="flex flex-col bg-white">
        {/* Mobile-only hamburger: opens the sidebar as a slide-in drawer */}
        <div className="px-3 pt-3 md:hidden">
          <SidebarTrigger className="h-9 w-9 rounded-lg border border-border bg-white text-text-muted [&_svg]:size-4" />
        </div>
        <DashboardNavbar />
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-6 md:p-8 bg-surface-soft">
          <div className="mx-auto max-w-7xl pb-6">
            {children}
          </div>
        </div>
      </SidebarInset>

      <ShortcutsModal />
    </SidebarProvider>
  );
};

export default Layout;
