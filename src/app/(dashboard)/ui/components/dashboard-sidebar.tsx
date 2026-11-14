"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  VideoIcon,
  BotIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  LogOutIcon,
  SparklesIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { trpc } from "@/trpc/client";
import { useSignOut } from "@/hooks/use-sign-out";
import { toast } from "sonner";
import { useState } from "react";
import { STARTER_AGENT_TEMPLATE_ID } from "@/lib/agent-templates";
import { SIDEBAR_NAV_THEME } from "@/components/layout/sidebar-theme";

const mainNav = [
  { icon: LayoutDashboardIcon, label: "Dashboard", href: "/dashboard" },
  { icon: VideoIcon, label: "Meetings", href: "/meetings" },
  { icon: BotIcon, label: "AI Agents", href: "/agents" },
  { icon: SettingsIcon, label: "Settings", href: "/settings" },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const [quickLoading, setQuickLoading] = useState(false);
  const { signOut, isSigningOut } = useSignOut();
  const quickStart = trpc.meetings.quickStart.useMutation({
    onSuccess: (data) => {
      toast.success("Meeting created");
      window.location.href = `/meetings/${data.meetingId}`;
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Sidebar className="border-r border-border bg-surface text-text">
      <div className="flex h-full w-full flex-col bg-surface">
        <SidebarHeader className="p-4 pb-3 flex-row items-center justify-between gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 group flex-1 min-w-0">
            <BrandLogo variant="onLight" width={28} height={28} />
            <span className="font-semibold text-base truncate text-text">Nexa AI</span>
          </Link>
          <SidebarMenuButton
            render={
              <button
                type="button"
                aria-label="Toggle sidebar"
                className="text-text-muted hover:text-text focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
              />
            }
            className="h-9 w-9 p-0"
          />
        </SidebarHeader>

        <div className="px-4 py-2">
          <SidebarSeparator className="bg-border" />
        </div>

        <SidebarContent className="px-2 py-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mainNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link
                            href={item.href}
                            aria-current={isActive ? "page" : undefined}
                            className={SIDEBAR_NAV_THEME.classes.itemLink}
                          >
                            <item.icon className="size-4.5" />
                            <span className="text-sm font-medium">{item.label}</span>
                          </Link>
                        }
                        className={cn(
                          SIDEBAR_NAV_THEME.classes.itemButton,
                          isActive && SIDEBAR_NAV_THEME.classes.itemButtonActive,
                          isActive ? "bg-brand-100 text-brand-800" : "text-text-muted hover:bg-brand-50"
                        )}
                        style={{
                          color: isActive ? SIDEBAR_NAV_THEME.colors.activeText : SIDEBAR_NAV_THEME.colors.inactiveText,
                        }}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto p-3 space-y-2">
          <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
            <div className="flex items-start gap-2 mb-2">
              <SparklesIcon className="size-4 text-brand-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-text">Start a session in one click</div>
                <p className="mt-1 text-xs text-text-muted line-clamp-1">Try a ready-made template agent.</p>
              </div>
            </div>
            <Button
              type="button"
              disabled={quickLoading || quickStart.isPending}
              onClick={() => {
                setQuickLoading(true);
                quickStart.mutate(
                  { templateId: STARTER_AGENT_TEMPLATE_ID },
                  { onSettled: () => setQuickLoading(false) },
                );
              }}
              variant="default"
              size="sm"
              className="w-full mt-3"
            >
              {quickLoading || quickStart.isPending ? "Starting..." : "Try it now"}
            </Button>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={() => signOut()}
                    className="flex items-center gap-3 text-text-muted hover:text-text"
                  >
                    <LogOutIcon className="size-4" />
                    <span className="text-sm font-medium">{isSigningOut ? "Signing out..." : "Log out"}</span>
                  </button>
                }
                className="h-10 px-3 rounded-lg text-text-muted hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};

import { cn } from "@/lib/utils";