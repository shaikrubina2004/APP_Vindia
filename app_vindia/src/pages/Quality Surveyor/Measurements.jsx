import { useState } from "react";
import "./Measurements.css";

export default function Measurements() {
  const [data, setData] = useState([
    { id: 1, item: "Excavation", unit: "m³", qty: 120, date: "2026-04-20" },
    { id: 2, item: "Concrete Work", unit: "m³", qty: 60, date: "2026-04-21" },
  ]);

  const [form, setForm] = useState({
    item: "",
    unit: "",
    qty: "",
    date: "",
  });

  const handleAdd = () => {
    if (!form.item || !form.qty) return;

    const newEntry = {
      id: Date.now(),
      ...form,
    };

    setData([newEntry, ...data]);
    setForm({ item: "", unit: "", qty: "", date: "" });
  };

  return (
    <div className="ms-page">
      {/* Header */}
      <div className="ms-header">
        <div>
          <h2>Measurements</h2>
          <p>Record and manage site measurements</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="ms-card">
        <div className="ms-form">
          <input
            placeholder="Item"
            value={form.item}
            onChange={(e) => setForm({ ...form, item: e.target.value })}
          />
          <input
            placeholder="Unit"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />

          <button onClick={handleAdd}>Add</button>
        </div>
      </div>

      {/* Table Card */}
      <div className="ms-card">
        <table className="ms-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Unit</th>
              <th>Quantity</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {data.map((d, i) => (
              <tr key={d.id}>
                <td>{i + 1}</td>
                <td>{d.item}</td>
                <td>{d.unit}</td>
                <td>{d.qty}</td>
                <td>{d.date || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}