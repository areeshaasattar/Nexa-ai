import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "./reveal";

const summaryParts = ["Overview", "Decisions", "Action items", "Topics", "Open questions"];

export function Showcase() {
  return (
    <section className="bg-nx-mint py-24 lg:py-30">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <Reveal>
          <div className="grid items-center gap-12 md:grid-cols-2 lg:gap-16">
            {/* Left: text + bullets + buttons */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-nx-primary-deep">
                After every call
              </p>
              <h2 className="mt-2 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.015em] text-nx-ink">
                A clear summary after every call
              </h2>
              <p className="mt-4 max-w-[65ch] text-base leading-[1.65] text-nx-body sm:text-[17px]">
                When the call ends, Nexa generates a structured summary and emails it to you.
              </p>
              <ul className="mt-6 space-y-3">
                {summaryParts.map((part) => (
                  <li key={part} className="flex items-center gap-3 text-nx-ink">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-nx-primary-deep text-white">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                    {part}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center rounded-nx-btn bg-nx-primary-deep px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-nx-primary-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
                >
                  Get started free
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center rounded-nx-btn border border-nx-line bg-white px-5 py-2.5 text-sm font-semibold text-nx-ink transition-colors hover:bg-nx-mint-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
                >
                  See how it works
                </a>
              </div>
            </div>

            {/* Right: media area + floating example summary card */}
            <div className="relative mb-8 lg:mb-0">
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-nx-line shadow-nx-glow">
                <Image
                  src="/landing/a-clear-summary.jpg"
                  alt="Illustration of a structured meeting summary emailed after a call"
                  fill
                  sizes="(min-width: 1024px) 560px, (min-width: 768px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="mt-6 w-full rounded-nx-card border border-nx-line bg-white p-5 shadow-nx-glow lg:absolute lg:-bottom-8 lg:-left-6 lg:mt-0 lg:max-w-sm">
                <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                  Example
                </div>
                <div className="mt-1 text-sm font-semibold text-nx-ink">Meeting summary</div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-nx-muted">
                    Overview
                  </div>
                  <p className="mt-1 text-sm text-nx-ink">
                    The team agreed to launch Project Atlas on March 14. Priya will handle legal
                    review and Marcus the pricing page.
                  </p>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-nx-muted">
                    Decisions
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-nx-ink">
                    <li>Launch on March 14.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-nx-muted">
                    Action items
                  </div>
                  <ul className="mt-1 list-disc pl-5 text-sm text-nx-ink">
                    <li>Marcus: prepare pricing page (Monday).</li>
                    <li>Priya: legal review.</li>
                  </ul>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-nx-muted">
                    Open questions
                  </div>
                  <p className="mt-1 text-sm text-nx-ink">None.</p>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
