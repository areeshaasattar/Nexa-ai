import Link from "next/link";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-nx-deep via-nx-deep-2 to-nx-deep py-24 text-white lg:py-30">
      {/* soft glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-[360px] w-[560px] -translate-x-1/2 rounded-full bg-nx-accent/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try your first AI call</h2>
        <p className="mt-3 text-white/75">Create your first agent in a minute.</p>
        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-nx-btn bg-nx-accent px-6 py-3 text-sm font-semibold text-nx-deep transition-colors hover:bg-nx-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-accent"
          >
            Get started free
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/70">
          No credit card required. Fair-use limits apply.
        </p>
      </div>
    </section>
  );
}
