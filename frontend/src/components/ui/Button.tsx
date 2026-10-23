import type { ButtonHTMLAttributes } from "react";
export function Button({
  primary = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      {...props}
      className={`${primary ? "bg-pink-200 text-slate-950 hover:bg-pink-100" : "border border-white/15 bg-white/5 text-slate-100 hover:bg-white/12"} rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200 ${className}`}
    />
  );
}
