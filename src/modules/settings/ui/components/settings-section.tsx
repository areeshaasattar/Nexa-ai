"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Titled card wrapper that matches the dashboard's card + SectionHeader idiom
 * (see `src/modules/home/ui/views/home-view.tsx`): a rounded-2xl white card, a
 * slate-100 divider under the header, a small semibold title and a muted
 * subtitle. Used by every settings tab so the whole page reads as one system.
 */
export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}