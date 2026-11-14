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
import { VideoIcon, BotIcon, ClockIcon, AlertCircleIcon } from "lucide-react";

type FormValues = z.infer<typeof meetingsInsertSchema>;

interface NewMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-select an agent when opening from an agent detail page */
  defaultAgentId?: string;
}

const inputClass =
  "h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400";

export const NewMeetingDialog = ({
  open,
  onOpenChange,
  defaultAgentId,
}: NewMeetingDialogProps) => {
  const utils = trpc.useUtils();
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  // Only fetch agents while the dialog is open — mounting this dialog shell-wide
  // (shortcuts modal) used to fire this request on every dashboard page load.
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
      status: "scheduled",
    },
  });

  const agentIdValue = form.watch("agentId");
  const startedAtValue = form.watch("startedAt");
  const endedAtValue = form.watch("endedAt");
  const instructionsValue = form.watch("instructions") ?? "";
  const selectedAgent = (agents ?? []).find((agent) => agent.id === agentIdValue);

  // Inline guard: when both bounds are set, end must be after start.
  // Unchanged behavior when either field is empty or the range is valid.
  const startDate = startedAtValue ? new Date(startedAtValue) : null;
  const endDate = endedAtValue ? new Date(endedAtValue) : null;
  const timeRangeInvalid =
    startDate !== null &&
    endDate !== null &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() <= startDate.getTime();

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

  // Keep RHF's own ref registration intact while also capturing the element
  // for the dialog's initialFocus.
  const { ref: nameRegisterRef, ...nameRegisterRest } = form.register("name");
  const setNameRef = (el: HTMLInputElement | null) => {
    nameInputRef.current = el;
    nameRegisterRef(el);
  };

  const onSubmit = (data: FormValues) => {
    if (timeRangeInvalid) return;
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        initialFocus={nameInputRef}
        className="max-w-3xl gap-0 p-0 overflow-hidden rounded-2xl border border-[#d4e0d4] bg-white shadow-xl duration-200 ease-out"
      >
        {/* Fixed header */}
        <div className="flex shrink-0 items-center gap-4 border-b border-[#d4e0d4] px-6 py-5 pr-12">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-[#f0f4f0] border border-[#d4e0d4] flex items-center justify-center overflow-hidden text-[#3B6D11]">
            <VideoIcon className="size-6" />
          </div>
          <DialogHeader className="p-0 space-y-0.5 flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6a9a6a]">
              Scheduler
            </p>
            <DialogTitle className="text-base font-semibold text-[#1a2e1a] leading-tight">
              New meeting
            </DialogTitle>
          </DialogHeader>
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* Scrollable body */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-6 px-6 py-5 md:grid-cols-2 bg-white">
              {/* Left column: name, agent, schedule */}
              <div className="space-y-4">
                <Field orientation="vertical">
                  <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                    Meeting name
                  </FieldLabel>
                  <Input
                    {...nameRegisterRest}
                    ref={setNameRef}
                    placeholder="For example: Weekly planning"
                    className={inputClass}
                    disabled={createMutation.isPending}
                    maxLength={LIMITS.textCaps.meetingName}
                  />
                  {form.formState.errors.name && (
                    <FieldError errors={[form.formState.errors.name]} />
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                    Agent
                  </FieldLabel>
                  {!agentsLoaded ? (
                    <Select disabled>
                      <SelectTrigger className={inputClass}>
                        <div className="flex items-center gap-2">
                          <BotIcon className="size-3.5 text-gray-400" />
                          <SelectValue placeholder="Select an agent" />
                        </div>
                      </SelectTrigger>
                    </Select>
                  ) : hasAgents ? (
                    <Select
                      disabled={createMutation.isPending}
                      onValueChange={(value) =>
                        value && form.setValue("agentId", value)
                      }
                      defaultValue={form.getValues("agentId")}
                    >
                      <SelectTrigger className={inputClass}>
                        <div className="flex items-center gap-2">
                          {selectedAgent ? (
                            <GeneratedAvatar
                              seed={selectedAgent.name || selectedAgent.id}
                              style="bottts"
                              size="sm"
                              className="size-5 shrink-0"
                            />
                          ) : (
                            <BotIcon className="size-3.5 text-gray-400" />
                          )}
                          <SelectValue placeholder="Select an agent" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-[#d4e0d4]">
                        {(agents ?? []).map((agent) => (
                          <SelectItem
                            key={agent.id}
                            value={agent.id}
                            className="text-sm rounded-lg cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <GeneratedAvatar
                                seed={agent.name || agent.id}
                                style="bottts"
                                size="sm"
                                className="size-5 shrink-0"
                              />
                              {agent.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg border border-[#a8c8a8]/70 bg-gray-50 px-3 py-2.5">
                      <BotIcon className="size-3.5 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500">
                        You have no agents yet.{" "}
                        <Link
                          href="/agents"
                          className="font-semibold text-[#3B6D11] underline underline-offset-2 hover:text-[#2f5a0d]"
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

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field orientation="vertical">
                    <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <ClockIcon className="size-3" /> Start
                    </FieldLabel>
                    <Input
                      type="datetime-local"
                      {...form.register("startedAt")}
                      className={`${inputClass} text-xs`}
                      disabled={createMutation.isPending}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <ClockIcon className="size-3" /> End
                    </FieldLabel>
                    <Input
                      type="datetime-local"
                      {...form.register("endedAt")}
                      aria-invalid={timeRangeInvalid}
                      aria-describedby={
                        timeRangeInvalid ? "new-meeting-end-error" : undefined
                      }
                      className={`${inputClass} text-xs ${
                        timeRangeInvalid ? "border-red-400 focus:border-red-500 focus:ring-red-500/20" : ""
                      }`}
                      disabled={createMutation.isPending}
                    />
                    {timeRangeInvalid && (
                      <p
                        id="new-meeting-end-error"
                        className="mt-1.5 flex items-center gap-1 text-xs text-red-500"
                      >
                        <AlertCircleIcon className="size-3 shrink-0" aria-hidden="true" />
                        End must be after start.
                      </p>
                    )}
                  </Field>
                </div>
              </div>

              {/* Right column: instructions */}
              <Field orientation="vertical" className="flex flex-col">
                <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                  Instructions (optional)
                </FieldLabel>
                <Textarea
                  {...form.register("instructions")}
                  placeholder="Anything this agent should know for this session"
                  className="min-h-[160px] flex-1 rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm resize-none focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400"
                  disabled={createMutation.isPending}
                  maxLength={LIMITS.textCaps.meetingInstructions}
                />
                <span
                  className="mt-1 self-end text-[11px] tabular-nums text-gray-400"
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

          {/* Fixed footer: always visible while the body scrolls */}
          <DialogFooter className="shrink-0 px-6 py-4 border-t border-[#d4e0d4] bg-[#f0f4f0] flex flex-row items-center justify-end gap-2">
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
              className="rounded-lg bg-[#3B6D11] hover:bg-[#2f5a0d] text-white text-sm font-medium h-9 px-5 transition-colors disabled:opacity-40 disabled:hover:bg-[#3B6D11]"
              disabled={createMutation.isPending || !hasAgents || timeRangeInvalid}
            >
              {createMutation.isPending
                ? "Scheduling…"
                : hasAgents
                  ? "Schedule"
                  : "No agents available"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
