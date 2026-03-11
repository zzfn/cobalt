import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[14px] text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.55)] hover:bg-primary/92",
        primary: "bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_hsl(var(--primary)/0.55)] hover:bg-primary/92",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_12px_28px_-18px_hsl(var(--destructive)/0.7)] hover:bg-destructive/92",
        secondary:
          "border border-border/70 bg-secondary/88 text-secondary-foreground hover:bg-surface-hover",
        ghost: "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        outline:
          "border border-input/90 bg-background/74 shadow-sm hover:bg-surface-hover hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-[12px] px-3",
        lg: "h-12 rounded-[16px] px-8",
        icon: "h-10 w-10 rounded-[14px]",
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
