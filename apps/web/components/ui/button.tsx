import * as SlotPrimitive from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

type ButtonVariantOptions = {
  className?: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

const variantClasses: Record<ButtonVariant, string> = {
  default: "bg-accent text-text-on-accent hover:bg-accent-hover",
  outline: "bg-transparent text-text hover:bg-control-hover aria-expanded:bg-control-hover",
  secondary: "bg-control text-text hover:bg-control-hover aria-expanded:bg-control-hover",
  ghost: "bg-transparent text-text hover:bg-control-hover aria-expanded:bg-control-hover",
  destructive: "bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger/30",
  link: "bg-transparent text-accent underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "h-8 gap-1.5 px-2.5",
  xs: "h-6 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
  sm: "h-7 gap-1 px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
  lg: "h-9 gap-1.5 px-2.5",
  icon: "size-8",
  "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
};

function buttonVariants({ className, size = "default", variant = "default" }: ButtonVariantOptions = {}) {
  return cn(
    "group/button inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-clip-padding text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-focus-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-danger/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: ButtonProps) {
  const classes = buttonVariants({ className, size, variant });

  if (asChild) {
    return (
      <SlotPrimitive.Root
        className={classes}
        data-size={size}
        data-slot="button"
        data-variant={variant}
        {...props}
      />
    );
  }

  return (
    <button
      className={classes}
      data-size={size}
      data-slot="button"
      data-variant={variant}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps, ButtonSize, ButtonVariant };
