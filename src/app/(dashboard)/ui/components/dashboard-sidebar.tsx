"use client";

import { useState, type CSSProperties } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  VideoIcon,
  BotIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  LogOutIcon,
  SparklesIcon,
  PanelLeftIcon,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trpc } from "@/trpc/client";
import { useSignOut } from "@/hooks/use-sign-out";
import { toast } from "sonner";
import { STARTER_AGENT_TEMPLATE_ID } from "@/lib/agent-templates";
import { cn } from "@/lib/utils";

/**
 * Nav items in template order. Only items whose routes exist in the app are
 * kept (the app has no Calendar or Help & Centre routes).
 */
const mainNav = [
  { icon: LayoutDashboardIcon, label: "Dashboard", href: "/dashboard" },
  { icon: BotIcon, label: "AI Agents", href: "/agents" },
  { icon: VideoIcon, label: "Meetings", href: "/meetings" },
  { icon: SettingsIcon, label: "Settings", href: "/settings" },
];

/** Shared nav row: 36px pill, 12px inset, 13px/20px label, 12px icon gap.
 *  `!` suffixes override the base SidebarMenuButton data-active/hover variants. */
const NAV_ITEM_CLASSES =
  "h-9 rounded-lg px-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const ACTIVE_ROW_CLASSES = "bg-brand-50! text-brand-800! font-medium";
const INACTIVE_ROW_CLASSES =
  "text-text! hover:bg-surface-soft! hover:text-text! font-normal";

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
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
    <Sidebar
      collapsible="offcanvas"
      className="border-r border-black/5 bg-surface text-text"
      style={{ "--sidebar-width": "200px" } as CSSProperties}
    >
      <div className="flex h-full w-full flex-col px-3 py-4">
        {/* Logo row: logo left, collapse icon far right */}
        <div className="flex items-center justify-between h-12 mb-5">
          <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2">
            <BrandLogo variant="onLight" width={36} height={36} />
            <span className="truncate text-xl font-semibold leading-none text-text">Nexa AI</span>
          </Link>
          <button
            type="button"
            aria-label="Close sidebar"
            title="Close sidebar (Ctrl+B)"
            onClick={toggleSidebar}
            className="shrink-0 inline-flex items-center justify-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:bg-gray-100 transition-colors duration-150"
          >
            <PanelLeftIcon className="size-[18px]" strokeWidth={1.5} />
          </button>
        </div>

        {/* Nav + Log out in one evenly spaced list (4px between rows) */}
        <SidebarContent className="p-0">
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
                        className="flex items-center gap-3"
                      >
                        <item.icon
                          className={cn(
                            "size-4 shrink-0",
                            isActive ? "text-brand-800" : "text-text-muted",
                          )}
                          strokeWidth={1.5}
                        />
                        <span className="truncate text-[13px] leading-5">{item.label}</span>
                      </Link>
                    }
                    className={cn(
                      NAV_ITEM_CLASSES,
                      isActive ? ACTIVE_ROW_CLASSES : INACTIVE_ROW_CLASSES,
                    )}
                  />
                </SidebarMenuItem>
              );
            })}

            {/* Log out sits directly under the last nav item, same spacing */}
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={() => signOut()}
                    className="flex items-center gap-3"
                  >
                    <LogOutIcon className="size-4 shrink-0 text-text-muted" strokeWidth={1.5} />
                    <span className="truncate text-[13px] leading-5">
                      {isSigningOut ? "Signing out..." : "Log out"}
                    </span>
                  </button>
                }
                className={cn(NAV_ITEM_CLASSES, INACTIVE_ROW_CLASSES)}
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>

        {/* Promo card pinned to the bottom, aligned with the nav edges */}
        <SidebarFooter className="mt-auto p-0">
          <div className="rounded-xl border border-border bg-white p-3">
            <SparklesIcon className="size-5 text-brand-700" strokeWidth={1.5} />
            <div className="mt-2 text-[13px] font-semibold leading-snug text-text">
              Start a session in one click
            </div>
            <p className="mt-1 text-[11px] leading-snug text-text-muted">
              Try a ready-made template agent.
            </p>
            <button
              type="button"
              disabled={quickLoading || quickStart.isPending}
              onClick={() => {
                setQuickLoading(true);
                quickStart.mutate(
                  { templateId: STARTER_AGENT_TEMPLATE_ID },
                  { onSettled: () => setQuickLoading(false) },
                );
              }}
              className="mt-2.5 h-9 w-full rounded-lg bg-primary text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {quickLoading || quickStart.isPending ? "Starting..." : "Try it now"}
            </button>
          </div>
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};
