"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Search, Bell, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/trpc/client";
import { authClient } from "@/lib/auth-client";
import { ShortcutsModal } from "./shortcuts-modal";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";

export const DashboardNavbar = () => {

  const [newMeetingOpen, setNewMeetingOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);

  const { data: session } = authClient.useSession();
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
              <Button variant="ghost" size="icon" aria-label="Activity">
                <Bell className="size-4" />
              </Button>
            }
          />
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <div className="font-semibold">Recent activity</div>
              {(activity ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No recent activity.</p>
              ) : (
                <ul className="space-y-2 max-h-72 overflow-auto">
                  {(activity ?? []).map((a) => (
                    <li key={a.id} className="text-sm">
                      <div className="font-medium">{a.title}</div>
                      {a.description && <div className="text-xs text-slate-500">{a.description}</div>}
                      <div className="text-xs text-slate-400">{new Date(a.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="sm" className="gap-1">
          <span className="hidden sm:inline">{session?.user?.name}</span>
          <ChevronDown className="size-4" />
        </Button>
      </div>

      <ShortcutsModal />
      <NewMeetingDialog open={newMeetingOpen} onOpenChange={setNewMeetingOpen} />

    </header>
  );
};