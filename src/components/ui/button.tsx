"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-sm font-semibold whitespace-nowrap transition-colors outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:opacity-90",
        outline: "border-field-border bg-surface text-foreground hover:bg-hover",
        secondary: "border-field-border bg-surface text-foreground hover:bg-hover",
        ghost: "text-ink-2 hover:bg-hover hover:text-foreground",
        destructive: "border-warn-border bg-surface text-warn-strong hover:bg-warn-bg",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 gap-2 px-4",
        xs: "min-h-11 gap-1 px-3 text-xs",
        sm: "min-h-11 gap-1.5 px-3 text-[0.8125rem]",
        lg: "min-h-11 gap-2 px-5",
        icon: "size-11",
        "icon-xs": "size-11",
        "icon-sm": "size-11",
        "icon-lg": "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
