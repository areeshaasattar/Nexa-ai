"use client";

import * as React from "react";
import {
  LayoutDashboardIcon,
  VideoIcon,
  BotIcon,
  StarIcon,
  SettingsIcon,
  LogOutIcon,
  PlusIcon,
  HelpCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  ArrowRightIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";

export function ShortcutsModal() {
  const [open, setOpen] = React.useState(false);
  const [newMeetingOpen, setNewMeetingOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleLogout = async () => {
    try {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in");
            toast.success("Signed out successfully");
          },
        },
      });
    } catch {
      toast.error("Logout failed");
    }
  };

  React.useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("open-shortcuts", handleOpen);
    return () => window.removeEventListener("open-shortcuts", handleOpen);
  }, []);

  return (
    <>
      {newMeetingOpen && (
        <NewMeetingDialog
          open={newMeetingOpen}
          onOpenChange={setNewMeetingOpen}
        />
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setOpen(false)}
        />
      )}

      {open && (
        <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-[560px] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="mx-4 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
              </div>
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm font-medium text-gray-800 placeholder:text-gray-400 focus:outline-none"
                placeholder="Search commands, pages, actions..."
              />
              <button
                onClick={() => setOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
              >
                esc
              </button>
            </div>

            <div className="max-h-[420px] overflow-y-auto overscroll-contain py-2">
              <CommandSection label="Navigate">
                <CommandRow
                  icon={<LayoutDashboardIcon className="h-4 w-4" />}
                  iconBg="bg-blue-50 text-blue-600"
                  label="Dashboard"
                  onSelect={() => runCommand(() => router.push("/"))}
                />
                <CommandRow
                  icon={<VideoIcon className="h-4 w-4" />}
                  iconBg="bg-purple-50 text-purple-600"
                  label="Meetings"
                  onSelect={() => runCommand(() => router.push("/meetings"))}
                />
                <CommandRow
                  icon={<BotIcon className="h-4 w-4" />}
                  iconBg="bg-green-50 text-green-600"
                  label="AI Agents"
                  onSelect={() => runCommand(() => router.push("/agents"))}
                />
              </CommandSection>

              <Divider />

              <CommandSection label="Actions">
                <CommandRow
                  icon={<PlusIcon className="h-4 w-4" />}
                  iconBg="bg-green-50 text-green-600"
                  label="New Meeting"
                  onSelect={() =>
                    runCommand(() => setNewMeetingOpen(true))
                  }
                />
                <CommandRow
                  icon={<StarIcon className="h-4 w-4" />}
                  iconBg="bg-amber-50 text-amber-500"
                  label="Upgrade to Pro"
                  badge="Pro"
                  badgeColor="bg-amber-100 text-amber-600"
                  onSelect={() => runCommand(() => router.push("/settings?tab=billing"))}
                />
              </CommandSection>

              <Divider />

              <CommandSection label="Settings">
                <CommandRow
                  icon={<UserIcon className="h-4 w-4" />}
                  iconBg="bg-gray-100 text-gray-600"
                  label="Profile"
                  onSelect={() =>
                    runCommand(() => router.push("/settings?tab=profile"))
                  }
                />
                <CommandRow
                  icon={<CreditCardIcon className="h-4 w-4" />}
                  iconBg="bg-gray-100 text-gray-600"
                  label="Billing"
                  onSelect={() =>
                    runCommand(() => router.push("/settings?tab=billing"))
                  }
                />
                <CommandRow
                  icon={<ShieldCheckIcon className="h-4 w-4" />}
                  iconBg="bg-gray-100 text-gray-600"
                  label="Security"
                  onSelect={() =>
                    runCommand(() => router.push("/settings?tab=security"))
                  }
                />
                <CommandRow
                  icon={<SettingsIcon className="h-4 w-4" />}
                  iconBg="bg-gray-100 text-gray-600"
                  label="Account Settings"
                  onSelect={() => runCommand(() => router.push("/settings"))}
                />
              </CommandSection>

              <Divider />

              <CommandSection label="Help">
                <CommandRow
                  icon={<HelpCircleIcon className="h-4 w-4" />}
                  iconBg="bg-sky-50 text-sky-600"
                  label="Documentation"
                  onSelect={() =>
                    runCommand(() =>
                      window.open("https://docs.nexaai.com", "_blank"),
                    )
                  }
                />
                <CommandRow
                  icon={<LogOutIcon className="h-4 w-4" />}
                  iconBg="bg-red-50 text-red-500"
                  label="Sign Out"
                  labelColor="text-red-500"
                  onSelect={() => runCommand(handleLogout)}
                />
              </CommandSection>
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/70 px-4 py-2.5">
              <div className="flex items-center gap-3 text-[11px] text-gray-400">
                <span className="flex items-center gap-1">
                  <Kbd>↑↓</Kbd> navigate
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>↵</Kbd> select
                </span>
                <span className="flex items-center gap-1">
                  <Kbd>esc</Kbd> close
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400">
                <span className="font-medium text-green-600">NexaAI</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CommandSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-2 py-1">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function CommandRow({
  icon,
  iconBg,
  label,
  labelColor,
  badge,
  badgeColor,
  onSelect,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  labelColor?: string;
  badge?: string;
  badgeColor?: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-100",
        "hover:bg-green-50 hover:shadow-sm focus:outline-none focus:bg-green-50",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110",
          iconBg,
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "flex-1 font-medium text-gray-700 group-hover:text-gray-900",
          labelColor,
        )}
      >
        {label}
      </span>
      {badge && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            badgeColor,
          )}
        >
          {badge}
        </span>
      )}
      <ArrowRightIcon className="h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function Divider() {
  return <div className="mx-4 my-1.5 h-px bg-gray-100" />;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-500 shadow-sm">
      {children}
    </span>
  );
}
