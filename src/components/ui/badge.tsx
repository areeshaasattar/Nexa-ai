import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        /** Default: brand-600 bg with white text */
        default: "bg-brand-600 text-white [a]:hover:bg-brand-700",
        /** Success: brand-100 bg with brand-800 text */
        success: "bg-brand-100 text-brand-800 [a]:hover:bg-brand-200",
        /** Neutral: muted bg with text-muted */
        neutral:
          "bg-muted text-text-muted [a]:hover:bg-border",
        /** Destructive: danger-soft bg with danger text */
        destructive:
          "bg-danger-soft text-danger focus-visible:ring-danger/20 [a]:hover:bg-red-100",
        /** Outline: border only, transparent bg */
        outline:
          "border border-border bg-transparent text-foreground [a]:hover:bg-muted",
        /** Ghost: no border, hover muted bg */
        ghost:
          "hover:bg-muted hover:text-foreground",
        /** Link: text only, brand color, underline on hover */
        link: "text-brand-700 underline-offset-2 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
