"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Error boundary for the dashboard segment (wraps every dashboard page but
 * not this segment's layout, so the light sidebar/navbar shell stays visible).
 * Shows a branded light fallback instead of Next.js' default black error page.
 * Only the error digest is logged — never the raw message.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary — digest:", error.digest);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <TriangleAlertIcon className="size-6" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-slate-900">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500">
              An unexpected error occurred. Your data is safe — try again.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              onClick={reset}
              className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Try again
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
