"use client";

import React, { useState } from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DashboardUserButton from "./Dashboard-user-button";

const openShortcuts = () => {
  window.dispatchEvent(new CustomEvent("open-shortcuts"));
};

export const DashboardNavbar = () => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleSubmitFeedback = () => {
    setFeedbackSubmitted(true);
    setFeedbackOpen(false);
    toast.success("Thanks for your feedback!");
    setTimeout(() => {
      setFeedbackText("");
      setFeedbackSubmitted(false);
    }, 300);
  };
  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "h-16 w-full",
        "bg-white border-b border-gray-200 shadow-sm",
        "flex items-center justify-between px-4 md:px-6 shrink-0",
      )}
    >
      <div className="flex items-center gap-3">
        <SidebarTrigger className="bg-gray-50 hover:bg-emerald-50 hover:text-emerald-700 transition-colors rounded-lg h-9 w-9 flex items-center justify-center border border-gray-200 shadow-sm" />

        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-700 text-[11px] font-semibold">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          System Online
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-3 lg:mx-5 hidden sm:block">
        <button
          type="button"
          onClick={openShortcuts}
          className={cn(
            "group relative flex w-full items-center gap-3 rounded-xl",
            "border border-gray-200 bg-gray-50 px-3.5 py-2",
            "text-left text-sm shadow-sm transition-all duration-200",
            "hover:border-green-400 hover:bg-white hover:shadow-md hover:shadow-green-100",
            "focus:outline-none",
          )}
        >
          <SearchIcon className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-green-600 transition-colors" />
          <span className="flex-1 text-sm text-gray-400 group-hover:text-gray-500 transition-colors select-none">
            Search everything...
          </span>
          <kbd className="inline-flex items-center rounded-md border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-semibold text-gray-400 shadow-sm group-hover:border-green-200 group-hover:bg-green-50 group-hover:text-green-600 transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={openShortcuts}
          className="flex sm:hidden items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-300 transition-all shadow-sm"
          aria-label="Open search"
        >
          <SearchIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => setFeedbackOpen(true)}
          className="hidden lg:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-md shadow-green-600/20 transition-all active:scale-95"
        >
          <span>Feedback</span>
        </button>

        {/* Feedback Dialog */}
        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
          <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <DialogHeader className="p-0 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Nexa AI
                </p>
                <DialogTitle className="text-base font-semibold text-gray-900 leading-tight">
                  Send Feedback
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="px-6 pt-4 pb-6 space-y-4">
              <Textarea
                placeholder="Tell us what's on your mind..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                className="min-h-[120px] rounded-xl border-gray-200 bg-gray-50 text-sm focus:bg-white resize-none"
              />
            </div>
            <DialogFooter className="px-6 pb-6 border-t border-gray-100 pt-4 flex flex-row items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFeedbackOpen(false)}
                className="rounded-lg border-gray-200 text-gray-600 h-9 px-4 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitFeedback}
                disabled={!feedbackText.trim() || feedbackSubmitted}
                className="rounded-lg bg-green-600 hover:bg-green-700 text-white h-9 px-5 text-xs font-medium"
              >
                {feedbackSubmitted ? "Sending…" : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DashboardUserButton variant="header" />
      </div>
    </header>
  );
};

export default DashboardNavbar;
