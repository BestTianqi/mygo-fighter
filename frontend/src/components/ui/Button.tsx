import type { ButtonHTMLAttributes } from "react";
export function Button({
  primary = false,
  tone = "dark",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
  tone?: "light" | "dark";
}) {
  return (
    <button
      {...props}
      className={`${primary ? "bg-[#bb3266] text-white shadow-[0_6px_18px_#bb326620] hover:bg-[#982650]" : tone === "light" ? "bg-[#e5edf6] text-[#32455f] hover:bg-[#d9e5f2]" : "bg-white/8 text-slate-100 hover:bg-white/15"} min-h-11 touch-manipulation rounded-md px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1aa8b8] ${className}`}
    />
  );
}
