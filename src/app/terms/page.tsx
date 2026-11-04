import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - Nexa AI",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-slate-800">
      <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
      <p className="mb-4 text-sm text-slate-500">
        <strong>Project-level template.</strong> This document describes how Nexa AI works based on
        the codebase. It is not legal advice and must be reviewed before production use.
      </p>
      <section className="space-y-4 text-sm leading-relaxed">
        <p>
          Nexa AI is a platform that combines real-time video conferencing with an AI voice
          assistant. By creating an account, you agree to use the service responsibly and to comply
          with applicable laws.
        </p>
        <h2 className="text-lg font-semibold mt-6">Accounts</h2>
        <p>
          You are responsible for keeping your credentials secure. Accounts are created with email
          and password or via GitHub/Google OAuth. Email verification is required before sign-in.
        </p>
        <h2 className="text-lg font-semibold mt-6">Content and recordings</h2>
        <p>
          Meetings may be recorded and transcribed by Stream Video when you start a call. AI
          summaries are generated from conversation messages and transcripts using the Mistral API.
          Do not record or share content you do not have the right to.
        </p>
        <h2 className="text-lg font-semibold mt-6">Data and cookies</h2>
        <p>
          Session cookies are used to keep you signed in. Data is stored in a Neon PostgreSQL
          database. You can request deletion of your account and data by contacting the project
          maintainer.
        </p>
        <h2 className="text-lg font-semibold mt-6">Availability</h2>
        <p>
          The service is provided as-is, without warranties. Features may change or be removed at
          any time.
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