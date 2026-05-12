import { useState } from "react";
import "../../styles/Client.css";

const APPROVALS = [
  {
    id: 1,
    title: "BBMP Building plan sanction",
    icon: "🏛️",
    issuedBy: "BBMP, Bengaluru",
    date: "Feb 12, 2024",
    validity: "3 years",
    status: "approved",
    desc: "Building plan approved for G+8 structure. Approved FAR: 3.25. Reference No: BBMP/2024/BP/00892.",
  },
  {
    id: 2,
    title: "Environmental clearance",
    icon: "🌿",
    issuedBy: "KSPCB",
    date: "Jan 28, 2024",
    validity: "5 years",
    status: "approved",
    desc: "Environmental impact assessment cleared. Rainwater harvesting and STP mandatory as per conditions.",
  },
  {
    id: 3,
    title: "Fire NOC",
    icon: "🔥",
    issuedBy: "Karnataka Fire & Emergency",
    date: "—",
    validity: "—",
    status: "pending",
    desc: "Application submitted on Mar 5, 2024. Site inspection pending. Expected clearance: Jun 2024.",
  },
  {
    id: 4,
    title: "Structural design approval",
    icon: "🏗️",
    issuedBy: "Structural consultant – IIT",
    date: "Jan 20, 2024",
    validity: "Project",
    status: "approved",
    desc: "Structural drawings approved by licensed structural engineer. IS code compliance certified.",
  },
  {
    id: 5,
    title: "Electrical inspector clearance",
    icon: "⚡",
    issuedBy: "BESCOM",
    date: "—",
    validity: "—",
    status: "upcoming",
    desc: "Required before electrical energisation. Scheduled for Q4 2024 after MEP completion.",
  },
  {
    id: 6,
    title: "Occupancy Certificate (OC)",
    icon: "🏠",
    issuedBy: "BBMP",
    date: "—",
    validity: "Permanent",
    status: "upcoming",
    desc: "To be applied after construction completion and final inspection. Estimated Dec 2024.",
  },
];

const STATUS_MAP = {
  approved: ["Approved", "pill--success"],
  pending: ["Pending", "pill--warning"],
  upcoming: ["Upcoming", "pill--neutral"],
};

export default function Approval() {
  const [filter, setFilter] = useState("all");
  const filtered = APPROVALS.filter(
    (a) => filter === "all" || a.status === filter,
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Documents</div>
          <h1 className="cl-page-title">Approvals & Clearances</h1>
          <p className="cl-page-sub">
            Statutory approvals for Greenview Residences – Tower B
          </p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "approved", "pending", "upcoming"].map((f) => (
            <button
              key={f}
              className={`cl-btn ${filter === f ? "cl-btn--primary" : "cl-btn--ghost"}`}
              style={{ padding: "6px 14px", fontSize: "12px" }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        {filtered.map((apr) => {
          const [label, cls] = STATUS_MAP[apr.status];
          return (
            <div key={apr.id} className="apr-card">
              <div className="apr-card__icon">{apr.icon}</div>
              <div className="apr-card__body">
                <div className="apr-card__title">{apr.title}</div>
                <div className="apr-card__meta">
                  Issued by: {apr.issuedBy}
                  {apr.date !== "—" && <> · Date: {apr.date}</>}
                  {apr.validity !== "—" && <> · Validity: {apr.validity}</>}
                </div>
                <div className="apr-card__desc">{apr.desc}</div>
              </div>
              <div className="apr-card__right">
                <span className={`pill ${cls}`}>{label}</span>
                {apr.status === "approved" && (
                  <button className="sf-download-btn" style={{ fontSize: 11 }}>
                    ↓ Certificate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
