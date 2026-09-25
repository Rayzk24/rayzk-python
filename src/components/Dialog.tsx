import { useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  children,
  onClose,
  onSubmit,
  confirm = "Valider",
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  confirm?: string;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const el = ref.current;
    return () => el?.close();
  }, []);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit(new FormData(e.currentTarget));
  }
  return (
    <dialog ref={ref} onCancel={onClose} aria-labelledby="dialog-title">
      <form onSubmit={submit}>
        <div className="dialog-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {children}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            Annuler
          </button>
          <button className={danger ? "danger-button" : "primary"}>
            {confirm}
          </button>
        </div>
      </form>
    </dialog>
  );
}
