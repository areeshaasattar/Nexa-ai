"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { lorelei, bottts, initials as initialsCollection } from "@dicebear/collection";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Available avatar styles from DiceBear
 */
export type AvatarStyle = "lorelei" | "bottts" | "initials";

interface GeneratedAvatarProps {
  /**
   * The seed value to generate the avatar. Usually a username, email, or unique ID.
   */
  seed: string;
  /**
   * Optional real image source (e.g., GitHub profile picture).
   */
  src?: string | null;
  /**
   * The visual style of the avatar.
   * @default "lorelei"
   */
  style?: AvatarStyle;
  /**
   * Optional className for the Avatar root element.
   */
  className?: string;
  /**
   * Size of the avatar.
   * @default "default"
   */
  size?: "default" | "sm" | "lg";
  /**
   * Optional style overrides for the DiceBear generation.
   */
  options?: Record<string, string | string[] | number | boolean | null | undefined>;
}

/**
 * GeneratedAvatar component that creates a unique avatar using DiceBear.
 * It integrates with the project's base Avatar component for consistent styling.
 * 
 * Logic:
 * 1. Displays the `src` image if provided (e.g. from GitHub/Google).
 * 2. Generates an SVG data URI based on the seed if no `src` is provided.
 * 3. Provides a clean fallback based on the seed's initials.
 */
export function GeneratedAvatar({
  seed,
  src,
  style = "lorelei",
  className,
  size = "default",
  options,
}: GeneratedAvatarProps) {
  // Map styles to DiceBear collections
  const collection = useMemo(() => {
    switch (style) {
      case "bottts":
        return bottts;
      case "initials":
        return initialsCollection;
      case "lorelei":
      default:
        return lorelei;
    }
  }, [style]);

  // Generate the avatar SVG data URI for fallback
  const avatarDataUri = useMemo(() => {
    if (!seed) return "";
    try {
      return createAvatar(
        collection as Parameters<typeof createAvatar>[0],
        {
          seed,
          ...(style === "initials" ? {
            backgroundColor: ["22c55e", "166534", "14532d"],
            textColor: ["ffffff"],
          } : {}),
          ...options,
        } as Parameters<typeof createAvatar>[1]
      ).toDataUri();
    } catch (error) {
      console.error("Error generating avatar:", error);
      return "";
    }
  }, [seed, collection, style, options]);

  // Fallback initials logic
  const initials = useMemo(() => {
    if (!seed) return "??";
    const cleanSeed = seed.includes("@") ? seed.split("@")[0] : seed;
    return cleanSeed
      .split(/[\s.@_-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  }, [seed]);

  return (
    <Avatar 
      size={size} 
      className={cn(
        "bg-background ring-1 ring-border/50 overflow-hidden shadow-sm transition-transform hover:scale-105 duration-200", 
        className
      )}
    >
      <AvatarImage 
        src={src || avatarDataUri} 
        alt={`Avatar for ${seed}`}
        className="transition-opacity duration-300 object-cover" 
      />
      <AvatarFallback className="bg-green-50 text-green-700 font-bold tracking-tighter">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export default GeneratedAvatar;
