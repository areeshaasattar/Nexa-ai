import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { LandingMobileMenu } from "../landing-mobile-menu";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-green-950/80 backdrop-blur">
      <nav
        className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6"
        aria-label="Primary"
      >
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo variant="onDark" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-bold tracking-tight text-white">Nexa AI</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          <a
            href="#how-it-works"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            How it works
          </a>
          <a
            href="#templates"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Templates
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            FAQ
          </a>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-green-950 transition-colors hover:bg-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
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