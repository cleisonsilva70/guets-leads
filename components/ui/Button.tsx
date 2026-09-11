import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-graphite text-white hover:bg-ink active:scale-[0.98] shadow-sm shadow-ink/10",
  secondary: "bg-ink text-white hover:bg-ink/90 active:scale-[0.98]",
  ghost: "bg-transparent text-ink border border-smoke hover:bg-smoke",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`w-full rounded-2xl px-6 py-4 text-base font-semibold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
