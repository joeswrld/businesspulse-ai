import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 group relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft hover:shadow-medium hover:scale-105",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-soft hover:scale-105",
        outline: "border-2 border-primary/20 bg-background hover:bg-primary/10 hover:text-primary hover:border-primary shadow-soft hover:scale-105",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-soft hover:scale-105",
        ghost: "hover:bg-primary/10 hover:text-primary hover:scale-105",
        link: "text-primary underline-offset-4 hover:underline hover:scale-105",
        hero: "bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:shadow-glow transform hover:scale-105 shadow-medium",
        premium: "bg-gradient-to-r from-primary via-secondary to-neon text-primary-foreground hover:shadow-premium transform hover:scale-105 shadow-large",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-soft hover:scale-105",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-soft hover:scale-105",
        neon: "bg-gradient-to-r from-neon to-tertiary text-white hover:shadow-neon transform hover:scale-105 shadow-medium",
        glass: "bg-white/20 backdrop-blur-xl border border-white/30 text-foreground hover:bg-white/30 hover:shadow-glow transform hover:scale-105",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-10 rounded-lg px-6 text-xs",
        lg: "h-14 rounded-xl px-10 text-base",
        xl: "h-16 rounded-2xl px-12 text-lg",
        icon: "h-12 w-12",
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
      >
        {props.children}
        {/* Premium button shine effect */}
        {variant === "premium" && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
