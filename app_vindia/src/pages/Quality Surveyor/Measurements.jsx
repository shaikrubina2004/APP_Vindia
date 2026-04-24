import { useState } from "react";
import "./Measurements.css";

function Measurements() {
  const [form, setForm] = useState({
    item: "",
    location: "",
    length: "",
    width: "",
    height: "",
    nos: "",
    unit: "m3"
  });

  const [data, setData] = useState([]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Auto calculation
  const calculateTotal = () => {
    const { length, width, height, nos } = form;
    return (
      (parseFloat(length || 0)) *
      (parseFloat(width || 0)) *
      (parseFloat(height || 0)) *
      (parseFloat(nos || 0))
    ).toFixed(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newEntry = {
      ...form,
      total: calculateTotal(),
      id: Date.now()
    };

    setData([newEntry, ...data]);

    // reset form
    setForm({
      item: "",
      location: "",
      length: "",
      width: "",
      height: "",
      nos: "",
      unit: "m3"
    });
  };

  return (
    <div className="measurement-container">

      {/* LEFT FORM */}
      <div className="measurement-card">
        <h2>📏 Measurement Entry (QS)</h2>

        <form onSubmit={handleSubmit} className="measurement-form">

          <input
            name="item"
            placeholder="BOQ Item (Concrete, Brickwork...)"
            value={form.item}
            onChange={handleChange}
            required
          />

          <input
            name="location"
            placeholder="Location (Floor, Area...)"
            value={form.location}
            onChange={handleChange}
          />

          <div className="row">
            <input name="length" type="number" placeholder="Length" value={form.length} onChange={handleChange} />
            <input name="width" type="number" placeholder="Width" value={form.width} onChange={handleChange} />
            <input name="height" type="number" placeholder="Height" value={form.height} onChange={handleChange} />
          </div>

          <input
            name="nos"
            type="number"
            placeholder="No of Units"
            value={form.nos}
            onChange={handleChange}
          />

          <select name="unit" value={form.unit} onChange={handleChange}>
            <option value="m3">m³</option>
            <option value="m2">m²</option>
            <option value="nos">Nos</option>
          </select>

          <div className="result-box">
            Total Quantity: <b>{calculateTotal()} {form.unit}</b>
          </div>

          <button type="submit">Save Measurement</button>
        </form>
      </div>

      {/* RIGHT TABLE */}
      <div className="measurement-table-card">
        <h3>📋 Measurement Records</h3>

        {data.length === 0 ? (
          <p>No measurements added</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Location</th>
                <th>Dimensions</th>
                <th>Nos</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id}>
                  <td>{d.item}</td>
                  <td>{d.location}</td>
                  <td>{d.length} × {d.width} × {d.height}</td>
                  <td>{d.nos}</td>
                  <td>{d.total} {d.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

export default Measurements;