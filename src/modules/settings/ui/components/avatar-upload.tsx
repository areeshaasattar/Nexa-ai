"use client";

import * as React from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_DIMENSION = 512; // px, longest edge after resize

/**
 * Downscale + compress an image file into a compact data-URL that can live in
 * the `user.image` text column (see `src/db/schema.ts`). A 512px WebP is
 * roughly 20–60 KB — negligible for storage while crisp enough for an avatar.
 */
function compressImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = String(reader.result);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(
            1,
            MAX_DIMENSION / Math.max(img.width, img.height),
          );
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          // Prefer WebP, fall back to JPEG for browsers without WebP encode.
          let dataUrl = canvas.toDataURL("image/webp", 0.82);
          if (!dataUrl.startsWith("data:image/webp")) {
            dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          }
          resolve(dataUrl);
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = source;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function AvatarUpload({
  seed,
  src,
  onImageChanged,
}: {
  seed: string;
  src?: string | null;
  onImageChanged?: () => void;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const saveImage = async (image: string | null) => {
    setUploading(true);
    try {
      const { error } = await authClient.updateUser({ image });
      if (error) {
        throw new Error(error.message || "Failed to update avatar");
      }
      toast.success(image ? "Avatar updated" : "Avatar removed");
      onImageChanged?.();
    } catch (err) {
      toast.error("Could not update avatar", {
        description:
          err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Invalid file", {
        description: "Please choose an image (PNG, JPG, WebP, …).",
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large", {
        description: "Images must be under 5 MB.",
      });
      return;
    }
    const dataUrl = await compressImage(file);
    if (!dataUrl) {
      toast.error("Could not read image", {
        description: "Please try a different image file.",
      });
      return;
    }
    await saveImage(dataUrl);
    // Allow re-selecting the same file on a later upload.
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-4 sm:items-start">
      <div className="group relative">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          aria-label="Change profile photo"
          className="relative block size-24 overflow-hidden rounded-full transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed"
        >
          {/* No `size` prop here: passing one would stamp `data-size` and
              re-activate the base avatar's 40px `data-[size=lg]` rule alongside
              `size-24`, making the box render off-size inside this circle. */}
          <GeneratedAvatar seed={seed} src={src} className="size-24" />
          <span
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-slate-900/60 text-white transition-opacity duration-150",
              uploading
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100",
            )}
          >
            {uploading ? (
              <Loader2 className="size-6 animate-spin" aria-hidden />
            ) : (
              <Camera className="size-6" aria-hidden />
            )}
            <span className="text-[11px] font-medium">
              {uploading ? "Uploading…" : "Edit"}
            </span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700 disabled:opacity-50"
        >
          Change photo
        </button>
        {src && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => saveImage(null)}
            className="font-medium text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}