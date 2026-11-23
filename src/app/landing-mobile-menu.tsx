"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
        className="text-nx-ink hover:bg-nx-mint"
      >
        <Menu className="size-5" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 border-nx-line bg-white text-nx-ink">
          <SheetHeader>
            <SheetTitle className="text-nx-ink">Menu</SheetTitle>
          </SheetHeader>
          <nav className="mt-6 flex flex-col gap-2" aria-label="Mobile">
            <a
              href="#how-it-works"
              onClick={() => setOpen(false)}
              className="rounded-nx-btn px-3 py-2 text-sm font-medium text-nx-muted hover:bg-nx-mint hover:text-nx-ink"
            >
              How it works
            </a>
            <a
              href="#templates"
              onClick={() => setOpen(false)}
              className="rounded-nx-btn px-3 py-2 text-sm font-medium text-nx-muted hover:bg-nx-mint hover:text-nx-ink"
            >
              Templates
            </a>
            <a
              href="#faq"
              onClick={() => setOpen(false)}
              className="rounded-nx-btn px-3 py-2 text-sm font-medium text-nx-muted hover:bg-nx-mint hover:text-nx-ink"
            >
              FAQ
            </a>
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="rounded-nx-btn px-3 py-2 text-sm font-medium text-nx-muted hover:bg-nx-mint hover:text-nx-ink"
            >
              Sign in
            </Link>
            <Button
              asChild
              className="mt-2 bg-nx-primary-deep text-white hover:bg-nx-primary-darker"
            >
              <Link href="/sign-up" onClick={() => setOpen(false)}>
                Get started
              </Link>
            </Button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
