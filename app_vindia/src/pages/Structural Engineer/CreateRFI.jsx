import { useState } from "react";

import "./RFI.css";

export default function CreateRFI({ onClose, onCreate }) {
  const [form, setForm] = useState({
    project: "",
    subject: "",
    priority: "Medium",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    onCreate({
      project: form.project,
      subject: form.subject,
      priority: form.priority,
    });

    onClose(); // close modal after submit
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>Create New RFI</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>Project</label>
          <input
            type="text"
            value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })}
            required
          />

          <label>Subject</label>
          <textarea
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />

          <label>Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>

            <button type="submit" className="submit-btn">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
