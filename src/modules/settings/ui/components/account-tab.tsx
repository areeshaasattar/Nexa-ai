"use client";

import { SettingsSection } from "./settings-section";

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
}: {
  user: {
    name: string;
    email: string;
    createdAt?: string | Date | null;
  };
}) {
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
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
  );
}