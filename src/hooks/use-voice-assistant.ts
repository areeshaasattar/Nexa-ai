'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

export interface Message {
  role: 'user' | 'ai';
  content: string;
  id?: string;
}

interface UseVoiceAssistantProps {
  agentId?: string;
  meetingId?: string;
}

type InputMode = 'voice' | 'text';

/*
 * Minimal typings for the Web Speech API (`SpeechRecognition` is not in all
 * TS lib targets, and the vendor-prefixed `webkitSpeechRecognition` never is).
 * Only the members this hook touches are declared.
 */
interface SpeechRecognitionResultLike {
  [index: number]: { [index: number]: { transcript: string } };
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike;
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

// Strips markdown formatting and emojis so speechSynthesis doesn't read
// out symbols like "hashtag", "asterisk", or emoji names.
function sanitizeForSpeech(text: string): string {
  return text
    // remove fenced code blocks entirely (code is shown on screen, not spoken)
    .replace(/```[\s\S]*?```/g, "")
    // convert markdown links to their label text: [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // remove markdown headings (###, ##, #)
    .replace(/#{1,6}\s?/g, "")
    // remove bold/italic markers (**text**, *text*, __text__, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    // remove inline code backticks
    .replace(/`([^`]+)`/g, "$1")
    // remove bullet/list markers
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // remove emojis (covers most common ranges)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "")
    // collapse extra whitespace/newlines left behind
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export const useVoiceAssistant = ({ agentId, meetingId }: UseVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const [voiceEnabled, setVoiceEnabledState] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem("nexa.assistant.voice");
      return stored === null ? true : stored === "true";
    } catch {
      return true;
    }
  });
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
  );

  const logInteractionMutation = trpc.meetings.logVoiceInteraction.useMutation();

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const processingStartRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const ttsBufferRef = useRef<string>("");
  const ttsQueueRef = useRef<string[]>([]);
  const ttsSpeakingRef = useRef<boolean>(false);
  const currentAiIdRef = useRef<string | null>(null);

  // Fire-and-forget interaction logging helper
  const logInteraction = useCallback((duration: number, responseTime: number) => {
    if (!meetingId) return;
    logInteractionMutation.mutate({
      meetingId,
      duration: String(Math.round(duration)),
      responseTime: String(Math.round(responseTime)),
    });
  }, [meetingId, logInteractionMutation]);

  // Speech helpers (single place that calls speechSynthesis.speak)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setSpeakingMessageId(null);
  }, []);

  const speakMessage = useCallback((id: string, text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const clean = sanitizeForSpeech(text);
    if (!clean) {
      setSpeakingMessageId(null);
      return;
    }
    // cancel any current speech first
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utteranceRef.current = utterance;
    setSpeakingMessageId(id);
    utterance.onstart = () => setSpeakingMessageId(id);
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);
    window.speechSynthesis.speak(utterance);
  }, []);

  const setVoiceEnabled = useCallback(
    (value: boolean) => {
      setVoiceEnabledState(value);
      if (!value) stopSpeaking();
      try {
        localStorage.setItem("nexa.assistant.voice", String(value));
      } catch {
        // ignore
      }
    },
    [stopSpeaking],
  );

  // Gracefully stop an open mic. Used when the user starts typing so voice and
  // typed input never fire at the same time.
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Failed to stop recognition:', e);
      }
    }
    setIsListening(false);
  }, []);

  /**
   * The shared core pipeline. Both input modes — push-to-talk (`recognition`
   * onresult) and typed input — call through here so a spoken and a typed
   * message are handled identically (POST /api/chat, save messages, speak the
   * reply).
   */
  const requestAssistant = useCallback(
    async (text: string, mode: InputMode) => {
      if (!text || !text.trim() || isProcessing || !agentId) return;

      setTranscript('');
      setIsProcessing(true);
      setMessages((prev) => [...prev, { role: 'user', content: text }]);
      stopSpeaking();
      const t0 = performance.now();
      processingStartRef.current = t0;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: text, agentId, meetingId }),
          signal: controller.signal,
        });

        if (response.status === 429) {
          toast.error("You're sending messages too fast", {
            description: "Please wait a moment before trying again.",
          });
          setMessages((prev) => [
            ...prev,
            { role: 'ai', content: "Message rate limit hit — give me a few seconds, then try again." },
          ]);
          return;
        }

        if (!response.ok || !response.body) {
          let errMsg = "Request failed";
          try {
            const d = await response.json();
            if (d?.code === 'AI_PROVIDER_RATE_LIMITED') {
              toast.error("AI service is temporarily rate-limited", {
                description: "Please wait before retrying.",
              });
              errMsg = "The AI service is temporarily rate-limited. Please wait a moment and try again.";
            } else if (d?.error) {
              errMsg = d.error;
            }
          } catch { /* ignore */ }
          setMessages((prev) => [...prev, { role: 'ai', content: `Error: ${errMsg}` }]);
          return;
        }

        const aiId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;

        setMessages((prev) => [...prev, { role: 'ai', content: "", id: aiId }]);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let firstByteLogged = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!firstByteLogged) {
              firstByteLogged = true;
              console.log(JSON.stringify({ event: 'voice.ttfb', ms: Math.round(performance.now() - t0) }));
            }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data:")) continue;
              const dataStr = trimmed.slice(5).trim();
              if (!dataStr) continue;
              let evt: { type: string; text?: string; message?: string };
              try { evt = JSON.parse(dataStr); } catch { continue; }
              if (evt.type === "delta" && evt.text) {
                fullText += evt.text;
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiId ? { ...m, content: fullText } : m)),
                );
              } else if (evt.type === "error") {
                toast.error(evt.message || "Stream failed");
                setMessages((prev) =>
                  prev.map((m) => (m.id === aiId ? { ...m, content: `Error: ${evt.message}` } : m)),
                );
              }
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (fullText) {
          if (voiceEnabled) {
            speakMessage(aiId, fullText);
          }
          const responseTime = performance.now() - processingStartRef.current;
          if (mode === 'voice') {
            const wordCount = fullText.split(/\s+/).length;
            const estimatedDuration = wordCount / 2.5;
            logInteraction(estimatedDuration, responseTime);
          } else {
            logInteraction(0, responseTime);
          }
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        console.error('Failed to get AI response:', error);
        setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I encountered an error.' }]);
      } finally {
        abortControllerRef.current = null;
        setIsProcessing(false);
      }
    },
    [isProcessing, agentId, logInteraction, voiceEnabled, speakMessage, stopSpeaking],
  );

  // Latest-ref: the SpeechRecognition effect is registered once ([] deps) but we
  // always want it to call the CURRENT requestAssistant closure (which reflects
  // the latest isProcessing / agentId) rather than a stale first-render one.
  const requestRef = useRef(requestAssistant);
  useEffect(() => {
    requestRef.current = requestAssistant;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: SpeechRecognitionEventLike) => {
        const text = event.results[0][0].transcript;
        if (!text || !text.trim()) return;
        setTranscript(text);
        setIsListening(false);
        // Record when processing starts — used to compute responseTime
        processingStartRef.current = performance.now();
        await requestRef.current(text, 'voice');
      };

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEventLike) => {
        console.error('Speech Recognition Error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
        console.warn('Speech Recognition API not supported in this browser.');
    }
  }, []);

  // Cleanup: cancel speechSynthesis on unmount so AI doesn't keep talking
  // after leaving the call or navigating away
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    // Cancel any in-flight request before starting a new one.
    abortControllerRef.current?.abort();
    if (recognitionRef.current && !isListening && !isProcessing) {
      // Stop any AI speech before capturing mic input.
      stopSpeaking();
      // Stop synthesis if it's speaking
      window.speechSynthesis.cancel();

      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    }
  }, [isListening, isProcessing]);

  /**
   * Send a typed message through the same pipeline as push-to-talk.
   * Stops any in-progress mic capture first so the two input modes can't
   * overlap.
   */
  const sendTextMessage = useCallback(
    (text: string) => {
      const trimmed = (text ?? '').trim();
      if (!trimmed) return;
      abortControllerRef.current?.abort();
      stopListening();
      // A typed reply supersedes whatever the mic was hearing; stop speech too.
      window.speechSynthesis.cancel();
      requestAssistant(trimmed, 'text');
    },
    [requestAssistant, stopListening],
  );

  return {
    isListening,
    isProcessing,
    transcript,
    messages,
    startListening,
    stopListening,
    sendTextMessage,
    voiceEnabled,
    setVoiceEnabled,
    speakingMessageId,
    speakMessage,
    stopSpeaking,
    speechSupported,
  };
};