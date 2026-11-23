import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingMobileMenu } from "../landing-mobile-menu";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#templates", label: "Templates" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 px-4 pt-4 sm:px-6">
      <nav
        className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 rounded-2xl border border-nx-line bg-white/90 px-4 py-3 shadow-nx-glow backdrop-blur md:grid md:grid-cols-[1fr_auto_1fr] sm:px-6"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex items-center gap-2 rounded-nx-btn focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
        >
          <BrandLogo variant="onLight" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-nx-ink">Nexa AI</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-nx-btn text-sm font-medium text-nx-muted transition-colors hover:text-nx-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center justify-end gap-5 md:flex">
          <Link
            href="/sign-in"
            className="rounded-nx-btn text-sm font-medium text-nx-muted transition-colors hover:text-nx-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-nx-btn bg-nx-primary-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-nx-primary-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nx-primary-deep"
          >
            Get started
          </Link>
        </div>

        <div className="md:hidden">
          <LandingMobileMenu />
        </div>
      </nav>
    </header>
  );
}
