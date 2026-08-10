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
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardUserButton from "./Dashboard-user-button";

const mainNav = [
  {
    icon: LayoutDashboardIcon,
    label: "Dashboard",
    href: "/",
  },
  {
    icon: VideoIcon,
    label: "Meetings",
    href: "/meetings",
  },
  {
    icon: BotIcon,
    label: "AI Agents",
    href: "/agents",
  },
];

export const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <Sidebar
      className="border-r border-green-900/20 bg-green-950 text-white"
      // Forces solid bg on mobile drawer via CSS variable override
      style={
        {
          "--sidebar-background": "#052e16", // green-950
          "--sidebar": "#052e16",
          backgroundColor: "#052e16",
        } as React.CSSProperties
      }
    >
      {/* This inner wrapper ensures bg is solid on mobile sheet/drawer */}
      <div className="flex h-full w-full flex-col bg-green-950">
        <SidebarHeader className="p-6 pb-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div>
              <Image
                src="/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                className="invert brightness-0"
                style={{ height: "auto" }}
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight text-white">
                Nexa AI
              </span>
              <span className="text-[10px] uppercase tracking-widest text-green-400 font-semibold">
                Intelligence
              </span>
            </div>
          </Link>
        </SidebarHeader>

        <div className="px-6 py-3">
          <SidebarSeparator className="bg-white/10" />
        </div>

        <SidebarContent className="px-3 py-2">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {mainNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        render={
                          <Link
                            href={item.href}
                            className="flex items-center gap-3"
                          >
                            <item.icon
                              className={`size-5 ${isActive ? "text-emerald-300" : "text-green-400"}`}
                            />
                            <span className="font-medium">{item.label}</span>
                          </Link>
                        }
                        className={`
                          h-11 px-4 rounded-xl transition-all duration-200
                          ${
                            isActive
                              ? "bg-white/10 text-white"
                              : "text-green-100 hover:bg-white/5 hover:text-white"
                          }
                        `}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-4">
          <DashboardUserButton variant="sidebar" />
        </SidebarFooter>
      </div>
    </Sidebar>
  );
};