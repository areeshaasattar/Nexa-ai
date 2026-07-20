'use client';

import { useEffect } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const CallEnded = () => {
  // Safety net: cancel any AI speech still queued when the ended screen mounts
  useEffect(() => {
    window.speechSynthesis.cancel();
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-10 shadow-2xl">
        <div className="size-20 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-500">
          <CheckCircle2 className="size-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Mission Completed</h2>
        <p className="text-slate-500 text-sm mb-8">
          You have successfully left the relay session. The AI operative is now processing the transcripts.
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-100">
            <Link href="/meetings">
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="ghost" asChild className="w-full h-12 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 font-bold transition-all">
            <Link href="/">
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
