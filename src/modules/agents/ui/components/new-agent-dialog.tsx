"use client";

import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { agentsInsertSchema } from "../../schemas";
import { z } from "zod";
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/agent-templates";
import { AgentTemplateGrid } from "./agent-template-card";
import { useQuickStart } from "../hooks/use-quick-start";

const formSchema = agentsInsertSchema.omit({ userId: true });
type FormValues = z.infer<typeof formSchema>;

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the form is prefilled from this template on open. */
  initialTemplate?: AgentTemplate | null;
}

export const NewAgentDialog = ({
  open,
  onOpenChange,
  initialTemplate,
}: NewAgentDialogProps) => {
  const utils = trpc.useUtils();
  const quickStart = useQuickStart();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      instruction: "",
    },
  });

  const agentName = useWatch({
    control: form.control,
    name: "name",
    defaultValue: "",
  });

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      toast.success("Agent deployed successfully.");
      form.reset();
      onOpenChange(false);
      utils.agents.getMany.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Prefill when opened from an empty-state Customize action.
  useEffect(() => {
    if (!open || !initialTemplate) return;
    form.setValue("name", initialTemplate.name, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("instruction", initialTemplate.instruction, {
      shouldValidate: true,
      shouldDirty: true,
    });
    requestAnimationFrame(() => form.setFocus("name"));
  }, [open, initialTemplate, form]);

  const handleCustomize = (template: AgentTemplate) => {
    form.setValue("name", template.name, {
      shouldValidate: true,
      shouldDirty: true,
    });
    form.setValue("instruction", template.instruction, {
      shouldValidate: true,
      shouldDirty: true,
    });
    requestAnimationFrame(() => form.setFocus("name"));
  };

  const handleTryItNow = (template: AgentTemplate) => {
    quickStart.start(template);
    onOpenChange(false);
  };

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-[420px] p-0 rounded-2xl
          border border-brand-100 bg-white shadow-xl

          /* Overlay fade */
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0

          /* Scale + slide up on open, scale + slide down on close */
          data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95
          data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2

          duration-200 ease-out
        "
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-brand-100">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-brand-100 border border-brand-200 flex items-center justify-center overflow-hidden">
              <GeneratedAvatar
                seed={agentName || "Agent"}
                style="bottts"
                className="w-8 h-8"
              />
            </div>
            <DialogHeader className="p-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400">
                New agent
              </p>
              <DialogTitle className="text-base font-semibold text-brand-950 leading-tight">
                Deploy agent
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        {/* Start from a template */}
        <div className="px-6 pt-5 pb-5 border-b border-brand-100 bg-brand-50">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-400 mb-3">
            Start from a template
          </p>
          <div className="max-h-[232px] overflow-y-auto pr-1">
            <AgentTemplateGrid
              templates={AGENT_TEMPLATES}
              onTryItNow={handleTryItNow}
              isPending={quickStart.isPending}
              onCustomize={handleCustomize}
              variant="compact"
            />
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="px-6 pt-5 pb-8 space-y-4 bg-white">
            <Field orientation="vertical">
              <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                Agent name
              </FieldLabel>
              <Input
                {...form.register("name")}
                placeholder="e.g. Nexus-1 Core"
                className="h-10 rounded-lg border border-brand-300 bg-gray-50 text-sm focus:bg-white focus:border-brand-800 focus:ring-1 focus:ring-brand-800/20 transition-colors placeholder:text-gray-400"
                disabled={createMutation.isPending}
              />
              {form.formState.errors.name && (
                <FieldError errors={[form.formState.errors.name]} />
              )}
            </Field>

            <Field orientation="vertical">
              <FieldLabel className="text-xs font-medium text-gray-500 mb-1.5">
                Instructions
              </FieldLabel>
              <Textarea
                {...form.register("instruction")}
                placeholder="What is this agent's primary mission?"
                className="min-h-[108px] rounded-lg border border-brand-300 bg-gray-50 text-sm resize-none focus:bg-white focus:border-brand-800 focus:ring-1 focus:ring-brand-800/20 transition-colors placeholder:text-gray-400"
                disabled={createMutation.isPending}
              />
              {form.formState.errors.instruction && (
                <FieldError errors={[form.formState.errors.instruction]} />
              )}
            </Field>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-6 border-t border-brand-100 bg-brand-50 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border-brand-200 bg-transparent text-gray-600 hover:bg-brand-100 text-sm h-9 px-4"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-lg bg-brand-800 hover:bg-brand-900 text-white text-sm font-medium h-9 px-5 transition-colors"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Deploying…" : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
