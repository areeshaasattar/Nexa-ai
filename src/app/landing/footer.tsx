import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-green-950 py-10 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2">
          <BrandLogo variant="onDark" width={20} height={20} className="h-5 w-5" />
          <span className="font-semibold">Nexa AI</span>
          <span className="text-sm text-white/60">Talk to AI agents in live calls.</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/70">
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/sign-in" className="hover:text-white">Sign in</Link>
          <a href="#how-it-works" className="hover:text-white">How it works</a>
          <a href="#templates" className="hover:text-white">Templates</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </div>
        <div className="text-sm text-white/60">&copy; {year} Nexa AI</div>
      </div>
    </footer>
  );
}