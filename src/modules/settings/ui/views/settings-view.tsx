"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
  UserIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  SettingsIcon,
} from "lucide-react";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileTab } from "../components/profile-tab";
import { SecurityTab } from "../components/security-tab";
import { BillingTab } from "../components/billing-tab";
import { AccountTab } from "../components/account-tab";

type TabKey = "profile" | "billing" | "security" | "account";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "profile", label: "Profile", icon: <UserIcon className="size-4" /> },
  { key: "billing", label: "Billing", icon: <CreditCardIcon className="size-4" /> },
  { key: "security", label: "Security", icon: <ShieldCheckIcon className="size-4" /> },
  { key: "account", label: "Account", icon: <SettingsIcon className="size-4" /> },
];

const isTabKey = (value: string | undefined): value is TabKey =>
  !!value && TABS.some((t) => t.key === value);

interface SettingsViewProps {
  /** Seed the active tab from the `?tab=` search param (server-rendered) */
  defaultTab?: string;
}

/** Dashboard-matching loading skeleton (`rounded-2xl` card + form rows). */
function SettingsSkeleton() {
  return (
    <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <CardContent className="space-y-5 p-6">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

export const SettingsView = ({ defaultTab }: SettingsViewProps) => {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabKey>(
    isTabKey(defaultTab) ? defaultTab : "profile",
  );
  const { data, isPending, refetch } = authClient.useSession();
  const user = data?.user;

  const setActiveTab = (key: TabKey) => {
    setTab(key);
    // Keep the URL in sync so shortcuts/dropdown deep-links stay canonical.
    router.replace(`/settings?tab=${key}`, { scroll: false });
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 md:gap-8 md:py-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-slate-500">
          Manage your account, plan, and security preferences.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <SettingsSkeleton />
      ) : !user ? (
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardContent className="space-y-3 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              You are not signed in.
            </p>
            <Button
              asChild
              className="rounded-xl bg-emerald-600 text-white transition-colors hover:bg-emerald-700"
            >
              <Link href="/sign-in">Go to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary strip */}
          <Card className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50/50 p-6">
              <GeneratedAvatar
                seed={user.email || user.id}
                src={user.image}
                size="lg"
                style="bottts"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">
                  {user.name}
                </p>
                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
              <Badge
                variant="outline"
                className="ml-auto shrink-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
              >
                Pro User
              </Badge>
            </div>
          </Card>

          {tab === "profile" && (
            <ProfileTab user={user} onSessionRefetch={refetch} />
          )}
          {tab === "security" && <SecurityTab />}
          {tab === "billing" && <BillingTab />}
          {tab === "account" && <AccountTab user={user} />}
        </>
      )}
    </div>
  );
};