export interface OnboardingInput {
  agentCount: number;
  meetingCount: number;
  hasJoinedCall: boolean;
  hasSummary: boolean;
  firstMeetingId?: string | null;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  ctaLabel: string;
}

export function computeOnboardingSteps(input: OnboardingInput): OnboardingStep[] {
  const hasAgent = input.agentCount > 0;
  const hasMeeting = input.meetingCount > 0;
  const joined = input.hasJoinedCall;
  const hasSummary = input.hasSummary;

  const agentsHref = "/agents";
  const meetingsHref = input.firstMeetingId ? `/meetings/${input.firstMeetingId}` : "/meetings";

  return [
    {
      id: "create-agent",
      title: "Create or try an agent",
      description: "Make a custom agent or start from a template.",
      done: hasAgent,
      href: agentsHref,
      ctaLabel: "Go to agents",
    },
    {
      id: "schedule-meeting",
      title: "Schedule a meeting",
      description: "Create a meeting with one of your agents.",
      done: hasMeeting,
      href: "/meetings",
      ctaLabel: "Schedule meeting",
    },
    {
      id: "join-call",
      title: "Join your first call",
      description: "Open the meeting and join the video call.",
      done: joined,
      href: meetingsHref,
      ctaLabel: "Join call",
    },
    {
      id: "read-summary",
      title: "Read your first summary",
      description: "After the call, a summary is generated and emailed to you.",
      done: hasSummary,
      href: meetingsHref,
      ctaLabel: "View summary",
    },
  ];
}