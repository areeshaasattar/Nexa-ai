import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - Nexa AI",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="mb-4 text-sm text-slate-500">
        <strong>Project-level template.</strong> This document describes data handling based on the
        codebase. It is not legal advice and must be reviewed before production use.
      </p>
      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-semibold mt-6">What we collect</h2>
        <p>
          Account information (name, email, profile image, bio), session metadata (IP address,
          user agent), meeting and agent definitions, conversation messages, voice interaction
          metrics, and optional meeting recordings and transcripts.
        </p>
        <h2 className="text-lg font-semibold mt-6">How it is used</h2>
        <p>
          Data is used to provide the service: authentication, video calls, AI agent responses,
          meeting summaries, and dashboard analytics. Prompts and transcripts are sent to the Mistral
          API for processing, and may be processed by Groq as a fallback provider when Mistral is
          unavailable. Recordings and transcripts are stored and served by Stream Video.
        </p>
        <h2 className="text-lg font-semibold mt-6">Third parties</h2>
        <p>
          Neon (database), Stream Video (video, recording, transcription), Mistral (LLM), Groq (LLM
          fallback), Brevo (email), Upstash (rate limiting), and optionally Sentry (error reporting).
          Each processes data under their own terms.
        </p>
        <h2 className="text-lg font-semibold mt-6">Cookies</h2>
        <p>
          A session cookie is used to keep you signed in. No third-party advertising cookies are
          used.
        </p>
        <h2 className="text-lg font-semibold mt-6">Deletion</h2>
        <p>
          You can delete agents and meetings from the app. Account deletion is not yet automated;
          contact the project maintainer to remove your account and associated data.
        </p>
      </section>
      <p className="mt-8 text-sm">
        <Link href="/" className="text-emerald-600 hover:underline">
          Back to app
        </Link>
      </p>
    </main>
  );
}