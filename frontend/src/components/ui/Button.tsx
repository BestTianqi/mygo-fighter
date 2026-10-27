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
      className={`${primary ? "bg-[#a44761] text-white shadow-[0_8px_24px_#a4476125] hover:bg-[#8f354e]" : tone === "light" ? "bg-[#30251a]/6 text-[#565045] hover:bg-[#30251a]/12" : "bg-white/8 text-slate-100 hover:bg-white/15"} min-h-11 touch-manipulation rounded-none px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#a44761] ${className}`}
    />
  );
}
