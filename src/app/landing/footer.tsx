import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const columns = [
  {
    heading: "Product",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#templates", label: "Templates" },
      { href: "#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
  {
    heading: "Account",
    links: [{ href: "/sign-in", label: "Sign in" }],
  },
];

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-nx-deep pb-8 pt-16 text-white">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <BrandLogo variant="onDark" width={24} height={24} className="h-6 w-6" />
              <span className="text-lg font-bold tracking-tight">Nexa AI</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Talk to AI agents in live calls.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h3 className="text-sm font-semibold text-white">{col.heading}</h3>
              <ul className="mt-4 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.href.startsWith("#") ? (
                      <a
                        href={link.href}
                        className="rounded-nx-btn text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-accent"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href}
                        className="rounded-nx-btn text-sm text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-accent"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-white/70">
          &copy; {year} Nexa AI
        </div>
      </div>
    </footer>
  );
}
