import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      className="dialog native-dialog"
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="section-head">
        <h2>{title}</h2>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="Fechar"
          onClick={close}
        >
          <X size={18} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
