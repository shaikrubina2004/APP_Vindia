import { useState } from "react";
import "./Measurements.css";

const Measurements = () => {
  const [data, setData] = useState([]);

  const [form, setForm] = useState({
    type: "",
    location: "",
    qty: "",
    unit: "m³",
    length: "",
    width: "",
    height: "",
    nos: "",
    date: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calculateQty = () => {
    return (
      Number(form.length || 0) *
      Number(form.width || 0) *
      Number(form.height || 0) *
      Number(form.nos || 1)
    );
  };

  const handleAdd = () => {
    if (!form.type || !form.location) return;

    const quantity = form.qty || calculateQty();

    const newItem = {
      ...form,
      qty: Number(quantity),
      status: "pending",
    };

    setData([newItem, ...data]);

    setForm({
      type: "",
      location: "",
      qty: "",
      unit: "m³",
      length: "",
      width: "",
      height: "",
      nos: "",
      date: "",
    });
  };

  const updateStatus = (i, status) => {
    const updated = [...data];
    updated[i].status = status;
    setData(updated);
  };

  return (
    <div className="measure-container">

      <h2 className="title">Measurement Management</h2>

      {/* CARDS */}
     <div className="cards">

  <div className="card purple">
    <p>Total</p>
    <h3>{data.length}</h3>
  </div>

  <div className="card green">
    <p>Approved</p>
    <h3>{data.filter(d => d.status === "approved").length}</h3>
  </div>

  <div className="card orange">
    <p>Pending</p>
    <h3>{data.filter(d => d.status === "pending").length}</h3>
  </div>

</div>

      {/* FORM */}
      <div className="box">
        <h3>Add Measurement</h3>

        <div className="form-grid">
          <input name="type" placeholder="Work Type" value={form.type} onChange={handleChange} />
          <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
          <input name="qty" type="number" placeholder="Manual Qty" value={form.qty} onChange={handleChange} />
          <select name="unit" value={form.unit} onChange={handleChange}>
            <option>m³</option>
            <option>m²</option>
            <option>nos</option>
          </select>

          <input name="length" type="number" placeholder="L" value={form.length} onChange={handleChange} />
          <input name="width" type="number" placeholder="W" value={form.width} onChange={handleChange} />
          <input name="height" type="number" placeholder="H" value={form.height} onChange={handleChange} />
          <input name="nos" type="number" placeholder="Nos" value={form.nos} onChange={handleChange} />

          <input name="date" type="date" value={form.date} onChange={handleChange} />

          <button className="add-btn" onClick={handleAdd}>
            Add Measurement
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="box">
        <h3>Measurements</h3>

        {data.length === 0 ? (
          <p className="empty">No measurements added</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Work</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {data.map((d, i) => (
                  <tr key={i}>
                    <td>{d.type}</td>
                    <td>{d.location}</td>
                    <td>{d.qty} {d.unit}</td>
                    <td>{d.date || "-"}</td>

                    <td>
                      <span className={`status ${d.status}`}>
                        {d.status}
                      </span>
                    </td>

                    <td>
                      {d.status === "pending" && (
                        <>
                        <button className="approve-btn" onClick={() => updateStatus(i, "approved")}>
  Approve
</button>

<button className="reject-btn" onClick={() => updateStatus(i, "rejected")}>
  Reject
</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Measurements;