import { useState } from "react";
import "./Qsboq.css";
const Qsboq = () => {
  const { project } = useProject();

  const [drawings] = useState([
    { id: 1, name: "Foundation Plan.pdf" },
    { id: 2, name: "Column Layout.dwg" },
  ]);

  const [items, setItems] = useState([]);

  const [form, setForm] = useState({
    item: "",
    quantity: "",
    unit: "",
    rate: "",
  });

  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState("draft");

  // INPUT CHANGE
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ADD ITEM
  const addItem = () => {
    if (!form.item || !form.quantity || !form.rate) return;

    const newItem = {
      ...form,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
      total: Number(form.quantity) * Number(form.rate),
    };

    setItems([...items, newItem]);

    setForm({
      item: "",
      quantity: "",
      unit: "",
      rate: "",
    });
  };

  // DELETE ITEM
  const deleteItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // SEND TO ENGINEER
  const sendBOQ = () => {
    if (items.length === 0) return;

    setStatus("sent");

    console.log("Sending BOQ:", {
      project,
      items,
      remarks,
    });
  };

  const totalCost = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="qsboq-container">

      {/* HEADER */}
      <div className="qsboq-header">
        <h2>BOQ Preparation</h2>
        <span>Project: {project}</span>
      </div>

      {/* DRAWINGS */}
      <div className="box">
        <h3>Received Drawings</h3>

        {drawings.map((d) => (
          <div key={d.id} className="drawing-item">
            📄 {d.name}
          </div>
        ))}
      </div>

      {/* FORM */}
      <div className="box">
        <h3>Add BOQ Item</h3>

        <div className="form-grid">
          <input
            name="item"
            placeholder="Item"
            value={form.item}
            onChange={handleChange}
          />

          <input
            name="quantity"
            type="number"
            placeholder="Qty"
            value={form.quantity}
            onChange={handleChange}
          />

          <input
            name="unit"
            placeholder="Unit"
            value={form.unit}
            onChange={handleChange}
          />

          <input
            name="rate"
            type="number"
            placeholder="Rate ₹"
            value={form.rate}
            onChange={handleChange}
          />

          <button onClick={addItem}>Add</button>
        </div>
      </div>

      {/* LIST */}
      <div className="box">
        <h3>BOQ Items</h3>

        {items.length === 0 ? (
          <p className="empty">No items added</p>
        ) : (
          items.map((i, index) => (
            <div key={index} className="boq-item">

              <div className="left">
                <h4>{i.item}</h4>
                <p>{i.quantity} {i.unit} × ₹{i.rate}</p>
              </div>

              <div className="right">
                <span className="total">₹{i.total}</span>

                <button
                  className="delete"
                  onClick={() => deleteItem(index)}
                >
                  ✖
                </button>
              </div>

            </div>
          ))
        )}

        <div className="total-box">
          Total Cost: ₹{totalCost}
        </div>
      </div>

      {/* REMARKS */}
      <div className="box">
        <h3>Suggestions / Remarks</h3>

        <textarea
          placeholder="Write your suggestions..."
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
        />
      </div>

      {/* ACTION */}
      <div className="actions">
        <button className="send-btn" onClick={sendBOQ}>
          Send BOQ to Engineer
        </button>

        <span className={`status ${status}`}>
          {status.toUpperCase()}
        </span>
      </div>

    </div>
  );
};

export default Qsboq;