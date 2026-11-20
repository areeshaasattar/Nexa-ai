"use client";

import React, { useState } from "react";
import { PlusIcon, BotIcon, BookOpenIcon, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";

interface AgentsListHeaderProps {
  onOpenDialog: () => void;
}

const EXAMPLES = [
  {
    title: "Coding mentor",
    text:
      "Role: You are a patient coding mentor helping a junior developer.\n" +
      "Tone: Encouraging, clear, and concise.\n" +
      "Rules: Always explain the 'why', not just the 'what'. Point out one improvement at a time. Never write the full solution unless asked.\n" +
      "Answer length: Keep replies under 4 sentences; use short code snippets only when needed.",
  },
  {
    title: "Meeting note-taker",
    text:
      "Role: You are a meeting assistant that captures decisions and action items.\n" +
      "Tone: Neutral, precise, and structured.\n" +
      "Rules: Summarize key decisions, list action items with owners, flag open questions. Do not invent details.\n" +
      "Answer length: 3-5 bullet points max per reply.",
  },
];

const ExampleBlock = ({ title, text }: { title: string; text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };
  
  // Parse the text into structured lines
  const lines = text.split('\n').filter(line => line.trim());
  
  return (
    <div className="rounded-xl border border-border/60 bg-brand-50 p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {title}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
        >
          {copied ? (
            <>
              <Check className="size-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-3" /> Copy
            </>
          )}
        </button>
      </div>
      <div className="space-y-1.5 text-sm leading-relaxed text-text">
        {lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
};

const AgentsListHeader = ({ onOpenDialog }: AgentsListHeaderProps) => {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-gray-100">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-brand-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative size-14 rounded-2xl bg-white flex items-center justify-center border border-brand-100 shadow-sm transition-transform group-hover:scale-105">
              <BotIcon className="size-7 text-brand-600" />
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-500"></span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              Agents
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              Manage and deploy your autonomous AI workforce across the Nexa
              network.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl h-11 px-5 font-bold border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-all flex items-center gap-2"
            onClick={() => setGuideOpen(true)}
          >
            <BookOpenIcon className="size-4" />
            <span className="hidden sm:inline">Instruction guide</span>
          </Button>
          <Button
            onClick={onOpenDialog}
            className="rounded-xl h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-700/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusIcon className="size-5" />
            <span>Create Agent</span>
          </Button>
        </div>
      </div>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md max-w-full border-l border-border/60 shadow-2xl p-0 gap-0 flex h-dvh flex-col"
          showCloseButton={false}
        >
          {/* Fixed Header */}
          <div className="shrink-0 px-6 pt-5 pb-5 border-b border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-text">
                  Writing good agent instructions
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  The instruction becomes the agent&apos;s system prompt in every meeting.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                aria-label="Close instruction guide"
                className="size-9 shrink-0 rounded-lg hover:bg-brand-100 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30"
              >
                <svg className="size-5 text-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div 
            className="flex-1 overflow-y-auto px-6 py-6 relative"
            style={{ scrollbarGutter: 'stable' }}
          >
            <div className="space-y-6 pb-8 [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              <section>
                <h3 className="text-sm font-semibold text-brand-900">Role</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  Who the agent is and what it is responsible for.
                </p>
              </section>
              
              <section>
                <h3 className="text-sm font-semibold text-brand-900">Tone</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  How it speaks: friendly, formal, concise, encouraging, etc.
                </p>
              </section>
              
              <section>
                <h3 className="text-sm font-semibold text-brand-900">Rules</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  What it must or must not do (boundaries, topics to avoid).
                </p>
              </section>
              
              <section>
                <h3 className="text-sm font-semibold text-brand-900">Voice tips</h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  In live calls keep answers short, one idea per reply, avoid long lists.
                </p>
              </section>

              <div className="space-y-4 pt-2">
                {EXAMPLES.map((example) => (
                  <ExampleBlock
                    key={example.title}
                    title={example.title}
                    text={example.text}
                  />
                ))}
              </div>
            </div>
            
            {/* Fade gradient above footer */}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-border/60 bg-white px-6 pt-4 pb-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <Button
              className="h-11 w-full rounded-xl px-5 text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={() => {
                setGuideOpen(false);
                onOpenDialog();
              }}
            >
              Create agent with an example
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AgentsListHeader;
