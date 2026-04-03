import { useState } from "react";
import "../../../styles/Incidents.css";

export default function Incidents() {
  const [incidents, setIncidents] = useState([
    {
      id: 1,
      title: "Material not available",
      priority: "P1",
      assignedTo: "Site Engineer",
      status: "Open",
    },
  ]);

  const [showModal, setShowModal] = useState(false);

  const [newIncident, setNewIncident] = useState({
    title: "",
    priority: "P2",
    assignedTo: "",
  });

  // ➕ Add Incident
  const handleAddIncident = () => {
    if (!newIncident.title || !newIncident.assignedTo) {
      alert("Fill all fields");
      return;
    }

    const incident = {
      id: Date.now(),
      ...newIncident,
      status: "Open",
    };

    setIncidents([incident, ...incidents]);

    setNewIncident({
      title: "",
      priority: "P2",
      assignedTo: "",
    });

    setShowModal(false);
  };

  // 🔄 Update Status
  const updateStatus = (id, status) => {
    setIncidents((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status } : i))
    );
  };

  return (
    <div className="inc-page">
      {/* HEADER */}
      <div className="inc-header">
        <h1>Incidents</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Create Incident
        </button>
      </div>

      {/* INCIDENT LIST */}
      <div className="inc-table">
        <div className="inc-row header">
          <div>Title</div>
          <div>Priority</div>
          <div>Assigned To</div>
          <div>Status</div>
          <div>Action</div>
        </div>

        {incidents.map((inc) => (
          <div key={inc.id} className="inc-row">
            <div>{inc.title}</div>

            <div className={`priority ${inc.priority.toLowerCase()}`}>
              {inc.priority}
            </div>

            <div>{inc.assignedTo}</div>

            <div>
              <span className={`status ${inc.status.toLowerCase()}`}>
                {inc.status}
              </span>
            </div>

            <div>
              {inc.status !== "Closed" && (
                <>
                  <button
                    className="btn-small"
                    onClick={() => updateStatus(inc.id, "In Progress")}
                  >
                    Start
                  </button>

                  <button
                    className="btn-small green"
                    onClick={() => updateStatus(inc.id, "Closed")}
                  >
                    Close
                  </button>
                </>
              )}
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
            <h2>Create Incident</h2>

            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={newIncident.title}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, title: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={newIncident.priority}
                onChange={(e) =>
                  setNewIncident({ ...newIncident, priority: e.target.value })
                }
              >
                <option>P1 (High)</option>
                <option>P2 (Medium)</option>
                <option>P3 (Low)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Assign To</label>
              <input
                type="text"
                placeholder="e.g Site Engineer"
                value={newIncident.assignedTo}
                onChange={(e) =>
                  setNewIncident({
                    ...newIncident,
                    assignedTo: e.target.value,
                  })
                }
              />
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAddIncident}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}