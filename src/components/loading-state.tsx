"use client";

import React from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  /**
   * The primary loading text.
   * @default "Loading..."
   */
  title?: string;
  /**
   * Optional sub-text to provide more context.
   */
  description?: string;
  /**
   * Optional className for the container.
   */
  className?: string;
}

/**
 * A professional, centered loading state component.
 */
export function LoadingState({
  title = "Loading...",
  description,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center min-h-[50vh] w-full p-8 text-center animate-in fade-in duration-500",
        className
      )}
    >
      <div className="relative flex items-center justify-center mb-6">
        {/* Outer pulse effect */}
        <div className="absolute size-14 rounded-full bg-brand-500/10 animate-ping" />
        <div className="absolute size-10 rounded-full bg-brand-500/5 animate-pulse" />
        {/* The spinner */}
        <Spinner className="size-10 text-brand-500 relative z-10" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-gray-900 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-500 font-medium max-w-[300px] mx-auto leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoadingState;
