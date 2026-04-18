import { useState } from "react";
import "./rfi.css";
import CreateRFI from "./CreateRFI";
import { useNavigate } from "react-router-dom";

const dummyRFI = [
  {
    id: "RFI-001",
    project: "Sky Tower",
    subject: "Beam Reinforcement Clarification",
    raisedBy: "Site Engineer",
    assignedTo: "Structural Engineer",
    priority: "High",
    status: "Pending",
    date: "2026-04-16",
  },
  {
    id: "RFI-002",
    project: "Mall Project",
    subject: "Column Size Mismatch",
    raisedBy: "Site Engineer",
    assignedTo: "Structural Engineer",
    priority: "Medium",
    status: "Answered",
    date: "2026-04-15",
  },
];

export default function RFI() {
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate(); // ✅ FIXED (inside component)

  const filteredData =
    filter === "All"
      ? dummyRFI
      : dummyRFI.filter((rfi) => rfi.status === filter);

  return (
    <div className="rfi-wrapper">
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2 className="rfi-title">RFI Management</h2>

        <button
          className="rfi-add-btn"
          onClick={() => setShowModal(true)}
        >
          + Add RFI
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="rfi-cards">
        <div className="rfi-card total">Total RFIs <strong>12</strong></div>
        <div className="rfi-card open">Open <strong>5</strong></div>
        <div className="rfi-card pending">Pending <strong>4</strong></div>
        <div className="rfi-card closed">Closed <strong>3</strong></div>
      </div>

      {/* FILTER TABS */}
      <div className="rfi-tabs">
        {["All", "Pending", "Answered"].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? "active" : ""}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="rfi-table-container">
        <table className="rfi-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Subject</th>
              <th>Raised By</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((rfi, index) => (
              <tr
                key={index}
                onClick={() =>
                  navigate(`/structural-engineer/rfi/${rfi.id}`)
                }
                style={{ cursor: "pointer" }}
              >
                <td>{rfi.id}</td>
                <td>{rfi.project}</td>
                <td>{rfi.subject}</td>
                <td>{rfi.raisedBy}</td>

                <td className={`priority ${rfi.priority.toLowerCase()}`}>
                  {rfi.priority}
                </td>

                <td className={`status ${rfi.status.toLowerCase()}`}>
                  {rfi.status}
                </td>

                <td>{rfi.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <CreateRFI
          onClose={() => setShowModal(false)}
          refresh={() => window.location.reload()}
        />
      )}
    </div>
  );
}