"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive = true,
  pending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-2xl border border-green-100 bg-white shadow-xl max-w-[420px] p-6">
        <AlertDialogHeader className="flex flex-col items-center gap-3 space-y-0 text-center sm:items-start sm:text-left">
          <AlertDialogMedia className="size-12 rounded-full bg-red-50 text-red-600">
            <Trash2 className="size-5" />
          </AlertDialogMedia>
          <div className="flex flex-col gap-1">
            <AlertDialogTitle className="text-base font-bold text-gray-900 leading-none">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500 leading-tight">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel
            autoFocus
            disabled={pending}
            className="rounded-lg border-gray-100 text-gray-500 font-bold hover:bg-gray-50 h-9 px-4 text-xs mt-0 focus-visible:ring-green-500/30"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (!pending) onConfirm();
            }}
            className={
              destructive
                ? "rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold h-9 px-4 text-xs shadow-none transition-colors"
                : "rounded-lg bg-[#3B6D11] hover:bg-[#2f5a0d] text-white font-bold h-9 px-4 text-xs shadow-none transition-colors"
            }
          >
            {pending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
