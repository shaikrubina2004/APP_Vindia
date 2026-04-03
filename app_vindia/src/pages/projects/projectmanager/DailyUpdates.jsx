import { useState } from "react";
import "../../../styles/DailyUpdates.css";

export default function DailyUpdates() {
  const [updates, setUpdates] = useState([
    {
      id: 1,
      date: "2026-04-02",
      work: "Foundation excavation completed",
      issues: "Rain delay",
      progress: 60,
    },
  ]);

  const [showModal, setShowModal] = useState(false);

  const [newUpdate, setNewUpdate] = useState({
    date: "",
    work: "",
    issues: "",
    progress: "",
  });

  // ➕ Add Update
  const handleAddUpdate = () => {
    if (!newUpdate.date || !newUpdate.work) {
      alert("Fill required fields");
      return;
    }

    const update = {
      id: Date.now(),
      ...newUpdate,
    };

    setUpdates([update, ...updates]);

    setNewUpdate({
      date: "",
      work: "",
      issues: "",
      progress: "",
    });

    setShowModal(false);
  };

  return (
    <div className="du-page">
      {/* HEADER */}
      <div className="du-header">
        <h1>Daily Updates</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add Update
        </button>
      </div>

      {/* LIST */}
      <div className="du-list">
        {updates.map((u) => (
          <div key={u.id} className="du-card">
            <div className="du-top">
              <span className="du-date">{u.date}</span>
              <span className="du-progress">{u.progress}%</span>
            </div>

            <div className="du-body">
              <p><strong>Work:</strong> {u.work}</p>
              <p><strong>Issues:</strong> {u.issues || "None"}</p>
            </div>

            <div className="du-bar">
              <div
                className="du-fill"
                style={{ width: `${u.progress}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Add Daily Update</h2>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={newUpdate.date}
                onChange={(e) =>
                  setNewUpdate({ ...newUpdate, date: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Work Done *</label>
              <textarea
                value={newUpdate.work}
                onChange={(e) =>
                  setNewUpdate({ ...newUpdate, work: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Issues</label>
              <textarea
                value={newUpdate.issues}
                onChange={(e) =>
                  setNewUpdate({ ...newUpdate, issues: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Progress (%)</label>
              <input
                type="number"
                value={newUpdate.progress}
                onChange={(e) =>
                  setNewUpdate({ ...newUpdate, progress: e.target.value })
                }
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddUpdate}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}