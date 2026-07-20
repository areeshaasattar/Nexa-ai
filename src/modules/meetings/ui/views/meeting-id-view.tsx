"use client";

import { trpc } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { 
  VideoIcon, 
  ArrowLeftIcon, 
  CalendarIcon, 
  ClockIcon, 
  BotIcon,
  FileTextIcon,
  PlayCircleIcon,
  ClipboardListIcon,
  ExternalLinkIcon,
  CheckCircle2Icon ,
  AlertCircleIcon
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface MeetingIdViewProps {
  meetingId: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const config: { label: string; styles: string; icon: React.ReactNode } = ({
    scheduled: {
      label: "Upcoming",
      styles: "bg-blue-50 text-blue-600 border-blue-100",
      icon: <CalendarIcon className="size-3" />,
    },
    ongoing: {
      label: "Active",
      styles: "bg-green-50 text-green-600 border-green-100 animate-pulse",
      icon: <PlayCircleIcon className="size-3" />,
    },
    processing: {
      label: "Processing",
      styles: "bg-amber-50 text-amber-600 border-amber-100 animate-pulse",
      icon: <ClockIcon className="size-3" />,
    },
    completed: {
      label: "Completed",
      styles: "bg-[#f0f4f0] text-[#3B6D11] border-[#d4e0d4]",
      icon: <CheckCircle2Icon className="size-3" />,
    },
    cancelled: {
      label: "Cancelled",
      styles: "bg-gray-50 text-gray-400 border-gray-100",
      icon: <AlertCircleIcon className="size-3" />,
    },
    failed: {
      label: "Failed",
      styles: "bg-red-50 text-red-600 border-red-100",
      icon: <AlertCircleIcon className="size-3" />,
    },
  } as any)[status] || {
    label: status,
    styles: "bg-gray-50 text-gray-600 border-gray-100",
    icon: <VideoIcon className="size-3" />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${config.styles}`}>
      {config.icon}
      {config.label}
    </div>
  );
};

export const MeetingIdView = ({ meetingId }: MeetingIdViewProps) => {
  const meetingQuery = trpc.meetings.getOne.useQuery(
    { id: meetingId },
    {
      // Poll every 5s while the call has completed but summary hasn't arrived yet
      refetchInterval: (query) => {
        const data = query.state.data;
        if (data?.status === 'completed' && !data?.summary) return 5000;
        return false;
      },
    }
  );

  if (meetingQuery.isLoading) {
    return (
      <LoadingState 
        title="Accessing Mission Relay" 
        description="Retrieving encrypted meeting intelligence and transcripts..." 
      />
    );
  }

  if (meetingQuery.isError || !meetingQuery.data) {
    return (
      <ErrorState 
        title="Uplink Failed" 
        description={meetingQuery.error?.message || "Meeting session not found or access restricted."} 
        onRetry={() => meetingQuery.refetch()}
      />
    );
  }

  const meeting = meetingQuery.data;
  const startedAt = meeting.startedAt ? new Date(meeting.startedAt) : null;
  const endedAt = meeting.endedAt ? new Date(meeting.endedAt) : null;
  const durationMins = startedAt && endedAt 
    ? Math.round((endedAt.getTime() - startedAt.getTime()) / (1000 * 60))
    : null;

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl border border-gray-100 hover:bg-white hover:border-gray-200 text-gray-400 hover:text-gray-600 transition-all">
            <Link href="/meetings">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Relay</span>
              <span className="text-gray-300">/</span>
              <span className="text-[10px] font-bold text-[#3B6D11] uppercase tracking-widest">{meeting.name}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Meeting Intelligence</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["scheduled", "ongoing"].includes(meeting.status) && (
            <Button asChild className="rounded-xl h-10 px-6 font-bold bg-[#3B6D11] hover:bg-[#2d540d] transition-all gap-2">
              <Link href={`/call/${meeting.id}`}>
                <VideoIcon className="size-4" />
                {meeting.status === "scheduled" ? "Start Meeting" : "Join Call"}
              </Link>
            </Button>
          )}
          <StatusBadge status={meeting.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metadata */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="size-12 rounded-2xl bg-[#f0f4f0] border border-[#d4e0d4] flex items-center justify-center text-[#3B6D11]">
                <VideoIcon className="size-6" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold text-gray-900 leading-tight">{meeting.name}</h2>
                <span className="text-[10px] font-mono text-gray-400 tracking-tight uppercase">{meeting.id}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="size-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <CalendarIcon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {startedAt ? startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "Not started"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="size-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <ClockIcon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Start Time</span>
                  <span className="text-sm font-semibold text-gray-700">
                    {startedAt ? startedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="size-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                  <BotIcon className="size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assigned Agent</span>
                  <Link href={`/agents/${meeting.agentId}`} className="text-sm font-semibold text-[#3B6D11] hover:underline">
                    {meeting.agentName}
                  </Link>
                </div>
              </div>
            </div>

            <Separator className="my-8 bg-gray-50" />

            <div className="space-y-3">
              {meeting.recordingUrl && (
                <Button variant="outline" className="w-full rounded-xl h-11 font-bold border-gray-200 text-gray-600 hover:bg-gray-50 gap-2" asChild>
                  <a href={meeting.recordingUrl} target="_blank" rel="noopener noreferrer">
                    <PlayCircleIcon className="size-4" />
                    Watch Recording
                  </a>
                </Button>
              )}
              {meeting.transcriptUrl && (
                <Button variant="outline" className="w-full rounded-xl h-11 font-bold border-gray-200 text-gray-600 hover:bg-gray-50 gap-2" asChild>
                  <a href={meeting.transcriptUrl} target="_blank" rel="noopener noreferrer">
                    <FileTextIcon className="size-4" />
                    Raw Transcript
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Insights */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm min-h-[400px]">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <ClipboardListIcon className="size-4 text-[#3B6D11]" />
              AI-Generated Mission Summary
            </h3>
            {meeting.summary ? (
              <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                {meeting.summary}
              </div>
            ) : meeting.status === "completed" ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-200">
                  <ClipboardListIcon className="size-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Conversation Recorded</p>
                  <p className="text-xs text-gray-400 max-w-[200px] mt-1">This meeting ended without any conversation data being captured.</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="size-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-200">
                  <ClipboardListIcon className="size-6" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Summary Pending</p>
                  <p className="text-xs text-gray-400 max-w-[200px] mt-1">The AI operative will process the mission logs once the relay ends.</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B6D11]/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <FileTextIcon className="size-4 text-[#3B6D11]" />
                </div>
                <h3 className="text-lg font-bold">Mission Protocols</h3>
              </div>
              <p className="text-sm text-gray-400 mb-6 max-w-lg leading-relaxed italic">
                {meeting.instructions || "No session-specific instructions provided."}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duration</span>
                  <span className="text-sm font-bold">{durationMins ? `${durationMins} minutes` : "--"}</span>
                </div>
                <div className="w-px h-8 bg-white/10 mx-2" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Relay Status</span>
                  <span className="text-sm font-bold text-green-400">Encrypted</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
