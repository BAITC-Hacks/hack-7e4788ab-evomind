import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-ink px-5 py-3 text-white hover:bg-ink/90",
        accent: "bg-lime px-5 py-3 text-ink hover:bg-lime/80",
        outline: "border border-ink/15 bg-white px-5 py-3 text-ink hover:bg-cream",
        ghost: "px-4 py-2 text-ink hover:bg-ink/5",
        danger: "bg-coral px-5 py-3 text-white hover:bg-coral/90",
      },
      size: { default: "h-11", sm: "h-9 px-3 py-2", lg: "h-13 px-7 py-4 text-base" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
