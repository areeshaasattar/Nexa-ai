"use client";

import React from "react";
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

const formSchema = agentsInsertSchema.omit({ userId: true });
type FormValues = z.infer<typeof formSchema>;

interface NewAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewAgentDialog = ({ open, onOpenChange }: NewAgentDialogProps) => {
  const utils = trpc.useUtils();

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

  const onSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          sm:max-w-[420px] p-0 overflow-hidden rounded-2xl
          border border-[#d4e0d4] bg-white shadow-xl

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
        <div className="px-6 pt-6 pb-5 border-b border-[#d4e0d4]">
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-11 h-11 rounded-xl bg-[#e2ede2] border border-[#c4d8c4] flex items-center justify-center overflow-hidden">
              <GeneratedAvatar
                seed={agentName || "Agent"}
                style="bottts"
                className="w-8 h-8"
              />
            </div>
            <DialogHeader className="p-0 space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6a9a6a]">
                New agent
              </p>
              <DialogTitle className="text-base font-semibold text-[#1a2e1a] leading-tight">
                Deploy agent
              </DialogTitle>
            </DialogHeader>
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
                className="h-10 rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400"
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
                className="min-h-[108px] rounded-lg border border-[#a8c8a8] bg-gray-50 text-sm resize-none focus:bg-white focus:border-[#3B6D11] focus:ring-1 focus:ring-[#3B6D11]/20 transition-colors placeholder:text-gray-400"
                disabled={createMutation.isPending}
              />
              {form.formState.errors.instruction && (
                <FieldError errors={[form.formState.errors.instruction]} />
              )}
            </Field>
          </div>

          {/* Footer */}
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
              {createMutation.isPending ? "Deploying…" : "Deploy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
