import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border-2 border-primary/20 bg-white/80 backdrop-blur-xl px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 focus:scale-105 focus:shadow-glow",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

// Premium Input Variants
const PremiumInput = React.forwardRef<
  HTMLInputElement,
  InputProps & {
    variant?: "default" | "glass" | "gradient" | "neon"
    size?: "sm" | "default" | "lg" | "xl"
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const baseClasses = "transition-all duration-300 focus:scale-105 focus:shadow-glow"
  
  const variantClasses = {
    default: "border-primary/20 bg-white/80 backdrop-blur-xl focus:border-primary focus:shadow-glow",
    glass: "glass-card border-primary/30 focus:border-primary focus:shadow-glow",
    gradient: "border-primary/30 bg-gradient-to-r from-primary/5 to-secondary/5 focus:border-primary focus:shadow-premium",
    neon: "border-neon/30 bg-neon/5 focus:border-neon focus:shadow-neon"
  }
  
  const sizeClasses = {
    sm: "h-10 px-4 py-2 text-sm",
    default: "h-12 px-4 py-3 text-sm",
    lg: "h-14 px-6 py-4 text-base",
    xl: "h-16 px-8 py-5 text-lg"
  }
  
  return (
    <input
      type={props.type}
      className={cn(
        "flex w-full rounded-2xl ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-bold placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
PremiumInput.displayName = "PremiumInput"

export { Input, PremiumInput }
