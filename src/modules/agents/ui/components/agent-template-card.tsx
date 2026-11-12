"use client";

import { PencilIcon, PlayIcon } from "lucide-react";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AGENT_TEMPLATES, type AgentTemplate } from "@/lib/agent-templates";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6D11] focus-visible:ring-offset-2";

interface AgentTemplateCardProps {
  template: AgentTemplate;
  onTryItNow: (template: AgentTemplate) => void;
  isPending?: boolean;
  /** Hide the Customize action when the template cannot prefill a form. */
  onCustomize?: (template: AgentTemplate) => void;
  variant?: "default" | "compact";
}

export function AgentTemplateCard({
  template,
  onTryItNow,
  isPending = false,
  onCustomize,
  variant = "default",
}: AgentTemplateCardProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-white p-3 transition-colors hover:border-green-200">
        <GeneratedAvatar
          seed={template.name}
          style="bottts"
          size="sm"
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-900">
            {template.name}
          </p>
          <p className="truncate text-xs text-gray-500">
            {template.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={() => onTryItNow(template)}
            disabled={isPending}
            className={cn(
              "h-8 rounded-lg bg-[#3B6D11] px-2.5 text-xs font-medium text-white transition-colors hover:bg-[#2f5a0d]",
              focusRing,
            )}
          >
            <PlayIcon className="size-3" />
            Try it now
          </Button>
          {onCustomize && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onCustomize(template)}
              disabled={isPending}
              className={cn(
                "h-8 rounded-lg border-[#c4d4c4] bg-transparent px-2.5 text-xs font-medium text-gray-600 hover:bg-[#e4ede4]",
                focusRing,
              )}
            >
              <PencilIcon className="size-3" />
              Customize
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-green-100 bg-white p-5 shadow-sm transition-all duration-300 hover:border-green-200 hover:shadow-xl">
      <div className="mb-4 flex items-start gap-3">
        <GeneratedAvatar
          seed={template.name}
          style="bottts"
          size="lg"
          className="shrink-0"
        />
        <div className="min-w-0 pt-1">
          <h3 className="text-base font-bold text-gray-900">{template.name}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            {template.description}
          </p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        <Button
          type="button"
          size="sm"
          onClick={() => onTryItNow(template)}
          disabled={isPending}
          className={cn(
            "h-9 rounded-lg bg-[#3B6D11] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2f5a0d]",
            focusRing,
          )}
        >
          <PlayIcon className="size-3.5" />
          Try it now
        </Button>
        {onCustomize && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onCustomize(template)}
            disabled={isPending}
            className={cn(
              "h-9 rounded-lg border-[#c4d4c4] bg-transparent px-4 text-sm font-medium text-gray-600 hover:bg-[#e4ede4]",
              focusRing,
            )}
          >
            <PencilIcon className="size-3.5" />
            Customize
          </Button>
        )}
      </div>
    </div>
  );
}

interface AgentTemplateGridProps {
  templates?: readonly AgentTemplate[];
  onTryItNow: (template: AgentTemplate) => void;
  isPending?: boolean;
  onCustomize?: (template: AgentTemplate) => void;
  variant?: "default" | "compact";
  className?: string;
}

export function AgentTemplateGrid({
  templates = AGENT_TEMPLATES,
  onTryItNow,
  isPending = false,
  onCustomize,
  variant = "default",
  className,
}: AgentTemplateGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        variant === "compact"
          ? "grid-cols-1"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {templates.map((template) => (
        <AgentTemplateCard
          key={template.id}
          template={template}
          onTryItNow={onTryItNow}
          isPending={isPending}
          onCustomize={onCustomize}
          variant={variant}
        />
      ))}
    </div>
  );
}
