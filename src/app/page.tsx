import type { Metadata } from "next";
import { LandingNavbar } from "./landing/navbar";
import { LandingHero } from "./landing/hero";
import { CapabilityStrip } from "./landing/capability-strip";
import { HowItWorks } from "./landing/how-it-works";
import { Showcase } from "./landing/showcase";
import { Features } from "./landing/features";
import { Templates } from "./landing/templates";
import { GoodToKnow } from "./landing/good-to-know";
import { Faq } from "./landing/faq";
import { FinalCta } from "./landing/final-cta";
import { LandingFooter } from "./landing/footer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Nexa AI - Talk to an AI agent in a live call",
  description:
    "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nexa AI - Talk to an AI agent in a live call",
    description:
      "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
    url: "/",
    siteName: "Nexa AI",
    type: "website",
    images: [{ url: "/logo.svg", width: 120, height: 120, alt: "Nexa AI logo" }],
  },
  twitter: {
    card: "summary",
    title: "Nexa AI - Talk to an AI agent in a live call",
    description:
      "Create AI agents, join a live video call, talk with push-to-talk, and get a clean structured summary by email after the call.",
  },
  robots: { index: true, follow: true },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow"
      >
        Skip to content
      </a>
      <LandingNavbar />
      <main id="main">
        <LandingHero />
        <CapabilityStrip />
        <HowItWorks />
        <Showcase />
        <Features />
        <Templates />
        <GoodToKnow />
        <Faq />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}