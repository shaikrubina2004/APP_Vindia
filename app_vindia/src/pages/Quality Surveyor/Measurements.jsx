import { useState } from "react";
import "./Measurements.css";

const Measurements = () => {

  const [boqItems] = useState([
    { id: 1, name: "Excavation", unit: "m³" },
    { id: 2, name: "PCC", unit: "m³" },
    { id: 3, name: "RCC", unit: "m³" },
    { id: 4, name: "Steel", unit: "MT" },
  ]);

  const [records, setRecords] = useState([]);

  const [form, setForm] = useState({
    boqId: "",
    quantity: "",
    location: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.boqId || !form.quantity) {
      alert("Please fill required fields");
      return;
    }

    setRecords([
      ...records,
      {
        ...form,
        quantity: Number(form.quantity),
      },
    ]);

    setForm({
      boqId: "",
      quantity: "",
      location: "",
      date: new Date().toISOString().split("T")[0],
      remarks: "",
    });
  };

  return (
    <div className="measure-container">

      <h2>Measurements</h2>

      {/* FORM */}
      <div className="measure-form">
        <form onSubmit={handleSubmit}>

          <select name="boqId" value={form.boqId} onChange={handleChange}>
            <option value="">Select BOQ Item</option>
            {boqItems.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            value={form.quantity}
            onChange={handleChange}
          />

          <input
            type="text"
            name="location"
            placeholder="Location"
            value={form.location}
            onChange={handleChange}
          />

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
          />

          <input
            type="text"
            name="remarks"
            placeholder="Remarks (optional)"
            value={form.remarks}
            onChange={handleChange}
          />

          <button type="submit">Add Measurement</button>

        </form>
      </div>

      {/* LIST */}
      <div className="measure-list">
        <h3>Recent Measurements</h3>

        {records.length === 0 ? (
          <p className="empty">No data</p>
        ) : (
          records.map((r, i) => {
            const boq = boqItems.find((b) => b.id == r.boqId);

            return (
              <div key={i} className="record">

                <div>
                  <span className="tag">{boq?.name}</span>
                  <h4>{r.quantity} {boq?.unit}</h4>
                  <p>{r.location}</p>
                  <small>{r.date}</small>
                  {r.remarks && <p className="remarks">{r.remarks}</p>}
                </div>

                <span className="status">Saved</span>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default Measurements;