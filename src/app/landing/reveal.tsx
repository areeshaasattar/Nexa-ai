"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Subtle fade/slide-in on scroll (no animation library).
 *
 * The hidden state is only added by JS after mount, so content is never
 * hidden when JS is disabled. `prefers-reduced-motion: reduce` skips the
 * effect entirely. Use for below-the-fold sections only.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Optional stagger in ms. */
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    el.classList.add("nx-reveal-init");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.remove("nx-reveal-init");
            el.classList.add("nx-reveal-in");
            observer.unobserve(el);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
