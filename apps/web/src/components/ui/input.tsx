import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("h-11 w-full rounded-xl border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-ink focus:ring-2 focus:ring-lime/60", className)} {...props} />
  ),
);
Input.displayName = "Input";
