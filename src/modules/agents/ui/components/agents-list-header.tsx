"use client";

import React, { useState } from "react";
import { PlusIcon, BotIcon, BookOpenIcon, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
  return (
    <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-green-700">
          {title}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold text-green-700 transition-colors hover:bg-green-100"
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
      <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-gray-700">
        {text}
      </pre>
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
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative size-14 rounded-2xl bg-white flex items-center justify-center border border-green-100 shadow-sm transition-transform group-hover:scale-105">
              <BotIcon className="size-7 text-green-600" />
              <div className="absolute -top-1 -right-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
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
            className="rounded-xl h-11 px-6 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20 transition-all active:scale-95 flex items-center gap-2"
          >
            <PlusIcon className="size-5" />
            <span>Create Agent</span>
          </Button>
        </div>
      </div>

      <Sheet open={guideOpen} onOpenChange={setGuideOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Writing good agent instructions</SheetTitle>
            <SheetDescription>
              The instruction becomes the agent&apos;s system prompt in every meeting.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-4 px-4 pb-4">
            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-green-950">Role</h3>
              <p className="text-sm text-gray-600">
                Who the agent is and what it is responsible for.
              </p>
            </section>
            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-green-950">Tone</h3>
              <p className="text-sm text-gray-600">
                How it speaks: friendly, formal, concise, encouraging, etc.
              </p>
            </section>
            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-green-950">Rules</h3>
              <p className="text-sm text-gray-600">
                What it must or must not do (boundaries, topics to avoid).
              </p>
            </section>
            <section className="space-y-1">
              <h3 className="text-sm font-semibold text-green-950">Voice tips</h3>
              <p className="text-sm text-gray-600">
                In live calls keep answers short, one idea per reply, avoid long
                lists.
              </p>
            </section>

            <div className="flex flex-col gap-3 pt-2">
              {EXAMPLES.map((example) => (
                <ExampleBlock
                  key={example.title}
                  title={example.title}
                  text={example.text}
                />
              ))}
            </div>

            <Button
              className="mt-2 w-full rounded-xl bg-green-600 text-white hover:bg-green-700"
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
