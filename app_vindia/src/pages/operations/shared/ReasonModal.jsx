import { useState } from "react";
import OpsModal from "./OpsModal";

/* Asks for a reason (rejections / cancellations) before confirming. */
export default function ReasonModal({
  title, description, label = "Reason", confirmText = "Confirm",
  danger = true, required = true, onConfirm, onClose,
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (required && !reason.trim()) {
      setError(`${label} is required`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Failed");
      setBusy(false);
    }
  };

  return (
    <OpsModal
      title={title}
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <button className="ops-btn ops-btn-outline" onClick={onClose} disabled={busy}>Cancel</button>
          <button className={`ops-btn ${danger ? "ops-btn-danger" : "ops-btn-primary"}`} onClick={submit} disabled={busy}>
            {busy ? "Saving…" : confirmText}
          </button>
        </>
      }
    >
      {description && <p className="ops-muted" style={{ margin: 0 }}>{description}</p>}
      <div className="ops-form-group">
        <label className="ops-label">{label}{required ? " *" : ""}</label>
        <textarea className="ops-textarea" rows={3} value={reason} autoFocus
          onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}
    </OpsModal>
  );
}
