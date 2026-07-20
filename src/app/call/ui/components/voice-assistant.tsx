'use client';

import type { Message } from "@/hooks/use-voice-assistant";
import { Mic, MicOff, Loader2, MessageSquare, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Three-dot typing indicator component
const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-1">
    <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
    <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
    <span className="size-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
  </div>
);

// Agent name – used both in the header and as a label
const AGENT_NAME = 'Nexa AI';

interface VoiceAssistantProps {
  messages: Message[];
  isListening: boolean;
  isProcessing: boolean;
  onStartListening: () => void;
}

export const VoiceAssistant = ({
  messages,
  isListening,
  isProcessing,
  onStartListening,
}: VoiceAssistantProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isProcessing, isListening]);

  // Check if we should show the typing indicator
  const showTyping =
    isProcessing &&
    messages.length > 0 &&
    messages[messages.length - 1].role === 'user';

  return (
    <div className={cn(
      "h-full flex flex-col transition-all duration-300 ease-in-out relative",
      isOpen ? 'w-80' : 'w-0 overflow-hidden'
    )}>
      {/* Toggle button (visible when panel is hidden) */}
      {!isOpen && (
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute -left-12 top-4 rounded-full shadow-lg border border-slate-200 bg-white text-emerald-600 hover:bg-slate-50 z-10"
          onClick={() => setIsOpen(true)}
        >
          <MessageSquare className="size-4" />
        </Button>
      )}

      <div className="flex-1 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-2xl min-h-0">
        {/* ---- Header ---- */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h3 className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
              {AGENT_NAME} Assistant
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && <Loader2 className="size-3 animate-spin text-emerald-600" />}
            <Button 
              variant="ghost" 
              size="icon" 
              className="size-6 text-slate-400 hover:text-slate-600"
              onClick={() => setIsOpen(false)}
            >
              <X className="size-3" />
            </Button>
          </div>
        </div>

        {/* ---- Messages (scrollable) ---- */}
        <ScrollArea ref={scrollRef} className="flex-1 min-h-0 bg-white">
          <div className="flex flex-col gap-3 p-4">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="size-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <MessageSquare className="size-6 text-emerald-500" />
                </div>
                <p className="text-xs text-slate-500 font-medium max-w-[160px]">
                  Click the button below and start talking to your AI agent.
                </p>
              </div>
            )}

            {/* Message bubbles */}
            {messages.map((m, i) => (
              <div key={i} className={cn(
                'flex flex-col gap-1',
                m.role === 'user' ? 'items-end' : 'items-start'
              )}>
                {/* Label */}
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1
                  text-slate-400">
                  {m.role === 'user' ? (
                    <><User className="size-2.5" /> You</>
                  ) : (
                    <><Bot className="size-2.5" /> {AGENT_NAME}</>
                  )}
                </span>
                {/* Bubble */}
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none shadow-md shadow-emerald-200' 
                    : 'bg-slate-100 text-slate-700 rounded-tl-none border border-slate-200/50'
                )}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Typing indicator (AI is thinking) */}
            {showTyping && (
              <div className="flex flex-col gap-1 items-start">
                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1 text-slate-400">
                  <Bot className="size-2.5" /> {AGENT_NAME}
                </span>
                <div className="max-w-[85%] rounded-2xl rounded-tl-none px-4 py-3 bg-slate-100 border border-slate-200/50">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {/* Listening indicator */}
            {isListening && !isProcessing && (
              <div className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-tighter animate-pulse px-1 self-start">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Listening to you...
              </div>
            )}

            {/* Invisible anchor for auto-scroll */}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* ---- Pinned bottom area (not scrollable) ---- */}
        <div className="shrink-0 px-4 py-3 bg-white border-t border-slate-100">
          <Button 
            onClick={onStartListening} 
            disabled={isListening || isProcessing}
            className={cn(
              'w-full rounded-xl gap-3 h-12 text-sm font-bold transition-all shadow-lg',
              isListening 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white shadow-red-200' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
            )}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
            {isListening ? 'Listening...' : 'Push to Talk'}
          </Button>
          <p className="mt-2 text-[9px] text-center text-slate-400 font-medium uppercase tracking-widest">
            Powered by Nexa AI Core
          </p>
        </div>
      </div>
    </div>
  );
};
