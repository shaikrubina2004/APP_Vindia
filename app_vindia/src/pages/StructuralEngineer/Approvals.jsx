import { useState } from "react";
import "./approvals.css";

const dummyApprovals = [
  {
    id: "APR-001",
    type: "BOQ",
    project: "Sky Tower",
    subject: "Foundation Cost Approval",
    requestedBy: "Quantity Surveyor",
    status: "Pending",
    date: "2026-04-17",
  },
  {
    id: "APR-002",
    type: "Drawing",
    project: "Mall Project",
    subject: "Column Layout Drawing",
    requestedBy: "Architect",
    status: "Approved",
    date: "2026-04-15",
  },
  {
    id: "APR-003",
    type: "RFI",
    project: "Sky Tower",
    subject: "Beam Clarification",
    requestedBy: "Site Engineer",
    status: "Rejected",
    date: "2026-04-14",
  },
];

export default function Approvals() {
  const [filter, setFilter] = useState("All");

  const filteredData =
    filter === "All"
      ? dummyApprovals
      : dummyApprovals.filter((item) => item.status === filter);

  return (
    <div className="approvals-wrapper">
      <h2 className="approvals-title">Approvals Management</h2>

      {/* CARDS */}
      <div className="approvals-cards">
        <div className="card pending">Pending <strong>5</strong></div>
        <div className="card approved">Approved <strong>8</strong></div>
        <div className="card rejected">Rejected <strong>2</strong></div>
      </div>

      {/* FILTER */}
      <div className="approvals-tabs">
        {["All", "Pending", "Approved", "Rejected"].map((tab) => (
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
      <div className="approvals-table-container">
        <table className="approvals-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Project</th>
              <th>Subject</th>
              <th>Requested By</th>
              <th>Status</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((item, index) => (
              <tr key={index}>
                <td>{item.id}</td>
                <td>{item.type}</td>
                <td>{item.project}</td>
                <td>{item.subject}</td>
                <td>{item.requestedBy}</td>

                <td className={`status ${item.status.toLowerCase()}`}>
                  {item.status}
                </td>

                <td>{item.date}</td>

                <td>
                  <button className="approve-btn">Approve</button>
                  <button className="reject-btn">Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}