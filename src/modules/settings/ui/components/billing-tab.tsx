"use client";

import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "./settings-section";

export function BillingTab() {
  return (
    <SettingsSection
      title="Billing & plan"
      description="Your workspace's subscription and payment details."
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-slate-900">Pro Plan</p>
            <p className="text-xs text-slate-500">
              Unlimited meetings &amp; AI agents
            </p>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            Active
          </Badge>
        </div>
        <p className="text-xs text-slate-400">
          Billing management is coming soon. Contact support to adjust your
          plan or payment method.
        </p>
      </div>
    </SettingsSection>
  );
}