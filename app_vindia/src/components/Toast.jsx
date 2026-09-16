import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import "./Toast.css";

/**
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   setToast({ type: "success", text: "Item saved" });
 *   <Toast toast={toast} onClose={() => setToast(null)} />
 */
const Toast = ({ toast, onClose, duration = 3000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), duration - 200);
    const t2 = setTimeout(() => onClose?.(), duration);
    return () => { clearTimeout(t); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  if (!toast) return null;
  const isError = toast.type === "error";

  return (
    <div className="toast-wrap">
      <div className={`toast-box ${isError ? "toast-error" : "toast-success"} ${visible ? "toast-visible" : "toast-hidden"}`}>
        {isError ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
        <span>{toast.text}</span>
        <button className="toast-close" onClick={() => { setVisible(false); setTimeout(onClose, 150); }}>
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default Toast;