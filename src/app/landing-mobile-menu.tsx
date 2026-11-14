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
    <Sheet open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}>
        <Menu className="size-5" />
      </Button>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-2 mt-6" aria-label="Mobile">
          <Link
            href="#how-it-works"
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100"
          >
            How it works
          </Link>
          <Link
            href="#templates"
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100"
          >
            Templates
          </Link>
          <Link
            href="#faq"
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100"
          >
            FAQ
          </Link>
          <Link
            href="/sign-in"
            onClick={() => setOpen(false)}
            className="px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-100"
          >
            Sign in
          </Link>
          <Button asChild className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <Link href="/sign-up" onClick={() => setOpen(false)}>
              Get started
            </Link>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}