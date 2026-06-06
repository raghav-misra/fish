import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "danger" | "neutral" | "ghost";

interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
}

const base =
  "relative inline-flex items-center justify-center font-semibold uppercase tracking-wide rounded-lg border-b-4 active:border-b-0 active:mt-1 transition-all duration-75 select-none disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-emerald-500 border-emerald-700 text-white hover:bg-emerald-400 active:bg-emerald-600 shadow-lg shadow-emerald-900/30",
  danger:
    "bg-amber-500 border-amber-700 text-white hover:bg-amber-400 active:bg-amber-600 shadow-lg shadow-amber-900/30",
  neutral:
    "bg-zinc-600 border-zinc-800 text-zinc-100 hover:bg-zinc-500 active:bg-zinc-700 shadow-lg shadow-zinc-900/30",
  ghost:
    "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 border-b-0 active:mt-0",
};

const sizes = {
  sm: "px-4 py-1.5 text-xs",
  md: "px-5 py-2 text-sm",
};

/** Chunky, game-style button with 3D press effect. */
export function GameButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: GameButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
