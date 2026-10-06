import { useEffect, useState } from "react";
import { X } from "lucide-react";

/* Modal built on the ops-modal-* classes (they start at opacity 0 and rely on
   the `ops-modal-show` class, hence the animation-frame toggle). */
export default function OpsModal({ title, onClose, children, footer, wide = false }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      className={`ops-modal-overlay ${show ? "ops-modal-show" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className={`ops-modal ${wide ? "ops-modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="ops-modal-header">
          <h2>{title}</h2>
          <button type="button" className="ops-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
        {footer && <div className="ops-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
