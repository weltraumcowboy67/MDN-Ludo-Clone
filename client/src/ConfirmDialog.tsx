import { useEffect, useRef } from "react";
export function ConfirmDialog({
  title,
  busy,
  error,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy?: boolean;
  error?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="confirm-dialog"
      aria-labelledby="confirm-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      {error && <p className="feedback feedback--error" role="alert">{error}</p>}
      <div className="row-actions">
        <button
          className="button-secondary"
          autoFocus
          disabled={busy}
          onClick={onCancel}
        >
          Abbrechen
        </button>
        <button disabled={busy} onClick={onConfirm}>
          {busy ? "Wird gespeichert …" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
