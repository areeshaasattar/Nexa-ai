"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { Search, Bell, Plus, Calendar, Bot, FileText, Check, PanelLeft, Settings, LogOut } from "lucide-react";
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
          <h1 className="truncate text-[15px] font-semibold leading-5 text-text">
            Welcome back, {firstName}
          </h1>
          <p className="mt-0.5 truncate text-[11px] font-normal leading-4 text-text-muted">
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
          className="flex h-11 w-[260px] max-w-[30vw] items-center gap-2 rounded-xl border-0 bg-white px-3 shadow-sm outline-none ring-0 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20"
        >
          <Search className="size-3.5 shrink-0 text-text-subtle" strokeWidth={1.5} />
          <span className="flex-1 truncate text-left text-[13px] text-text-subtle">Search...</span>
        </button>
      </div>

      {/* Actions: button, icon buttons and avatar on one centered line */}
      <div className="flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => setNewMeetingOpen(true)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:opacity-60 shadow-sm"
        >
          <Plus className="size-4 shrink-0" strokeWidth={1.5} />
          <span className="hidden sm:inline">New meeting</span>
        </button>

        <div className="relative">
          <button
            type="button"
            aria-label="Recent activity"
            aria-expanded={bellOpen}
            onClick={() => setBellOpen(!bellOpen)}
            className={cn(
              ICON_BUTTON_CLASSES,
              "relative",
              bellOpen && "bg-gray-100"
            )}
          >
            <Bell className="size-[18px]" strokeWidth={1.5} />
            {/* Unread badge */}
            {(activity ?? []).length > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden="true" />
            )}
          </button>

          {/* Notification panel */}
          {bellOpen && (
            <div
              className="absolute right-0 top-full mt-2 z-50 w-[380px] max-w-[calc(100vw-2rem)] sm:w-[380px] flex flex-col overflow-hidden bg-white rounded-2xl border border-gray-200/70 shadow-[0_10px_30px_rgba(16,24,40,0.12)] animate-in fade-in slide-in-from-top-2 duration-150"
              role="dialog"
              aria-label="Recent activity notifications"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Recent activity</span>
                  {(activity ?? []).length > 0 && (
                    <span className="inline-flex items-center justify-center rounded-full bg-brand-100 text-brand-700 text-[11px] font-semibold px-2 py-0.5">
                      {(activity ?? []).length}
                    </span>
                  )}
                </div>
              </div>

              {/* List area */}
              <div className="flex-1 max-h-[calc(480px-120px)] overflow-y-auto overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent">
                {activity === undefined ? (
                  // Loading state
                  <div className="space-y-3 p-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="size-8 rounded-full bg-gray-200 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse" />
                          <div className="h-2 w-1/2 rounded bg-gray-200 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (activity ?? []).length === 0 ? (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                    <Bell className="size-8 text-gray-300 mb-3" aria-hidden="true" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-gray-700">You&apos;re all caught up</p>
                    <p className="text-xs text-gray-400 mt-1">No new notifications</p>
                  </div>
                ) : (
                  // Notification list
                  <ul className="divide-y divide-gray-100 pb-1">
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
                          : Bell;
                      const hideDesc = shouldHideDescription(a.title, a.description);
                      const date = new Date(a.createdAt);
                      return (
                        <li
                          key={a.id}
                          className="flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                            <Icon className="size-4" aria-hidden="true" strokeWidth={1.5} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] font-semibold text-gray-900 leading-snug">
                              {a.title}
                            </div>
                            {!hideDesc && a.description && (
                              <div className="text-xs text-gray-500 leading-relaxed mt-0.5 line-clamp-2">
                                {a.description}
                              </div>
                            )}
                            <time
                              dateTime={date.toISOString()}
                              title={date.toLocaleString()}
                              className="text-[11px] text-gray-400 mt-1 block"
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

              {/* Footer */}
              {(activity ?? []).length > 0 && (
                <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50/60">
                  <Link
                    href="/dashboard?tab=activity"
                    onClick={() => setBellOpen(false)}
                    className="block text-center text-[13px] font-medium text-green-700 hover:text-green-800 transition-colors"
                  >
                    View all activity
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Close on outside click */}
          {bellOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setBellOpen(false)}
            />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="User menu"
                className={cn(ICON_BUTTON_CLASSES, "focus-visible:ring-2 focus-visible:ring-brand-500/30")}
              >
                <GeneratedAvatar
                  seed={session?.user?.email || session?.user?.id || "user"}
                  src={session?.user?.image}
                  style="bottts"
                  size="sm"
                  className="size-8 rounded-full ring-0"
                />
              </button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={8} collisionPadding={8} className="w-56 bg-white rounded-xl border-0 shadow-lg p-1.5">
            <DropdownMenuGroup>
              <DropdownMenuLabel>
                <div className="text-sm font-semibold text-text truncate">{session?.user?.name}</div>
                <div className="text-xs text-text-muted truncate">{session?.user?.email}</div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem render={<Link href="/settings" className="flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-text hover:bg-brand-100"><Settings className="size-4" />Settings</Link>} />
            <DropdownMenuSeparator className="bg-border/60" />
            <DropdownMenuItem nativeButton render={<button type="button" onClick={() => signOut()} disabled={isSigningOut} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-text hover:bg-brand-100 disabled:opacity-50">{isSigningOut ? "Signing out..." : <><LogOut className="size-4" />Sign out</>}</button>} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ShortcutsModal />
      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />

    </header>
  );
};
