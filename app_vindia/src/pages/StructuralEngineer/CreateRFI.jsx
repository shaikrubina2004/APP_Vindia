// FILE PATH: src/pages/RFI/CreateRFIModal.jsx

import { useState, useRef } from "react";
import { createRFI, ROLE_OPTIONS } from "../../api/rfiApi";
import "./RFI.css";

export default function CreateRFIModal({ myRole, onClose, onCreated }) {
  const [form, setForm] = useState({
    subject:          "",
    description:      "",
    priority:         "medium",
    assigned_to_role: "",
    project_name:     "",
  });
  const [file,      setFile]      = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const fileRef = useRef();

  const assignableRoles = ROLE_OPTIONS.filter((r) => r.value !== myRole);

  const handle = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    if (!form.subject.trim() || !form.assigned_to_role) {
      setError("Subject and Assigned To are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      await createRFI(fd);
      onCreated();
    } catch (err) {
      setError("Failed to create RFI. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rfi-modal-overlay" onClick={onClose}>
      <div className="rfi-modal" onClick={(e) => e.stopPropagation()}>

        <div className="rfi-modal-header">
          <h2>Raise New RFI</h2>
          <button className="rfi-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="rfi-modal-body">
          {error && <p className="rfi-modal-error">{error}</p>}

          <label>Subject <span className="req">*</span></label>
          <input name="subject" value={form.subject}
                 onChange={handle} placeholder="Brief description of the query" />

          <label>Assign To <span className="req">*</span></label>
          <select name="assigned_to_role" value={form.assigned_to_role} onChange={handle}>
            <option value="">— Select role —</option>
            {assignableRoles.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <div className="rfi-modal-row">
            <div>
              <label>Priority</label>
              <select name="priority" value={form.priority} onChange={handle}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label>Project</label>
              <input name="project_name" value={form.project_name}
                     onChange={handle} placeholder="Project name (optional)" />
            </div>
          </div>

          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handle}
                    rows={4} placeholder="Provide full context, drawings refs, location, etc." />

          <label>Attachment <span className="rfi-optional">(optional)</span></label>
          <div className="rfi-file-area" onClick={() => fileRef.current.click()}>
            {file
              ? <span>📎 {file.name}</span>
              : <span>Click to attach a file (PDF, image, DWG, etc.) — max 10 MB</span>}
            <input ref={fileRef} type="file" style={{ display: "none" }}
                   onChange={(e) => setFile(e.target.files[0])} />
          </div>
          {file && (
            <button className="rfi-remove-file" onClick={() => setFile(null)}>
              ✕ Remove file
            </button>
          )}
        </div>

        <div className="rfi-modal-footer">
          <button className="rfi-btn-outline" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="rfi-btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Submitting…" : "Submit RFI"}
          </button>
        </div>

      </div>
    </div>
  );
}