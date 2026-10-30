import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "./Button";
export function Dialog({
  title,
  onClose,
  children,
  wide = false,
  viewport = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  viewport?: boolean;
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
      aria-label={title}
      className={`m-auto w-[calc(100%-1rem)] ${viewport ? "flex h-[min(900px,calc(100dvh-1rem))] max-h-[calc(100dvh-1rem)] max-w-[1400px] flex-col overflow-hidden" : `max-h-[90dvh] ${wide ? "max-w-5xl" : "max-w-xl"} overflow-y-auto`} rounded-none   bg-void p-3 text-ivory shadow-2xl backdrop:bg-void/85 sm:p-5 [@media(max-height:500px)]:p-3`}
    >
      <header
        className={
          "mb-3 flex shrink-0 items-center justify-between gap-4   pb-2"
        }
      >
        <h2 className="text-base font-bold">{title}</h2>
        <Button onClick={onClose} aria-label="关闭">
          ×
        </Button>
      </header>
      {children}
    </dialog>
  );
}
