'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { trpc } from "@/trpc/client";

export interface Message {
  role: 'user' | 'ai';
  content: string;
}

interface UseVoiceAssistantProps {
  agentId?: string;
  meetingId?: string;
}

// Strips markdown formatting and emojis so speechSynthesis doesn't read
// out symbols like "hashtag", "asterisk", or emoji names.
function sanitizeForSpeech(text: string): string {
  return text
    // remove markdown headings (###, ##, #)
    .replace(/#{1,6}\s?/g, '')
    // remove bold/italic markers (**text**, *text*, __text__, _text_)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // remove markdown links, keep the label: [text](url)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // remove inline code / code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // remove bullet/list markers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // remove emojis (covers most common ranges)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, '')
    // collapse extra whitespace/newlines left behind
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const useVoiceAssistant = ({ agentId, meetingId }: UseVoiceAssistantProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const saveMessageMutation = trpc.meetings.saveMessage.useMutation();
  const logInteractionMutation = trpc.meetings.logVoiceInteraction.useMutation();
  
  const recognitionRef = useRef<any>(null);
  const processingStartRef = useRef<number>(0);

  // Fire-and-forget persist helper
  const persistMessage = useCallback((role: 'user' | 'ai', content: string) => {
    if (!meetingId) return;
    saveMessageMutation.mutate({ meetingId, role, content });
  }, [meetingId, saveMessageMutation]);

  // Fire-and-forget interaction logging helper
  const logInteraction = useCallback((duration: number, responseTime: number) => {
    if (!meetingId) return;
    logInteractionMutation.mutate({
      meetingId,
      duration: String(Math.round(duration)),
      responseTime: String(Math.round(responseTime)),
    });
  }, [meetingId, logInteractionMutation]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
        setIsListening(false);
        // Record when processing starts — used to compute responseTime
        processingStartRef.current = performance.now();
        await handleSend(text);
      };

      recognitionRef.current.onerror = (event: any) => {
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
    };
  }, []);

  const speak = (text: string) => {
    if (typeof window === 'undefined') return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = sanitizeForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Optional: customize voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        // Try to find a nice female voice or just use default
        utterance.voice = voices.find(v => v.name.includes('Google') || v.name.includes('Female')) || voices[0];
    }

    window.speechSynthesis.speak(utterance);
  };

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening && !isProcessing) {
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

  const handleSend = async (text: string) => {
    if (!text || isProcessing || !agentId) return;

    setIsProcessing(true);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    persistMessage('user', text);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, agentId }),
      });

      const data = await response.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: 'ai', content: data.response }]);
        persistMessage('ai', data.response);
        speak(data.response);

        // Log voice interaction for dashboard metrics (fire-and-forget)
        const responseTime = performance.now() - processingStartRef.current;
        // Estimate duration from AI response text length (rough: ~2.5 words/sec speaking rate)
        const wordCount = data.response.split(/\s+/).length;
        const estimatedDuration = wordCount / 2.5;
        logInteraction(estimatedDuration, responseTime);
      } else if (data.error) {
          console.error('AI Error:', data.error);
          setMessages((prev) => [...prev, { role: 'ai', content: `Error: ${data.error}` }]);
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isListening,
    isProcessing,
    transcript,
    messages,
    startListening,
    speak,
  };
};