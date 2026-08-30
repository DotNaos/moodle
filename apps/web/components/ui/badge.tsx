import type * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

const badgeVariantClasses: Record<BadgeVariant, string> = {
  default: "bg-accent text-text-on-accent",
  secondary: "bg-control text-text",
  destructive: "bg-danger text-text-on-accent",
  outline: "bg-transparent text-text-muted",
};

function badgeVariants({
  className,
  variant = "secondary",
}: {
  className?: string;
  variant?: BadgeVariant;
} = {}) {
  return cn(
    "inline-flex items-center rounded-full border-0 px-2.5 py-0.5 text-xs font-medium transition-colors",
    badgeVariantClasses[variant],
    className,
  );
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={badgeVariants({ className, variant })} {...props} />;
}

export { Badge, badgeVariants };
export type { BadgeVariant };
