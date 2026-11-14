import Link from "next/link";

export function FinalCta() {
  return (
    <section className="bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 py-20 text-white sm:py-28">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Try your first AI call</h2>
        <p className="mt-3 text-white/75">Create your first agent in a minute.</p>
        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-green-950 transition-colors hover:bg-emerald-400"
          >
            Get started free
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/60">No credit card required. Fair-use limits apply.</p>
      </div>
    </section>
  );
}