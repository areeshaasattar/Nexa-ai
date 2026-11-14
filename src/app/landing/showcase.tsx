export function Showcase() {
  return (
    <section className="bg-emerald-50/60 py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">After every call</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">A clear summary after every call</h2>
          <p className="mt-4 max-w-[65ch] text-slate-600">
            When the call ends, Nexa generates a structured summary and emails it to you.
          </p>
          <ul className="mt-6 space-y-2 text-slate-700">
            {["Overview", "Decisions", "Action items", "Topics", "Open questions"].map((x) => (
              <li key={x} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                {x}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-amber-600">Example</div>
            <div className="text-sm font-semibold text-slate-900">Meeting summary</div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overview</div>
              <p className="mt-1 text-sm text-slate-700">
                The team agreed to launch Project Atlas on March 14. Priya will handle legal review and Marcus the pricing page.
              </p>
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decisions</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                <li>Launch on March 14.</li>
              </ul>
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Action items</div>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-700">
                <li>Marcus: prepare pricing page (Monday).</li>
                <li>Priya: legal review.</li>
              </ul>
            </div>
            <div className="mt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open questions</div>
              <p className="mt-1 text-sm text-slate-700">None.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}