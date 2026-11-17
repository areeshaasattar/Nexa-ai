"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Search, Bell, Plus, Calendar, Bot, FileText, Activity as ActivityIcon, Check, MessageSquare, PanelLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { activityIconName, relativeTime, shouldHideDescription } from "@/modules/home/lib/activity";
import { trpc } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";
import { useSignOut } from "@/hooks/use-sign-out";
import { useSidebar } from "@/components/ui/sidebar";
import { ShortcutsModal } from "./shortcuts-modal";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { cn } from "@/lib/utils";

/** Shared right-side hit area: borderless circular icon button. */
const ICON_BUTTON_CLASSES =
  "flex size-9 shrink-0 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/15";

export const DashboardNavbar = () => {

  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const { signOut, isSigningOut } = useSignOut();
  const { data: activity } = trpc.getRecentActivity.useQuery(undefined, { staleTime: 30_000 });
  const { open: sidebarOpen, toggleSidebar } = useSidebar();

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  // hydration-safe date: render after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const dateLabel = mounted ? format(new Date(), "EEEE, MMMM d, yyyy") : "";

  return (
    <header className="flex items-center justify-between gap-4 px-6 pt-4 pb-2 md:px-8">
      {/* Sidebar toggle button and greeting block: align with the content area's left padding */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
            title="Open sidebar (Ctrl+B)"
            className="shrink-0 inline-flex items-center justify-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 focus:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:bg-gray-100 transition-colors duration-150"
          >
            <PanelLeft className="size-[18px]" strokeWidth={1.5} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold leading-5 text-[#111827]">
            Welcome back, {firstName}
          </h1>
          <p className="mt-0.5 truncate text-[11px] font-normal leading-4 text-[#6B7280]">
            {dateLabel}
          </p>
        </div>
      </div>

      {/* Slim search pill, centered, not stretched */}
      <div className="hidden flex-none md:block">
        <button
          type="button"
          aria-label="Search"
          onClick={() => window.dispatchEvent(new Event("open-shortcuts"))}
          className="flex h-9 w-[260px] max-w-[30vw] items-center gap-2 rounded-full border border-[#E5E7EB]/70 bg-white px-3 shadow-sm transition-colors hover:bg-white focus-within:border-green-600 focus-within:ring-2 focus-within:ring-green-600/15 focus-visible:border-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/15"
        >
          <Search className="size-3.5 shrink-0 text-[#9CA3AF]" strokeWidth={1.5} />
          <span className="flex-1 truncate text-left text-[13px] text-[#9CA3AF]">Search...</span>
        </button>
      </div>

      {/* Actions: button, icon buttons and avatar on one centered line */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setNewMeetingOpen(true)}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[#14673A] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0F5430] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600/15 disabled:opacity-60"
        >
          <Plus className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="hidden sm:inline">New meeting</span>
        </button>

        <button
          type="button"
          aria-label="Feedback"
          onClick={() => window.dispatchEvent(new Event("open-feedback-dialog"))}
          className={ICON_BUTTON_CLASSES}
        >
          <MessageSquare className="size-[18px]" strokeWidth={1.5} />
        </button>

        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label="Recent activity"
                className={cn(ICON_BUTTON_CLASSES, "relative", bellOpen && "bg-white/70")}
              >
                <Bell className="size-[18px]" strokeWidth={1.5} />
              </button>
            }
          />
          <PopoverContent className="w-96 max-w-[calc(100vw-16px)] rounded-xl border border-border bg-white p-0 shadow-lg z-50" sideOffset={12}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-text">Recent activity</span>
              {(activity ?? []).length > 0 && (
                <span className="text-xs text-text-muted">{(activity ?? []).length} items</span>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto overscroll-contain">
              {activity === undefined ? (
                <div className="space-y-3 p-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="size-8 rounded-full bg-brand-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-brand-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded bg-brand-100 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (activity ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ActivityIcon className="size-8 text-brand-200" aria-hidden="true" />
                  <p className="mt-2 text-sm text-text-muted">No activity yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-brand-100">
                  {(activity ?? []).map((a) => {
                    const iconName = activityIconName(a.type);
                    const Icon =
                      iconName === "calendar"
                        ? Calendar
                        : iconName === "play"
                        ? FileText
                        : iconName === "check-circle"
                        ? Check
                        : iconName === "bot"
                        ? Bot
                        : iconName === "file-text"
                        ? FileText
                        : ActivityIcon;
                    const hideDesc = shouldHideDescription(a.title, a.description);
                    const date = new Date(a.createdAt);
                    return (
                      <li key={a.id} className="flex gap-3 px-4 py-3 hover:bg-brand-50">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-text">{a.title}</div>
                          {!hideDesc && a.description && (
                            <div className="line-clamp-2 text-xs text-text-muted">{a.description}</div>
                          )}
                          <time
                            dateTime={date.toISOString()}
                            title={date.toLocaleString()}
                            className="text-xs text-text-muted/60"
                          >
                            {mounted ? relativeTime(date, new Date()) : ""}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="User menu"
                className={cn(ICON_BUTTON_CLASSES, "focus-visible:ring-1 focus-visible:ring-black/5")}
              >
                <GeneratedAvatar
                  seed={session?.user?.email || session?.user?.id || "user"}
                  src={session?.user?.image}
                  style="bottts"
                  size="sm"
                  className="size-8 rounded-full ring-1 ring-black/5"
                />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={8} className="w-56 bg-white border border-border shadow-lg rounded-xl">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="text-sm font-medium text-text truncate">{session?.user?.name}</div>
                <div className="text-xs text-text-muted truncate">{session?.user?.email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem render={<Link href="/settings" className="cursor-pointer text-sm">Settings</Link>} />
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem render={<button type="button" onClick={() => signOut()} disabled={isSigningOut} className="w-full text-left text-sm">{isSigningOut ? "Signing out..." : "Sign out"}</button>} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ShortcutsModal />
      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />

    </header>
  );
};
