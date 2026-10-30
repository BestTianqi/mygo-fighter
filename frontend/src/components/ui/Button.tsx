import type { ButtonHTMLAttributes } from "react";
export function Button({
  primary = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  primary?: boolean;
}) {
  return (
    <button
      {...props}
      className={`${primary ? "bg-crimson text-white hover:bg-crimson-hover" : "bg-panel text-ivory hover:bg-raised"} min-h-11 touch-manipulation rounded-none px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ember ${className}`}
    />
  );
}
