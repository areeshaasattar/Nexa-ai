"use client";

import * as React from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { SettingsSection } from "./settings-section";
import { Switch } from "@/components/ui/switch";

function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="truncate text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

export function AccountTab({
  user,
  onSessionRefetch,
}: {
  user: {
    name: string;
    email: string;
    createdAt?: string | Date | null;
    summaryEmailsEnabled?: boolean | null;
  };
  onSessionRefetch: () => void;
}) {
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const serverEnabled = user.summaryEmailsEnabled !== false;
  const [override, setOverride] = React.useState<boolean | null>(null);
  const [saving, setSaving] = React.useState(false);
  const enabled = override ?? serverEnabled;

  const onToggle = async (next: boolean) => {
    if (saving) return;
    const prev = enabled;
    setOverride(next);
    setSaving(true);
    try {
      const { error } = await authClient.updateUser({
        summaryEmailsEnabled: next,
      } as { summaryEmailsEnabled: boolean });
      if (error) {
        throw new Error(error.message || "Failed to update setting");
      }
      toast.success(
        next ? "Summary emails turned on" : "Summary emails turned off",
      );
      onSessionRefetch();
      setOverride(null);
    } catch (err) {
      setOverride(prev === serverEnabled ? null : prev);
      toast.error("Could not update summary emails", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection
        title="Account"
        description="Details about your Nexa AI account."
      >
        <dl className="divide-y divide-slate-100">
          <Row label="Display name" value={user.name || "—"} />
          <Row label="Email" value={user.email || "—"} />
          <Row label="Member since" value={memberSince} />
          <Row label="Role" value="Owner" />
        </dl>
      </SettingsSection>

      <SettingsSection
        title="Summary emails"
        description="Manage meeting summary notifications."
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <label
              htmlFor="summary-emails-enabled"
              className="text-sm font-medium text-slate-900"
            >
              Email me the summary after each meeting
            </label>
            <p className="text-xs text-slate-500">
              Sent only to your account email. Turn off anytime.
            </p>
          </div>
          <Switch
            id="summary-emails-enabled"
            checked={enabled}
            disabled={saving}
            onCheckedChange={(checked) => void onToggle(Boolean(checked))}
            aria-label="Email me the summary after each meeting"
          />
        </div>
      </SettingsSection>
    </div>
  );
}
