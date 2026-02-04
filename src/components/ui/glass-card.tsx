import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * 液态玻璃效果变体
 */
export type GlassVariant = "default" | "light" | "dark" | "colored"

/**
 * 模糊强度
 */
export type BlurStrength = "sm" | "md" | "lg" | "xl"

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 玻璃效果变体
   * @default "default"
   */
  variant?: GlassVariant
  /**
   * 模糊强度
   * @default "md"
   */
  blur?: BlurStrength
  /**
   * 是否显示边框
   * @default true
   */
  bordered?: boolean
  /**
   * 是否显示阴影
   * @default true
   */
  shadow?: boolean
}

const blurClasses: Record<BlurStrength, string> = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl",
}

const variantClasses: Record<GlassVariant, string> = {
  default: "bg-white/10 dark:bg-black/10",
  light: "bg-white/20 dark:bg-white/10",
  dark: "bg-black/20 dark:bg-black/30",
  colored: "bg-primary/10 dark:bg-primary/20",
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = "default",
      blur = "md",
      bordered = true,
      shadow = true,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl transition-all duration-300",
        blurClasses[blur],
        variantClasses[variant],
        bordered && "border border-white/20 dark:border-white/10",
        shadow && "shadow-lg shadow-black/5",
        className
      )}
      {...props}
    />
  )
)
GlassCard.displayName = "GlassCard"

const GlassCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
GlassCardHeader.displayName = "GlassCardHeader"

const GlassCardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
GlassCardTitle.displayName = "GlassCardTitle"

const GlassCardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground/80", className)}
    {...props}
  />
))
GlassCardDescription.displayName = "GlassCardDescription"

const GlassCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
GlassCardContent.displayName = "GlassCardContent"

const GlassCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
GlassCardFooter.displayName = "GlassCardFooter"

export {
  GlassCard,
  GlassCardHeader,
  GlassCardFooter,
  GlassCardTitle,
  GlassCardDescription,
  GlassCardContent,
}
