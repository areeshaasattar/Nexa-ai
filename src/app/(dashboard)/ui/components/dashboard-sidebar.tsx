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
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardUserButton from "./Dashboard-user-button";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { STARTER_AGENT_TEMPLATE_ID } from "@/lib/agent-templates";

const mainNav = [
  { icon: LayoutDashboardIcon, label: "Dashboard", href: "/dashboard" },
  { icon: VideoIcon, label: "Meetings", href: "/meetings" },
  { icon: BotIcon, label: "AI Agents", href: "/agents" },
  { icon: SettingsIcon, label: "Settings", href: "/settings" },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();
  const [quickLoading, setQuickLoading] = useState(false);
  const quickStart = trpc.meetings.quickStart.useMutation({
    onSuccess: (data) => {
      toast.success("Meeting created");
      window.location.href = `/meetings/${data.meetingId}`;
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Sidebar className="border-r border-slate-200 bg-white text-slate-900">
      <div className="flex h-full w-full flex-col bg-white">
        <SidebarHeader className="p-6 pb-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <Image
              src="/logo.svg"
              alt="Nexa AI"
              width={36}
              height={36}
              className="h-9 w-9"
              style={{ height: "auto" }}
            />
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-slate-900">Nexa AI</span>
              <span className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">Intelligence</span>
            </div>
          </Link>
        </SidebarHeader>

        <div className="px-6 py-2">
          <SidebarSeparator className="bg-slate-200" />
        </div>

        <SidebarContent className="px-3 py-2">
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
                          <Link href={item.href} className="flex items-center gap-3">
                            <item.icon className={`size-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        }
                        className={`h-11 px-4 rounded-xl transition-all duration-200 ${
                          isActive ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4 space-y-3">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-700">
              <SparklesIcon className="size-4" />
              <span className="text-sm font-semibold">Start a session in one click</span>
            </div>
            <p className="mt-1 text-xs text-slate-600">Try a ready-made template agent.</p>
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
              className="mt-3 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {quickLoading || quickStart.isPending ? "Starting..." : "Try it now"}
            </button>
          </div>

          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <button
                    type="button"
                    onClick={() => {
                      // sign out via auth client
                      fetch("/api/auth/sign-out", { method: "POST" }).then(() => {
                        window.location.href = "/";
                      });
                    }}
                    className="flex items-center gap-3"
                  >
                    <LogOutIcon className="size-5 text-slate-400" />
                    <span className="font-medium">Log out</span>
                  </button>
                }
                className="h-11 px-4 rounded-xl text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              />
            </SidebarMenuItem>
          </SidebarMenu>

          <DashboardUserButton />
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};