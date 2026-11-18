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
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  warning?: React.ReactNode;
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
  warning,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl border border-brand-100 bg-white p-6 shadow-2xl shadow-brand-900/20 sm:p-7 max-w-md">
        <AlertDialogHeader className="flex flex-col items-center gap-3 space-y-0 text-center">
          <AlertDialogMedia
            className={
              destructive
                ? "size-14 rounded-full bg-red-50 ring-8 ring-red-50/60 text-red-600"
                : "size-14 rounded-full bg-brand-100 ring-8 ring-brand-100/60 text-brand-700"
            }
          >
            <Trash2 className="size-6" />
          </AlertDialogMedia>
          <div className="flex flex-col gap-2">
            <AlertDialogTitle className="text-xl font-semibold leading-tight text-brand-900">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">
              {description}
            </AlertDialogDescription>
          </div>
          {warning && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span className="text-sm text-amber-800">{warning}</span>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 gap-3 border-0 bg-transparent p-0 mx-0 mb-0 grid grid-cols-1 sm:grid-cols-2">
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              if (!pending) onConfirm();
            }}
            className={`order-1 h-11 w-full rounded-xl font-medium transition-colors focus-visible:ring-2 sm:order-2 ${
              destructive
                ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
                : "bg-brand-700 text-white hover:bg-brand-600 focus-visible:ring-brand-500"
            }`}
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
          <AlertDialogCancel
            autoFocus
            disabled={pending}
            className="order-2 h-11 w-full rounded-xl border border-brand-200 bg-white font-medium text-brand-900 hover:bg-brand-100 focus-visible:ring-2 focus-visible:ring-brand-500 sm:order-1"
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
