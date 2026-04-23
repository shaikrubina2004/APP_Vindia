import { useState } from "react";
import "./Measurements.css";
import { useProject } from "../context/ProjectContext";

const Measurements = () => {
  const { project } = useProject();

  const [data, setData] = useState([]);
  const [form, setForm] = useState({
    type: "",
    location: "",
    length: "",
    width: "",
    height: "",
    nos: "",
    unit: "m³",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const calculateQty = () => {
    return (
      Number(form.length) *
      Number(form.width) *
      Number(form.height) *
      Number(form.nos || 1)
    );
  };

  const handleAdd = () => {
    if (!form.type || !form.length || !form.width || !form.height) return;

    const qty = calculateQty();

    const newItem = {
      ...form,
      project,
      qty,
      status: "pending",
    };

    setData([...data, newItem]);

    setForm({
      type: "",
      location: "",
      length: "",
      width: "",
      height: "",
      nos: "",
      unit: "m³",
    });
  };

  const approveItem = (index) => {
    const updated = [...data];
    updated[index].status = "approved";
    setData(updated);
  };

  const rejectItem = (index) => {
    const updated = [...data];
    updated[index].status = "rejected";
    setData(updated);
  };

  const convertToBOQ = (item) => {
    console.log("Convert to BOQ:", item);
    // later connect with BOQ page
  };

  const filteredData = data.filter((d) => d.project === project);

  return (
    <div className="measure-container">

      {/* HEADER */}
      <div className="measure-header">
        <h2>Measurements</h2>
        <span>Project: {project}</span>
      </div>

      {/* FORM */}
      <div className="measure-form">

        <input name="type" placeholder="Work Type" value={form.type} onChange={handleChange} />
        <input name="location" placeholder="Location" value={form.location} onChange={handleChange} />

        <input name="length" type="number" placeholder="Length" value={form.length} onChange={handleChange} />
        <input name="width" type="number" placeholder="Width" value={form.width} onChange={handleChange} />
        <input name="height" type="number" placeholder="Height" value={form.height} onChange={handleChange} />

        <input name="nos" type="number" placeholder="Nos" value={form.nos} onChange={handleChange} />

        <select name="unit" value={form.unit} onChange={handleChange}>
          <option>m³</option>
          <option>m²</option>
          <option>nos</option>
        </select>

        <button onClick={handleAdd}>Add</button>
      </div>

      {/* TABLE */}
      <div className="measure-table">
        {filteredData.length === 0 ? (
          <p className="empty">No measurements</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Work</th>
                <th>Location</th>
                <th>Dimensions</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredData.map((d, i) => (
                <tr key={i}>
                  <td>{d.type}</td>
                  <td>{d.location}</td>
                  <td>{d.length}×{d.width}×{d.height} × {d.nos || 1}</td>
                  <td>{d.qty} {d.unit}</td>

                  <td className={`status ${d.status}`}>
                    {d.status}
                  </td>

                  <td className="actions">
                    {d.status === "pending" && (
                      <>
                        <button className="approve" onClick={() => approveItem(i)}>✔</button>
                        <button className="reject" onClick={() => rejectItem(i)}>✖</button>
                      </>
                    )}

                    <button className="boq" onClick={() => convertToBOQ(d)}>
                      BOQ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}
      </div>

    </div>
  );
};

export default Measurements;