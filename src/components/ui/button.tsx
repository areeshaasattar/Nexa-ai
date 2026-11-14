import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Primary button: gradient brand-600 to brand-700, white text, shadow. */
        default:
          "bg-gradient-to-b from-brand-600 to-brand-700 text-white shadow-md shadow-brand-600/22 hover:shadow-lg hover:shadow-brand-600/28 hover:from-brand-600 hover:to-brand-700",
        /** Outline button: white bg, brand border, hover brand-50 tint. */
        outline:
          "border-2 border-border-strong bg-white text-foreground hover:bg-brand-50 hover:border-brand-200",
        /** Secondary button variant. */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        /** Ghost button: transparent, hover muted bg. */
        ghost: "hover:bg-muted hover:text-foreground",
        /** Destructive button: red background, white text. */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        /** Link button: text only, brand color, underline on hover. */
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        /** 32px height */
        xs: "h-8 gap-1 px-2",
        /** 40px height */
        sm: "h-10 gap-2 px-3",
        /** 44px height (default, e.g., for form inputs) */
        default: "h-11 gap-2 px-4",
        /** 44px height (pill-shaped for header buttons) */
        lg: "h-11 gap-2 px-5 rounded-full",
        /** Icon button: 44px square */
        icon: "size-11 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }