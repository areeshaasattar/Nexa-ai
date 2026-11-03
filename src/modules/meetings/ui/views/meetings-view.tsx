"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import MeetingsListHeader from "../components/meetings-list-header";
import { NewMeetingDialog } from "../components/new-meeting-dialog";
import { useMeetingsFilter } from "@/app/(dashboard)/meetings/hooks/use-meetings-filter";
import {
  VideoIcon,
  BotIcon,
  ClockIcon,
  CalendarIcon,
  MoreVerticalIcon,
  Trash2Icon,
  ExternalLinkIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  PlayCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPagination } from "@/modules/agents/ui/components/data-pagination";
import { toast } from "sonner";
import Link from "next/link";

const StatusBadge = ({ status }: { status: string }) => {
  const styles =
    {
      scheduled: "bg-blue-50 text-blue-600 border-blue-100",
      ongoing: "bg-amber-50 text-amber-600 border-amber-100 animate-pulse",
      completed: "bg-green-50 text-green-600 border-green-100",
      failed: "bg-red-50 text-red-600 border-red-100",
    }[status] || "bg-gray-50 text-gray-600 border-gray-100";

  const icons = {
    scheduled: <CalendarIcon className="size-3" />,
    ongoing: <PlayCircleIcon className="size-3" />,
    completed: <CheckCircle2Icon className="size-3" />,
    failed: <AlertCircleIcon className="size-3" />,
  }[status] || <VideoIcon className="size-3" />;

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${styles}`}
    >
      {icons}
      {status}
    </div>
  );
};

export const MeetingsView = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [{ search, status, agentId, page, pageSize }] =
    useMeetingsFilter();
  const utils = trpc.useUtils();

  const meetingsQuery = trpc.meetings.getMany.useQuery({
    search,
    status,
    agentId,
    page,
    pageSize,
  });

  const deleteMutation = trpc.meetings.remove.useMutation({
    onSuccess: () => {
      toast.success("Meeting cancelled.");
      utils.meetings.getMany.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (meetingsQuery.isLoading) {
    return (
      <LoadingState
        title="Accessing Network Nodes"
        description="Synchronizing scheduled sessions with the Nexa AI relay..."
      />
    );
  }

  if (meetingsQuery.isError) {
    return (
      <ErrorState
        title="Relay Timeout"
        description={meetingsQuery.error.message}
        onRetry={() => meetingsQuery.refetch()}
      />
    );
  }

  const meetingsData = meetingsQuery.data?.data ?? [];
  const total = meetingsQuery.data?.total ?? 0;
  const totalPages = meetingsQuery.data?.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <MeetingsListHeader onOpenDialog={() => setIsDialogOpen(true)} />

      <NewMeetingDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">
              Session Logs
            </h2>
            <p className="text-xs text-gray-500 font-medium">
              Historical and upcoming mission sequences
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
            <span className="size-1.5 rounded-full bg-[#3B6D11] animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
              {total} Total Sessions
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/30">
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Meeting Info
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Assigned Agent
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Schedule
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Duration
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {meetingsData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="size-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                          <VideoIcon className="size-6" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">
                          No sessions scheduled yet.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsDialogOpen(true)}
                          className="rounded-lg border-[#d4e0d4] text-[#3B6D11] hover:bg-[#f0f4f0]"
                        >
                          Schedule First Meeting
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  meetingsData.map((meeting) => {
                    const startedAt = meeting.startedAt
                      ? new Date(meeting.startedAt)
                      : null;
                    const endedAt = meeting.endedAt
                      ? new Date(meeting.endedAt)
                      : null;
                    const durationMins =
                      startedAt && endedAt
                        ? Math.round(
                            (endedAt.getTime() - startedAt.getTime()) /
                              (1000 * 60),
                          )
                        : null;

                    return (
                      <tr
                        key={meeting.id}
                        className="group hover:bg-[#fcfdfc] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <Link
                              href={`/meetings/${meeting.id}`}
                              className="text-sm font-bold text-gray-900 group-hover:text-[#3B6D11] transition-colors cursor-pointer flex items-center gap-2"
                            >
                              {meeting.name}
                              <ExternalLinkIcon className="size-3 opacity-0 group-hover:opacity-100 transition-opacity text-[#3B6D11]" />
                            </Link>
                            <span className="text-[10px] font-mono text-gray-400 mt-0.5 tracking-tight uppercase">
                              {meeting.id}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/agents/${meeting.agentId}`}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 hover:border-[#3B6D11]/30 transition-colors"
                          >
                            <BotIcon className="size-3.5 text-[#3B6D11]" />
                            <span className="text-xs font-semibold text-gray-700">
                              {meeting.agentName}
                            </span>
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                              <CalendarIcon className="size-3 text-gray-400" />
                              {startedAt
                                ? startedAt.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "Not started"}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                              <ClockIcon className="size-3" />
                              {startedAt
                                ? startedAt.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "--:--"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-gray-600 bg-gray-100/50 px-2 py-1 rounded-md">
                            {durationMins !== null ? `${durationMins}m` : "--"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={meeting.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                                />
                              }
                            >
                              <MoreVerticalIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="rounded-xl border-[#d4e0d4] shadow-lg p-1"
                            >
                              <DropdownMenuItem className="text-xs font-bold text-gray-600 rounded-lg cursor-pointer">
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-xs font-bold text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 rounded-lg cursor-pointer"
                                onClick={() => {
                                  if (confirm("Cancel this meeting session?")) {
                                    deleteMutation.mutate({ id: meeting.id });
                                  }
                                }}
                              >
                                <Trash2Icon className="size-3.5 mr-2" />
                                Cancel Meeting
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-50 px-6">
            <DataPagination total={total} totalPages={totalPages} />
          </div>
        </div>
      </section>
    </div>
  );
};
