"use client"

import { cva, type VariantProps } from "class-variance-authority"

import {
  LiquidButton as LiquidButtonPrimitive,
  type LiquidButtonProps as LiquidButtonPrimitiveProps,
} from "@/components/animate-ui/primitives/buttons/liquid"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[box-shadow,_color,_background-color,_border-color,_outline-color,_text-decoration-color,_fill,_stroke] outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        icon: "size-9",
        "icon-lg": "size-10 rounded-md",
        "icon-sm": "size-8 rounded-md",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        xs: "h-6 gap-1 rounded-md px-1.5 has-[>svg]:px-1",
      },
      variant: {
        default:
          "text-primary hover:text-primary-foreground shadow-xs [--liquid-button-background-color:var(--accent)] [--liquid-button-color:var(--primary)]",
        destructive:
          "focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 text-white shadow-xs [--liquid-button-background-color:var(--accent)] [--liquid-button-color:var(--destructive)]",
        ghost:
          "text-primary hover:text-primary-foreground shadow-xs [--liquid-button-background-color:var(--transparent)] [--liquid-button-color:var(--primary)]",
        secondary:
          "text-secondary hover:text-secondary-foreground shadow-xs [--liquid-button-background-color:var(--accent)] [--liquid-button-color:var(--secondary)]",
      },
    },
  }
)

type LiquidButtonProps = LiquidButtonPrimitiveProps &
  VariantProps<typeof buttonVariants>

function LiquidButton({
  className,
  variant,
  size,
  defaultPressed = false,
  ...props
}: LiquidButtonProps) {
  return (
    <LiquidButtonPrimitive
      className={cn(
        buttonVariants({ size, variant }),
        // Pressed = the filled end-state at rest: invert the text so it reads on
        // the filled colour and returns to the base colour as it drains on hover
        // (mirrors the default variant's `text-primary hover:text-primary-foreground`).
        defaultPressed && "text-primary-foreground hover:text-primary",
        className
      )}
      defaultPressed={defaultPressed}
      {...props}
    />
  )
}

export { buttonVariants, LiquidButton, type LiquidButtonProps }
