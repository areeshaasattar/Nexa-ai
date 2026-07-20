"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/trpc/client";
import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { GeneratedAvatar } from "@/components/generated-avatar";
import {
  VideoIcon,
  ArrowLeftIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  CalendarIcon,
  MessageSquareIcon,
  HashIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { EditAgentDialog } from "../components/edit-agent-dialog";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AgentIdViewProps {
  agentId: string;
}

export const AgentIdView = ({ agentId }: AgentIdViewProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isNewMeetingDialogOpen, setIsNewMeetingDialogOpen] = useState(false);
  const agentQuery = trpc.agents.getOne.useQuery({ id: agentId });

  const deleteMutation = trpc.agents.remove.useMutation({
    onSuccess: () => {
      toast.success("Agent deleted successfully.");
      utils.agents.getMany.invalidate();
      router.push("/agents");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (agentQuery.isLoading) {
    return (
      <LoadingState
        title="Loading Agent"
        description="Fetching agent details..."
      />
    );
  }

  if (agentQuery.isError || !agentQuery.data) {
    return (
      <ErrorState
        title="Agent Not Found"
        description={
          agentQuery.error?.message || "This agent could not be loaded."
        }
        onRetry={() => agentQuery.refetch()}
      />
    );
  }

  const agent = agentQuery.data;

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: agent.id });
  };

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
      <EditAgentDialog 
        open={isEditDialogOpen} 
        onOpenChange={setIsEditDialogOpen} 
        agent={{
          id: agent.id,
          name: agent.name,
          instruction: agent.instruction,
        }} 
      />

      <NewMeetingDialog 
        open={isNewMeetingDialogOpen} 
        onOpenChange={setIsNewMeetingDialogOpen} 
        defaultAgentId={agent.id}
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl border border-gray-100 bg-white shadow-xl max-w-[420px] p-6">
          <AlertDialogHeader className="flex-row items-center gap-4 space-y-0">
            <div className="size-10 rounded-xl bg-[#f0f4f0] border border-[#d4e0d4] flex items-center justify-center shrink-0">
              <Trash2Icon className="size-5 text-[#3B6D11]" />
            </div>
            <div className="flex flex-col gap-1">
              <AlertDialogTitle className="text-base font-bold text-gray-900 leading-none">
                Delete Agent
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-gray-500 leading-tight">
                Remove <span className="font-semibold text-gray-700">{agent.name}</span> from your fleet.
              </AlertDialogDescription>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-lg border-gray-100 text-gray-500 font-bold hover:bg-gray-50 h-9 px-4 text-xs mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg bg-[#3B6D11] hover:bg-[#2f5a0d] text-white font-bold h-9 px-4 text-xs shadow-none transition-colors"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-gray-700 h-9 w-9"
          >
            <Link href="/agents">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Link
                href="/agents"
                className="text-[11px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Agents
              </Link>
              <span className="text-gray-300 text-[11px]">/</span>
              <span className="text-[11px] font-medium text-gray-600">
                {agent.name}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">Agent Profile</h1>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-500 hover:text-gray-700"
              />
            }
          >
            <MoreVerticalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 rounded-xl bg-white shadow-lg p-1"
          >
            <DropdownMenuItem
              onClick={handleEdit}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer focus:bg-gray-50"
            >
              <PencilIcon className="size-3.5 text-gray-500" />
              Edit Agent
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 cursor-pointer focus:bg-red-50 focus:text-red-600"
            >
              <Trash2Icon className="size-3.5" />
              {deleteMutation.isPending ? "Deleting..." : "Delete Agent"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-full overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
              <GeneratedAvatar seed={agent.name} style="bottts" size="lg" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {agent.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <VideoIcon className="size-3 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {agent.meetingCount} meetings
                </span>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-100 rounded-full px-2.5 py-1">
            <span className="size-1.5 rounded-full bg-green-500" />
            Active
          </span>
        </div>

        <div className="divide-y divide-gray-50">
          <div className="flex items-start gap-4 px-6 py-4">
            <div className="flex items-center gap-2 w-36 shrink-0">
              <HashIcon className="size-3.5 text-gray-300" />
              <span className="text-xs font-medium text-gray-400">
                Agent ID
              </span>
            </div>
            <code className="text-xs font-mono text-gray-500 break-all">
              {agent.id}
            </code>
          </div>

          <div className="flex items-start gap-4 px-6 py-4">
            <div className="flex items-center gap-2 w-36 shrink-0">
              <MessageSquareIcon className="size-3.5 text-gray-300" />
              <span className="text-xs font-medium text-gray-400">
                Instructions
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {agent.instruction}
            </p>
          </div>

          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex items-center gap-2 w-36 shrink-0">
              <VideoIcon className="size-3.5 text-gray-300" />
              <span className="text-xs font-medium text-gray-400">
                Sessions
              </span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {agent.meetingCount}
            </span>
          </div>

          <div className="flex items-center gap-4 px-6 py-4">
            <div className="flex items-center gap-2 w-36 shrink-0">
              <CalendarIcon className="size-3.5 text-gray-300" />
              <span className="text-xs font-medium text-gray-400">Created</span>
            </div>
            <span className="text-sm text-gray-600">
              {new Date(agent.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <Button 
            onClick={() => setIsNewMeetingDialogOpen(true)}
            className="rounded-lg bg-green-600 hover:bg-green-700 text-white h-9 font-medium text-sm gap-2 shadow-none px-4"
          >
            <VideoIcon className="size-3.5" />
            Start Meeting
          </Button>
        </div>
      </div>
    </div>
  );
};
