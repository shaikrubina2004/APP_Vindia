import { useEffect } from "react";

// Small accessible dialog used by the client incident / RFI pages.
export default function ClientModal({ title, onClose, children, wide = false }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="cl-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`cl-modal${wide ? " cl-modal--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="cl-modal__head">
          <h2>{title}</h2>
          <button type="button" className="cl-modal__close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="cl-modal__body">{children}</div>
      </div>
    </div>
  );
}
