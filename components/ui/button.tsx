import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]",
  secondary:
    "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100",
  danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  ghost: "text-neutral-700 hover:bg-neutral-100",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm font-semibold",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg transition disabled:opacity-60",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...props}
    />
  );
}
