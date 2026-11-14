"use client";

import "./globals.css";
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlertIcon } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

/**
 * Root-level error boundary (replaces the root layout when active, so it
 * must render its own <html> and <body> — see Next.js error.js conventions).
 * Branded light page; only the error digest is logged.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary — digest:", error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-6 text-center">
          <BrandLogo variant="onLight" width={82} height={40} />
          <span className="flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <TriangleAlertIcon className="size-6" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold text-slate-900">
            Something went wrong
          </h1>
          <p className="max-w-sm text-sm text-slate-500">
            An unexpected error occurred. You can retry — if it keeps happening,
            head back to the dashboard.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={reset}
              className="min-w-28 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Try again
            </button>
            <Link
              href="/"
              className="min-w-28 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Go to homepage
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
