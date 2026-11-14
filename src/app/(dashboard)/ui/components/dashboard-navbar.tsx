"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bell, Plus, Calendar, Clock, Bot, FileText, Activity as ActivityIcon, Loader2, Menu, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { activityIconName, relativeTime, shouldHideDescription } from "@/modules/home/lib/activity";
import { trpc } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";
import { useSignOut } from "@/hooks/use-sign-out";
import { ShortcutsModal } from "./shortcuts-modal";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { cn } from "@/lib/utils";

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
    <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-4 py-4 md:px-6">
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold text-text sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="text-xs text-text-muted sm:text-sm">{dateLabel}</p>
      </div>

      <div className="hidden flex-1 items-center justify-center lg:flex max-w-md">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-shortcuts"))}
          className="flex w-full items-center gap-2 rounded-full border border-border bg-surface-soft px-3 py-2.5 text-sm text-text-muted hover:bg-brand-50"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="rounded bg-white px-1.5 py-0.5 text-xs font-medium text-text-muted border border-border">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="lg"
          onClick={() => setNewMeetingOpen(true)}
          className="rounded-full"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New meeting</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label="Feedback"
          onClick={() => window.dispatchEvent(new Event("open-feedback-dialog"))}
        >
          <FileText className="size-4" />
        </Button>

        <Popover open={bellOpen} onOpenChange={setBellOpen}>
          <PopoverTrigger
            render={
              <Button variant="ghost" size="icon" aria-label="Recent activity">
                <Bell className="size-4" />
              </Button>
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
              <Button variant="ghost" size="icon" aria-label="User menu">
                <GeneratedAvatar 
                  seed={session?.user?.email || "user"} 
                  className="size-6 rounded-full"
                />
              </Button>
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