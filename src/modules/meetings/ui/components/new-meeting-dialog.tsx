"use client";

import React, { useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";
import Link from "next/link";
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
import { GeneratedAvatar } from "@/components/generated-avatar";
import { meetingsInsertSchema } from "../../schemas";
import { LIMITS } from "@/lib/limits";
import { z } from "zod";
import { VideoIcon, BotIcon, AlertCircleIcon, ChevronDown, Loader2, X } from "lucide-react";

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
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const agentsQuery = trpc.agents.getMany.useQuery(
    { pageSize: 100 },
    { enabled: open, staleTime: 60_000 },
  );
  const agents = agentsQuery.data?.data;
  const agentsLoaded = !agentsQuery.isLoading;
  const hasAgents = agentsQuery.isLoading || (agents ? agents.length > 0 : false);

  const form = useForm<FormValues>({
    resolver: zodResolver(meetingsInsertSchema) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: "",
      agentId: defaultAgentId ?? "",
      instructions: "",
      scheduledAt: null,
    },
  });

  const agentIdValue = form.watch("agentId");
  const scheduledAtValue = form.watch("scheduledAt");
  const instructionsValue = form.watch("instructions") ?? "";
  const selectedAgent = (agents ?? []).find((agent) => agent.id === agentIdValue);

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

  const { ref: nameRegisterRef, ...nameRegisterRest } = form.register("name");
  const setNameRef = (el: HTMLInputElement | null) => {
    nameInputRef.current = el;
    nameRegisterRef(el);
  };

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={nameInputRef}
        className="w-full max-w-[640px] gap-0 p-0 border border-gray-200/70 rounded-2xl"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
              <VideoIcon className="size-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-gray-500 uppercase">
                Scheduler
              </p>
              <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                New meeting
              </h2>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center justify-center size-8 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-x-8 gap-y-5 px-8 py-6">
              {/* Left column */}
              <div className="space-y-5 flex flex-col">
                {/* Meeting name */}
                <Field orientation="vertical">
                  <FieldLabel className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Meeting name <span className="text-red-600">*</span>
                  </FieldLabel>
                  <Input
                    {...nameRegisterRest}
                    ref={setNameRef}
                    placeholder="Weekly sync"
                    disabled={createMutation.isPending}
                    maxLength={LIMITS.textCaps.meetingName}
                    className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  />
                  {form.formState.errors.name && (
                    <FieldError errors={[form.formState.errors.name]} />
                  )}
                </Field>

                {/* Agent select */}
                <Field orientation="vertical">
                  <FieldLabel className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Agent <span className="text-red-600">*</span>
                  </FieldLabel>
                  {!agentsLoaded ? (
                    <Select disabled>
                      <SelectTrigger className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 appearance-none [-webkit-appearance:none] focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15">
                        <SelectValue placeholder="Loading agents..." />
                      </SelectTrigger>
                    </Select>
                  ) : hasAgents ? (
                    <div className="relative">
                      <Select
                        disabled={createMutation.isPending}
                        onValueChange={(value) =>
                          value && form.setValue("agentId", value)
                        }
                        defaultValue={form.getValues("agentId")}
                      >
                        <SelectTrigger className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed appearance-none [-webkit-appearance:none] pl-9 pr-9">
                          <div className="flex items-center gap-2">
                            {selectedAgent ? (
                              <GeneratedAvatar
                                seed={selectedAgent.name || selectedAgent.id}
                                className="size-4 rounded-full shrink-0"
                              />
                            ) : (
                              <BotIcon className="size-4 text-gray-500" />
                            )}
                            <SelectValue placeholder="Select an agent" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {(agents ?? []).map((agent) => (
                            <SelectItem
                              key={agent.id}
                              value={agent.id}
                            >
                              <span className="flex items-center gap-2">
                                <GeneratedAvatar
                                  seed={agent.name || agent.id}
                                  className="size-4 rounded-full shrink-0"
                                />
                                {agent.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <BotIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                      <BotIcon className="size-4 text-gray-600 shrink-0" />
                      <p className="text-xs text-gray-600">
                        You have no agents yet.{" "}
                        <Link
                          href="/agents"
                          className="font-semibold text-green-700 underline underline-offset-2 hover:text-green-800"
                        >
                          Create one in AI Agents
                        </Link>
                      </p>
                    </div>
                  )}
                  {form.formState.errors.agentId && (
                    <FieldError errors={[form.formState.errors.agentId]} />
                  )}
                </Field>

                {/* Scheduled time */}
                <Field orientation="vertical">
                  <FieldLabel className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Scheduled for
                  </FieldLabel>
                  <Input
                    type="datetime-local"
                    {...form.register("scheduledAt")}
                    disabled={createMutation.isPending}
                    className="h-10 min-w-0 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed [color-scheme:light] [&::-webkit-calendar-picker-indicator]:opacity-60"
                  />
                </Field>
              </div>

              {/* Right column: Instructions */}
              <div className="flex flex-col md:row-span-4">
                <Field orientation="vertical" className="flex flex-col h-full">
                  <FieldLabel className="block text-[13px] font-medium text-gray-700 mb-1.5">
                    Instructions <span className="text-gray-400 font-normal">(optional)</span>
                  </FieldLabel>
                  <Textarea
                    {...form.register("instructions")}
                    placeholder="Anything the agent should know for this session"
                    className="flex-1 min-h-[240px] rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/15 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                    disabled={createMutation.isPending}
                    maxLength={LIMITS.textCaps.meetingInstructions}
                  />
                  <span
                    className="mt-1.5 text-xs text-gray-400 text-right tabular-nums"
                    aria-hidden="true"
                  >
                    {instructionsValue.length}/{LIMITS.textCaps.meetingInstructions}
                  </span>
                  {form.formState.errors.instructions && (
                    <FieldError errors={[form.formState.errors.instructions]} />
                  )}
                </Field>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4 rounded-b-2xl">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
              className="h-10 px-4 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-600/15 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !hasAgents}
              className="h-10 px-5 rounded-lg bg-brand-700 hover:bg-brand-900 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-green-600/15 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              {createMutation.isPending
                ? "Scheduling…"
                : hasAgents
                  ? "Schedule"
                  : "No agents available"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
