import React, { useEffect, useState } from "react";
import "./Qsquantityreport.css";

export default function Qsquantityreport() {
  const [groupedData, setGroupedData] = useState({});
  const [boqs, setBoqs] = useState([]);

  // 🔹 LOAD BOQ FROM LOCAL STORAGE
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("boqs")) || [];
    setBoqs(data);

    // 🔹 GROUP BY MILESTONE
    const grouped = {};
    data.forEach((b) => {
      if (!grouped[b.milestone]) {
        grouped[b.milestone] = [];
      }
      grouped[b.milestone].push(b);
    });

    setGroupedData(grouped);
  }, []);

  // 🔹 APPROVE (SITE ENGINEER)
  const handleApprove = (id) => {
    const updated = boqs.map((b) =>
      b.id === id ? { ...b, status: "finalised" } : b
    );

    setBoqs(updated);
    localStorage.setItem("boqs", JSON.stringify(updated));

    // 🔁 regroup after update
    const grouped = {};
    updated.forEach((b) => {
      if (!grouped[b.milestone]) {
        grouped[b.milestone] = [];
      }
      grouped[b.milestone].push(b);
    });

    setGroupedData(grouped);

    alert("Quantity Approved ✅");
  };

  return (
    <div className="qr">

      {/* HEADER */}
      <div className="qr-header">
        <h2>Quantity Report</h2>
        <p>Milestone-based quantity approval (Auto from BOQ)</p>
      </div>

      {/* DATA */}
      {Object.keys(groupedData).length === 0 ? (
        <div className="qr-empty">No Quantity Data Found</div>
      ) : (
        Object.keys(groupedData).map((milestone, i) => (
          <div key={i} className="qr-milestone">

            {/* 🔹 MILESTONE TITLE */}
            <h3 className="qr-milestone-title">{milestone}</h3>

            {groupedData[milestone].map((boq) => (
              <div key={boq.id} className="qr-card">

                {/* TOP */}
                <div className="qr-card-top">
                  <div>
                    <h4>{boq.projectName}</h4>
                  </div>

                  <span className={`qr-status ${boq.status}`}>
                    {boq.status}
                  </span>
                </div>

                {/* TABLE */}
                <table className="qr-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Material</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>

                  <tbody>
                    {boq.rows.map((row, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{row.material}</td>
                        <td>{row.unit}</td>
                        <td>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* APPROVE BUTTON */}
                {boq.status === "pending_se" && (
                  <button
                    className="qr-approve-btn"
                    onClick={() => handleApprove(boq.id)}
                  >
                    Approve Quantity (SE)
                  </button>
                )}
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}