"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/trpc/client";
import type { AgentTemplate, AgentTemplateId } from "@/lib/agent-templates";

/**
 * Shared "Try it now" behavior: creates or reuses the template agent plus a
 * meeting, then routes to the call page. The mutation's pending state is
 * shared by every caller so all Try it now buttons can be disabled together.
 */
export function useQuickStart() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const quickStartMutation = trpc.meetings.quickStart.useMutation({
    onSuccess: (data) => {
      toast.success("Starting your session...");
      utils.agents.getMany.invalidate();
      utils.meetings.getMany.invalidate();
      router.push(`/call/${data.meetingId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const start = (template: AgentTemplate) => {
    if (quickStartMutation.isPending) return;
    quickStartMutation.mutate({
      templateId: template.id as AgentTemplateId,
    });
  };

  return { start, isPending: quickStartMutation.isPending };
}
