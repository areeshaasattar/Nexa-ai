"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/trpc/client";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeOnboardingSteps } from "@/modules/home/lib/onboarding";
import Link from "next/link";

function storageKey(userId: string) {
  return `nexa:onboarding:dismissed:${userId}`;
}

export function OnboardingChecklist() {
  const { data: onboarding, isLoading, isError } = trpc.getOnboarding.useQuery();
  const { data: hello } = trpc.hello.useQuery({ text: "" });
  const userId = hello?.user?.id;

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    if (!userId) return;
    try {
      const v = window.localStorage.getItem(storageKey(userId));
      if (v === "1") queueMicrotask(() => setDismissed(true));
    } catch {
      // storage unavailable: show by default
    }
  }, [userId]);

  const handleDismiss = () => {
    setDismissed(true);
    if (!userId) return;
    try {
      window.localStorage.setItem(storageKey(userId), "1");
    } catch {
      // ignore
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Get started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-2 w-full rounded bg-slate-100 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !onboarding) {
    return null;
  }

  const steps = computeOnboardingSteps({
    agentCount: onboarding.agentCount,
    meetingCount: onboarding.meetingCount,
    hasJoinedCall: onboarding.hasJoinedCall,
    hasSummary: onboarding.hasSummary,
    firstMeetingId: onboarding.firstMeetingId,
  });

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone) return null;
  if (!mounted) return null;
  if (dismissed) return null;

  const nextStep = steps.find((s) => !s.done);

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Get started</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Dismiss
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-slate-500">
          {doneCount} of {steps.length} done
        </div>
        <Progress value={(doneCount / steps.length) * 100} />
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-sm">
              {s.done ? (
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Circle className="size-4 text-slate-300" aria-hidden="true" />
              )}
              <span className={s.done ? "line-through text-slate-400" : ""}>{s.title}</span>
            </li>
          ))}
        </ul>
        {nextStep && (
          <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href={nextStep.href}>{nextStep.ctaLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}