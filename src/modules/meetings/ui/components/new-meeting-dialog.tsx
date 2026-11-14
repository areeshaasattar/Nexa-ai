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
import { VideoIcon, BotIcon, AlertCircleIcon } from "lucide-react";

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
      status: "scheduled",
    },
  });

  const agentIdValue = form.watch("agentId");
  const startedAtValue = form.watch("startedAt");
  const endedAtValue = form.watch("endedAt");
  const instructionsValue = form.watch("instructions") ?? "";
  const selectedAgent = (agents ?? []).find((agent) => agent.id === agentIdValue);

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
        className="max-w-2xl gap-0 p-0 overflow-hidden rounded-2xl"
      >
        <DialogHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600">
            <VideoIcon className="size-6" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-muted">
              Scheduler
            </p>
            <DialogTitle className="text-lg font-semibold">
              New meeting
            </DialogTitle>
          </div>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="grid gap-6 px-6 py-5 md:grid-cols-2">
              {/* Left column */}
              <div className="space-y-5">
                <Field orientation="vertical">
                  <FieldLabel className="text-sm font-medium text-text mb-2">
                    Meeting name
                  </FieldLabel>
                  <Input
                    {...nameRegisterRest}
                    ref={setNameRef}
                    placeholder="For example: Weekly planning"
                    disabled={createMutation.isPending}
                    maxLength={LIMITS.textCaps.meetingName}
                  />
                  {form.formState.errors.name && (
                    <FieldError errors={[form.formState.errors.name]} />
                  )}
                </Field>

                <Field orientation="vertical">
                  <FieldLabel className="text-sm font-medium text-text mb-2">
                    Agent
                  </FieldLabel>
                  {!agentsLoaded ? (
                    <Select disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="Loading agents..." />
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
                      <SelectTrigger>
                        <div className="flex items-center gap-2">
                          {selectedAgent ? (
                            <GeneratedAvatar
                              seed={selectedAgent.name || selectedAgent.id}
                              className="size-4 rounded-full shrink-0"
                            />
                          ) : (
                            <BotIcon className="size-4 text-text-muted" />
                          )}
                          <SelectValue placeholder="Select an agent" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
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
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
                      <BotIcon className="size-4 text-brand-600 shrink-0" />
                      <p className="text-xs text-text-muted">
                        You have no agents yet.{" "}
                        <Link
                          href="/agents"
                          className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
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
                    <FieldLabel className="text-sm font-medium text-text mb-2">
                      Start
                    </FieldLabel>
                    <Input
                      type="datetime-local"
                      {...form.register("startedAt")}
                      disabled={createMutation.isPending}
                    />
                  </Field>

                  <Field orientation="vertical">
                    <FieldLabel className="text-sm font-medium text-text mb-2">
                      End
                    </FieldLabel>
                    <Input
                      type="datetime-local"
                      {...form.register("endedAt")}
                      aria-invalid={timeRangeInvalid}
                      aria-describedby={
                        timeRangeInvalid ? "new-meeting-end-error" : undefined
                      }
                      disabled={createMutation.isPending}
                    />
                    {timeRangeInvalid && (
                      <p
                        id="new-meeting-end-error"
                        className="mt-2 flex items-center gap-1 text-xs text-danger"
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
                <FieldLabel className="text-sm font-medium text-text mb-2">
                  Instructions (optional)
                </FieldLabel>
                <Textarea
                  {...form.register("instructions")}
                  placeholder="Anything this agent should know for this session"
                  className="flex-1"
                  disabled={createMutation.isPending}
                  maxLength={LIMITS.textCaps.meetingInstructions}
                />
                <span
                  className="mt-2 self-end text-xs tabular-nums text-text-muted"
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

          <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
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
