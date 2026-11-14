"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Plus, ChevronDown, Calendar, Play, CheckCircle, Bot, FileText, Activity as ActivityIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { activityIconName, relativeTime, shouldHideDescription } from "@/modules/home/lib/activity";
import { trpc } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";
import { useSignOut } from "@/hooks/use-sign-out";
import { ShortcutsModal } from "./shortcuts-modal";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";

export const DashboardNavbar = () => {

  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: session } = authClient.useSession();
  const { signOut, isSigningOut } = useSignOut();
  const { data: activity } = trpc.getRecentActivity.useQuery(undefined, { staleTime: 30_000 });

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  // hydration-safe date: render after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const dateLabel = mounted ? format(new Date(), "EEEE, MMMM d, yyyy") : "";

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="text-xs text-slate-500 sm:text-sm">{dateLabel}</p>
      </div>

      <div className="hidden flex-1 items-center justify-center md:flex">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-shortcuts"))}
          className="flex w-full max-w-md items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500 hover:bg-slate-100"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-500">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => setNewMeetingOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New meeting</span>
        </Button>

        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Recent activity">
                <Bell className="size-4" />
              </Button>
            }
          />
          <PopoverContent className="w-[380px] max-w-[calc(100vw-16px)] rounded-2xl border border-slate-200 bg-white p-0 shadow-lg z-50" sideOffset={8}>
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="text-base font-semibold text-slate-900">Recent activity</span>
              {(activity ?? []).length > 0 && (
                <span className="text-xs text-slate-500">{(activity ?? []).length} items</span>
              )}
            </div>
            <div className="max-h-[420px] overflow-y-auto overscroll-contain">
              {activity === undefined ? (
                <div className="space-y-3 p-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="size-8 rounded-full bg-slate-100 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse" />
                        <div className="h-2 w-1/2 rounded bg-slate-100 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (activity ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <ActivityIcon className="size-8 text-slate-300" aria-hidden="true" />
                  <p className="mt-2 text-sm text-slate-500">No activity yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {(activity ?? []).map((a) => {
                    const iconName = activityIconName(a.type);
                    const Icon =
                      iconName === "calendar"
                        ? Calendar
                        : iconName === "play"
                        ? Play
                        : iconName === "check-circle"
                        ? CheckCircle
                        : iconName === "bot"
                        ? Bot
                        : iconName === "file-text"
                        ? FileText
                        : ActivityIcon;
                    const hideDesc = shouldHideDescription(a.title, a.description);
                    const date = new Date(a.createdAt);
                    return (
                      <li key={a.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-900">{a.title}</div>
                          {!hideDesc && a.description && (
                            <div className="line-clamp-2 text-xs text-slate-500">{a.description}</div>
                          )}
                          <time
                            dateTime={date.toISOString()}
                            title={date.toLocaleString()}
                            className="text-xs text-slate-400"
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
              <Button variant="ghost" size="sm" className="gap-1" aria-label="User menu">
                <span className="hidden sm:inline">{session?.user?.name}</span>
                <ChevronDown className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" sideOffset={6} collisionPadding={8} className="w-56 bg-white border border-slate-200 shadow-lg">
            <DropdownMenuLabel className="truncate">
              <div className="text-sm font-medium text-slate-900 truncate">{session?.user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{session?.user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/settings" className="cursor-pointer">Settings</Link>} />
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<button type="button" onClick={() => signOut()} disabled={isSigningOut} className="w-full text-left">{isSigningOut ? "Signing out..." : "Sign out"}</button>} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ShortcutsModal />
      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />

    </header>
  );
};