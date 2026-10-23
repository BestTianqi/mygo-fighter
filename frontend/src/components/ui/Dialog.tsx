import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
export function Dialog({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className={`m-auto max-h-[90dvh] w-[calc(100%-2rem)] ${wide ? "max-w-5xl" : "max-w-xl"} overflow-y-auto rounded-3xl border border-white/15 bg-slate-950 p-6 text-slate-100 shadow-2xl backdrop:bg-slate-950/85 backdrop:backdrop-blur-md`}
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button onClick={onClose} aria-label="关闭">
          ×
        </Button>
      </header>
      {children}
    </dialog>
  );
}
