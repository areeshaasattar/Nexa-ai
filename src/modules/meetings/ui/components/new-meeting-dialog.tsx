"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { meetingsInsertSchema } from "../../schemas";
import { z } from "zod";
import { VideoIcon, BotIcon, ClockIcon, MessageSquareIcon } from "lucide-react";

type FormValues = z.infer<typeof meetingsInsertSchema>;

interface NewMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select an agent when opening from an agent detail page */
  defaultAgentId?: string;
}

export const NewMeetingDialog = ({
  open,
  onOpenChange,
  defaultAgentId,
}: NewMeetingDialogProps) => {
  const utils = trpc.useUtils();
  const agentsQuery = trpc.agents.getMany.useQuery({ pageSize: 100 });

  const form = useForm<FormValues>({
    resolver: zodResolver(meetingsInsertSchema) as any,
    defaultValues: {
      name: "",
      agentId: defaultAgentId ?? "",
      instructions: "",
      status: "scheduled",
    },
  });

  const createMutation = trpc.meetings.create.useMutation({
    onSuccess: () => {
      toast.success("Meeting scheduled successfully.");
      form.reset();
      onOpenChange(false);
      utils.meetings.getMany.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border border-[#d4e0d4] bg-white shadow-xl duration-200 ease-out">
        <div className="px-6 pt-6 pb-5 border-b border-[#d4e0d4]">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-[#f0f4f0] border border-[#d4e0d4] flex items-center justify-center overflow-hidden text-[#3B6D11]">
              <VideoIcon className="size-6" />
            </div>
            <DialogHeader className="p-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6a9a6a]">
                Scheduler
              </p>
              <DialogTitle className="text-base font-semibold text-[#1a2e1a] leading-tight">
                New Meeting
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="px-6 pt-5 pb-8 space-y-4 bg-white">
            <Field orientation="vertical">
              <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                Session Name
              </FieldLabel>
              <Input
                {...form.register("name")}
                placeholder="e.g. Quarterly Strategic Sync"
                className="h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400"
                disabled={createMutation.isPending}
              />
              {form.formState.errors.name && (
                <FieldError errors={[form.formState.errors.name]} />
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                Assign Agent
              </FieldLabel>
              <Select
                disabled={createMutation.isPending || agentsQuery.isLoading}
                onValueChange={(value) => value && form.setValue("agentId", value)}
                defaultValue={form.getValues("agentId")}
              >
                <SelectTrigger className="h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm focus:bg-white focus:ring-[#3B6D11]/20 transition-all">
                  <div className="flex items-center gap-2">
                    <BotIcon className="size-3.5 text-gray-400" />
                    <SelectValue placeholder="Select an operative" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#d4e0d4]">
                  {agentsQuery.data?.data.map((agent) => (
                    <SelectItem
                      key={agent.id}
                      value={agent.id}
                      className="text-sm rounded-lg cursor-pointer"
                    >
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.agentId && (
                <FieldError errors={[form.formState.errors.agentId]} />
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                <MessageSquareIcon className="size-3" /> Mission Instructions
              </FieldLabel>
              <Textarea
                {...form.register("instructions")}
                placeholder="Additional context for this specific session..."
                className="min-h-[80px] rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm resize-none focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400"
                disabled={createMutation.isPending}
              />
              {form.formState.errors.instructions && (
                <FieldError errors={[form.formState.errors.instructions]} />
              )}
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field orientation="vertical">
                <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3" /> Start Date/Time
                </FieldLabel>
                <Input
                  type="datetime-local"
                  {...form.register("startedAt")}
                  className="h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-xs focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors"
                  disabled={createMutation.isPending}
                />
              </Field>

              <Field orientation="vertical">
                <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                  <ClockIcon className="size-3" /> End Date/Time
                </FieldLabel>
                <Input
                  type="datetime-local"
                  {...form.register("endedAt")}
                  className="h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-xs focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors"
                  disabled={createMutation.isPending}
                />
              </Field>
            </div>
          </div>

          <DialogFooter className="px-6 py-6 border-t border-[#d4e0d4] bg-[#f0f4f0] flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border-[#c4d4c4] bg-transparent text-gray-600 hover:bg-[#e4ede4] text-sm h-9 px-4"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-lg bg-[#3B6D11] hover:bg-[#2f5a0d] text-white text-sm font-medium h-9 px-5 transition-colors"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
