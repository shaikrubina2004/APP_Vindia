import "./Qsboq.css";
import { useState } from "react";

export default function QsBoq() {

  const [boqData, setBoqData] = useState([
    {
      id: 1,
      item: "Steel Work",
      quantity: "85 tons",
      cost: "₹12,00,000",
      status: "pending",
    },
    {
      id: 2,
      item: "Concrete Work",
      quantity: "120 m³",
      cost: "₹8,50,000",
      status: "pending",
    },
    {
      id: 3,
      item: "Brick Work",
      quantity: "5000 units",
      cost: "₹3,20,000",
      status: "approved",
    }
  ]);

  const [rejectBox, setRejectBox] = useState(null);
  const [reason, setReason] = useState("");

  const approveBOQ = (id) => {
    setBoqData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: "approved" } : item
      )
    );
  };

  const openReject = (id) => {
    setRejectBox(id);
  };

  const submitReject = () => {
    setBoqData(prev =>
      prev.map(item =>
        item.id === rejectBox
          ? { ...item, status: "rejected", reason }
          : item
      )
    );
    setRejectBox(null);
    setReason("");
  };

  return (
    <div className="qsboq">

      <h2>BOQ Approval</h2>

      <div className="boq-grid">
        {boqData.map((boq) => (
          <div className="boq-card" key={boq.id}>

            <div className="boq-top">
              <h3>{boq.item}</h3>
              <span className={`status ${boq.status}`}>
                {boq.status}
              </span>
            </div>

            <p><b>Quantity:</b> {boq.quantity}</p>
            <p><b>Cost:</b> {boq.cost}</p>

            {boq.reason && (
              <p className="reason">Reason: {boq.reason}</p>
            )}

            {boq.status === "pending" && (
              <div className="actions">
                <button className="approve" onClick={() => approveBOQ(boq.id)}>
                  Approve
                </button>
                <button className="reject" onClick={() => openReject(boq.id)}>
                  Reject
                </button>
              </div>
            )}

          </div>
        ))}
      </div>

      {/* REJECT MODAL */}
      {rejectBox && (
        <div className="modal">
          <div className="modal-box">
            <h3>Reject BOQ</h3>

            <textarea
              placeholder="Enter reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={submitReject}>Submit</button>
              <button onClick={() => setRejectBox(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}