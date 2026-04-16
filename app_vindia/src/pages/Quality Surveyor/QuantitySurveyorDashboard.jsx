import React, { useState } from "react";
import "./QuantitySurveyorDashboard.css";

const QuantitySurveyorDashboard = () => {
  const [boq, setBoq] = useState([
    {
      id: 1,
      item: "Excavation",
      qty: 120,
      unit: "m3",
      rate: 250,
      milestone: "Foundation",
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showMsgBox, setShowMsgBox] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [msgText, setMsgText] = useState("");

  const [form, setForm] = useState({
    item: "",
    qty: "",
    unit: "",
    rate: "",
    milestone: "",
  });

  const totalQty = boq.reduce((sum, i) => sum + i.qty, 0);
  const totalCost = boq.reduce((sum, i) => sum + i.qty * i.rate, 0);

  return (
    <div className="qs-page">

      {/* HEADER */}
      <div className="qs-header">
        <div className="qs-header-left">
          <div className="qs-role">QS</div>
          <div>
            <h1>Quantity Surveyor Dashboard</h1>
            <p>BOQ · Billing · Cost Control</p>
          </div>
        </div>

        <div className="qs-stats">
          <div className="qs-stat">
            <h3>{boq.length}</h3>
            <p>Items</p>
          </div>
          <div className="qs-stat">
            <h3>{totalQty}</h3>
            <p>Total Qty</p>
          </div>
          <div className="qs-stat highlight">
            <h3>₹{totalCost}</h3>
            <p>Total Cost</p>
          </div>
        </div>
      </div>

      {/* ADD BUTTON */}
      <div className="qs-topbar">
        <button className="qs-add-btn" onClick={() => setShowForm(true)}>
          + Add BOQ
        </button>
      </div>

      {/* FORM */}
      {showForm && (
        <div className="qs-form-card">
          <div className="qs-form-header">
            <h3>Add BOQ Item</h3>
            <button onClick={() => setShowForm(false)}>✕</button>
          </div>

          <div className="qs-form-grid">
            <input
              placeholder="Item Name"
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
            />

            <input
              placeholder="Quantity"
              type="number"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: e.target.value })}
            />

            <input
              placeholder="Unit (m3, kg)"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />

            <input
              placeholder="Rate"
              type="number"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
            />

            <input
              placeholder="Milestone"
              value={form.milestone}
              onChange={(e) =>
                setForm({ ...form, milestone: e.target.value })
              }
            />
          </div>

          <div className="qs-form-actions">
            <button onClick={() => setShowForm(false)}>Cancel</button>

            <button
              className="qs-save-btn"
              onClick={() => {
                if (!form.item.trim()) {
                  alert("Enter item name");
                  return;
                }

                if (!form.qty || Number(form.qty) <= 0) {
                  alert("Enter valid quantity");
                  return;
                }

                if (!form.rate || Number(form.rate) <= 0) {
                  alert("Enter valid rate");
                  return;
                }

                const newItem = {
                  id: Date.now(),
                  item: form.item,
                  qty: Number(form.qty),
                  unit: form.unit || "",
                  rate: Number(form.rate),
                  milestone: form.milestone || "General",
                };

                setBoq((prev) => [...prev, newItem]);

                setForm({
                  item: "",
                  qty: "",
                  unit: "",
                  rate: "",
                  milestone: "",
                });

                setShowForm(false);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* MESSAGE BOX */}
      {showMsgBox && (
        <div className="qs-form-card">
          <div className="qs-form-header">
            <h3>Send Issue to Structural Engineer</h3>
            <button onClick={() => setShowMsgBox(false)}>✕</button>
          </div>

          <textarea
            className="qs-textarea"
            placeholder="Describe issue..."
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
          />

          <div className="qs-form-actions">
            <button onClick={() => setShowMsgBox(false)}>Cancel</button>

            <button
              className="qs-save-btn"
              onClick={() => {
                if (!msgText.trim()) {
                  alert("Enter message");
                  return;
                }

                const newMsg = {
                  id: Date.now(),
                  boqId: selectedItem,
                  message: msgText,
                };

                setMessages([...messages, newMsg]);
                setMsgText("");
                setShowMsgBox(false);
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* BOQ GRID */}
      <div className="qs-grid">
        {boq.map((b) => (
          <div key={b.id} className="qs-item-card">
            <div className="qs-item-top">
              <h4>{b.item}</h4>
              <span className="qs-badge">{b.milestone}</span>
            </div>

            <div className="qs-item-middle">
              <span>
                Qty: {b.qty} {b.unit}
              </span>
              <span>Rate: ₹{b.rate}</span>
            </div>

            <div className="qs-item-bottom">
              ₹{b.qty * b.rate}
            </div>

            <button
              className="qs-msg-btn"
              onClick={() => {
                setSelectedItem(b.id);
                setShowMsgBox(true);
              }}
            >
              Raise Issue
            </button>
          </div>
        ))}
      </div>

      {/* MESSAGES */}
      <h3 style={{ marginTop: "25px" }}>Issues Sent</h3>

      {messages.map((m) => (
        <div key={m.id} className="qs-message-card">
          <p><strong>BOQ ID:</strong> {m.boqId}</p>
          <p>{m.message}</p>
        </div>
      ))}
    </div>
  );
};

export default QuantitySurveyorDashboard;