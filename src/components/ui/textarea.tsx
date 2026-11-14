import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-28 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-base transition-colors outline-none placeholder:text-text-subtle focus-visible:border-brand-500 focus-visible:ring-3 focus-visible:ring-brand-500/25 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/40 resize-none",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
