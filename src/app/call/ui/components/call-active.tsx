'use client';

import { 
  SpeakerLayout, 
  CallControls,
  useCall,
  CallingState,
} from '@stream-io/video-react-sdk';
import { VoiceAssistant } from './voice-assistant';
import { useParams } from 'next/navigation';
import { GeneratedAvatar } from '@/components/generated-avatar';
import { useVoiceAssistant } from '@/hooks/use-voice-assistant';
import { trpc } from '@/trpc/client';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';

// Waveform bars that animate when the AI is speaking
const Waveform = () => (
  <div className="flex items-end gap-[3px] h-6">
    {[1, 2, 3, 4, 3, 2, 1].map((h, i) => (
      <span
        key={i}
        className="block w-[3px] bg-emerald-400 rounded-full animate-pulse"
        style={{
          height: `${h * 5}px`,
          animationDelay: `${i * 100}ms`,
          animationDuration: '800ms',
        }}
      />
    ))}
  </div>
);

export const CallActive = () => {
  const call = useCall();
  const params = useParams();
  const meetingId = params.meetingId as string;

  // --- Single source of truth for voice state ---
  const { data: meeting } = trpc.meetings.getOne.useQuery(
    { id: meetingId },
    { refetchOnWindowFocus: false },
  );
  const voice = useVoiceAssistant({ agentId: meeting?.agentId, meetingId });
  const { isListening, isProcessing, messages, startListening, stopListening, sendTextMessage, voiceEnabled, setVoiceEnabled, speakingMessageId, speakMessage, stopSpeaking, speechSupported } = voice;

  // Fire-and-forget mutation: end the call on the server so summary is generated
  // even when the Stream webhook can't reach localhost.
  const endCallMutation = trpc.meetings.endCall.useMutation();

  const isAgentSpeaking = speakingMessageId !== null;
  const isAgentListening = isListening && !isProcessing;

  // --- Assistant sidebar open state (lifted) ---
  const [assistantOpen, setAssistantOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = window.localStorage.getItem("nexa.assistant.open");
      const defaultOpen = window.innerWidth >= 1024;
      return stored === null ? defaultOpen : stored === "true";
    } catch {
      return window.innerWidth >= 1024;
    }
  });
  const [hasUnread, setHasUnread] = useState(false);

  // Stop speech recognition when the sidebar closes.
  useEffect(() => {
    if (!assistantOpen && isListening) {
      stopListening();
    }
  }, [assistantOpen, isListening, stopListening]);

  // Track unread AI messages while closed.
  const prevMsgCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCount.current && !assistantOpen) {
      setHasUnread(true);
    }
    prevMsgCount.current = messages.length;
  }, [messages, assistantOpen]);

  const toggleAssistant = () => {
    setAssistantOpen((prev) => {
      const next = !prev;
      if (typeof window !== "undefined" && window.innerWidth >= 1024) {
        try {
          window.localStorage.setItem("nexa.assistant.open", String(next));
        } catch {
          // ignore
        }
      }
      if (next) setHasUnread(false);
      return next;
    });
  };

  const openAssistant = () => {
    setAssistantOpen(true);
    setHasUnread(false);
  };

  const closeAssistant = () => setAssistantOpen(false);

  return (
    <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden">
      {/* ---- Left: Video Area ---- */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top-left LIVE RELAY badge */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200 rounded-full shadow-sm">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Live Relay</span>
        </div>

        {/* Video + AI tile side by side */}
        <div className="flex-1 flex gap-2 p-3 min-h-0">
          {/* User video tile */}
          <div className="flex-1 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative min-w-0">
            <div className="h-full w-full [&_.str-video__speaker-layout]:!bg-transparent [&_.str-video__speaker-layout]:!text-white">
              <SpeakerLayout />
            </div>
            {/* Label overlay */}
            <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/50 rounded-lg backdrop-blur-sm">
              <span className="text-[10px] font-semibold text-white/90">You</span>
            </div>
          </div>

          {/* AI agent tile */}
          <div className={cn(
            'flex-1 rounded-2xl overflow-hidden relative flex flex-col items-center justify-center gap-3 min-w-0 transition-all duration-500',
            isAgentSpeaking 
              ? 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border-2 border-emerald-300' 
              : isAgentListening
                ? 'bg-gradient-to-br from-sky-50 via-white to-sky-100 border border-sky-200'
                : 'bg-slate-50 border border-slate-200'
          )}>
            {/* Glow ring when speaking */}
            {isAgentSpeaking && (
              <div className="absolute inset-0 rounded-2xl ring-[3px] ring-emerald-400/40 ring-offset-2 ring-offset-white animate-pulse" />
            )}
            {isAgentListening && (
              <div className="absolute inset-0 rounded-2xl ring-[2px] ring-sky-400/20" />
            )}

            {/* Avatar */}
            <div className={cn(
              'relative transition-transform duration-300',
              isAgentSpeaking && 'scale-110'
            )}>
              <GeneratedAvatar
                seed="nexa-ai-agent"
                style="bottts"
                size="lg"
                className={cn(
                  'ring-4 transition-all duration-500',
                  isAgentSpeaking 
                    ? 'ring-emerald-400/60 shadow-lg shadow-emerald-200/50' 
                    : isAgentListening
                      ? 'ring-sky-400/40'
                      : 'ring-slate-300'
                )}
              />
              {/* Status dot */}
              <div className={cn(
                'absolute -bottom-1 -right-1 size-4 rounded-full border-2 border-white transition-all duration-300',
                isAgentSpeaking 
                  ? 'bg-emerald-500 shadow-lg shadow-emerald-300/50' 
                  : isAgentListening
                    ? 'bg-sky-500 animate-pulse'
                    : 'bg-slate-400'
              )} />
            </div>

            {/* Agent name */}
            <div className="text-center">
              <h2 className="text-sm font-bold text-slate-800">Nexa AI</h2>
              <p className={cn(
                'text-[10px] font-semibold uppercase tracking-wider mt-0.5 transition-colors duration-300',
                isAgentSpeaking ? 'text-emerald-600' : isAgentListening ? 'text-sky-600' : 'text-slate-400'
              )}>
                {isAgentSpeaking ? 'Speaking' : isAgentListening ? 'Listening' : 'Ready'}
              </p>
            </div>

            {/* Waveform when speaking */}
            {isAgentSpeaking && <Waveform />}
          </div>
        </div>

        {/* Call controls (centered at bottom of video area) */}
        <div className="flex justify-center pb-4 shrink-0">
          <div className="flex items-center gap-2 p-2 bg-slate-100/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl">
            <CallControls onLeave={() => {
            // 1. Immediately stop any AI speech from continuing after the call ends
            window.speechSynthesis.cancel();
            // 2. Guard against double-leave error
            if (call && call.state.callingState !== CallingState.LEFT) {
              call.leave();
            }
            // 3. Fire-and-forget: update server status + trigger summary generation.
            //    This works even when the Stream webhook can't reach localhost.
            //    The meeting detail page polls every 5s via refetchInterval,
            //    so the summary will appear shortly without a manual refresh.
            endCallMutation.mutate({ id: meetingId });
          }} />
            <button
              type="button"
              onClick={toggleAssistant}
              aria-label={assistantOpen ? "Close assistant" : "Open assistant"}
              aria-pressed={assistantOpen}
              title={assistantOpen ? "Close assistant" : "Open assistant"}
              className="relative inline-flex items-center justify-center size-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <MessageSquare className="size-4" />
              {hasUnread && !assistantOpen && (
                <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-green-500 ring-2 ring-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Right: Voice Assistant Sidebar (desktop, always mounted) ---- */}
      <div
        className={cn(
          "hidden lg:flex h-full transition-all duration-300 ease-in-out overflow-hidden",
          assistantOpen ? "w-64 sm:w-80" : "w-0"
        )}
        aria-hidden={!assistantOpen}
        inert={!assistantOpen ? true : undefined}
      >
        <VoiceAssistant
          messages={messages}
          isListening={isListening}
          isProcessing={isProcessing}
          onStartListening={startListening}
          onStopListening={stopListening}
          onSendText={sendTextMessage}
          onClose={closeAssistant}
          voiceEnabled={voiceEnabled}
          onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
          speakingMessageId={speakingMessageId}
          speechSupported={speechSupported}
          onSpeakMessage={speakMessage}
          onStopSpeaking={stopSpeaking}
        />
      </div>

      {/* ---- Mobile: floating reopen button + drawer ---- */}
      <button
        type="button"
        onClick={openAssistant}
        aria-label="Open assistant"
        className="lg:hidden fixed bottom-20 right-4 z-30 inline-flex items-center justify-center size-12 rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <MessageSquare className="size-5" />
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-green-400 ring-2 ring-white" />
        )}
      </button>

      <div className="lg:hidden">
        <Sheet open={assistantOpen} onOpenChange={setAssistantOpen}>
          <SheetContent side="right" className="w-80 sm:max-w-sm p-0">
            <VoiceAssistant
              messages={messages}
              isListening={isListening}
              isProcessing={isProcessing}
              onStartListening={startListening}
              onStopListening={stopListening}
              onSendText={sendTextMessage}
              onClose={closeAssistant}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
              speakingMessageId={speakingMessageId}
              speechSupported={speechSupported}
              onSpeakMessage={speakMessage}
              onStopSpeaking={stopSpeaking}
            />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};
