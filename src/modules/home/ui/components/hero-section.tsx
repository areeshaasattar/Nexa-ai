// Redesigned HeroSection – personalized, data‑driven, minimal SaaS feel
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Zap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface HeroSectionProps {
  /** Full name of the signed‑in user */
  userName: string;
  /** Dashboard metrics needed for quick insights */
  metrics?: {
    meetings?: { total?: number; ongoing?: number };
    agents?: { total?: number };
    recordings?: { total?: number };
    voice?: { totalConversations?: number };
  };
  /** Optional count of upcoming meetings for the day */
  upcomingCount?: number;
  /** Open the "New Meeting" scheduler dialog */
  onNewMeeting?: () => void;
}

/** Simple greeting that adapts to time of day */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const heroStats: {
  label: string;
  get: (m: NonNullable<HeroSectionProps["metrics"]>) => number;
}[] = [
  { label: "Meetings", get: (m) => m.meetings?.total ?? 0 },
  { label: "Active agents", get: (m) => m.agents?.total ?? 0 },
  { label: "Transcriptions", get: (m) => m.recordings?.total ?? 0 },
  { label: "Voice calls", get: (m) => m.voice?.totalConversations ?? 0 },
];

export const HeroSection = ({
  userName,
  metrics,
  upcomingCount,
  onNewMeeting,
}: HeroSectionProps) => {
  const greeting = getGreeting();
  const firstName = userName?.split(" ")?.[0] ?? "User";

  return (
    <section className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6 lg:p-8">
      {/* Header – greeting */}
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
        {greeting}, <span className="text-emerald-600">{firstName}</span>.
      </h1>
      {/* Sub‑text with quick stats */}
      <p className="mt-2 text-sm text-slate-500">
        {upcomingCount !== undefined ? (
          <>You have {upcomingCount} meeting{upcomingCount !== 1 && "s"} scheduled today.</>
        ) : (
          "Your dashboard is up to date."
        )}
      </p>

      {/* Quick stats grid – four key numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {heroStats.map(({ label, get }) => (
          <div key={label} className="flex flex-col items-start">
            <span className="text-xs font-medium text-slate-500">{label}</span>
            <span className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900">
              {metrics ? get(metrics) : 0}
            </span>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={onNewMeeting}
        >
          New meeting
        </Button>
        <Button asChild variant="outline" className="border-slate-300 text-slate-700">
          <Link href="/agents">Manage agents</Link>
        </Button>
        <Button
          variant="ghost"
          className="text-slate-500"
          onClick={() => window.dispatchEvent(new CustomEvent("open-shortcuts"))}
        >
          <Zap className="size-4 mr-1" /> Quick actions
        </Button>
      </div>
    </section>
  );
};