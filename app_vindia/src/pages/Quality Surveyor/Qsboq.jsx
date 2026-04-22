import { useState } from "react";
import "./Qsboq.css";

const Qsboq = () => {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    item: "",
    quantity: "",
    unit: "",
    rate: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.item || !form.quantity || !form.rate) return;

    const newItem = {
      ...form,
      quantity: Number(form.quantity),
      rate: Number(form.rate),
      total: Number(form.quantity) * Number(form.rate),
    };

    setItems([...items, newItem]);
    setForm({ item: "", quantity: "", unit: "", rate: "" });
  };

  const handleDelete = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalCost = items.reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="qsboq-container">

      {/* HEADER */}
      <div className="qsboq-header">
        <h2>BOQ Management</h2>
        <button className="add-btn">+ Add Item</button>
      </div>

      {/* SUMMARY */}
      <div className="qsboq-cards">
        <div className="card">
          <h4>Total Items</h4>
          <p>{items.length}</p>
        </div>

        <div className="card">
          <h4>Total Cost</h4>
          <p>₹{totalCost}</p>
        </div>
      </div>

      {/* FORM */}
      <div className="qsboq-form">
        <form onSubmit={handleSubmit}>
          <input name="item" placeholder="Item" value={form.item} onChange={handleChange} />
          <input name="quantity" type="number" placeholder="Qty" value={form.quantity} onChange={handleChange} />
          <input name="unit" placeholder="Unit" value={form.unit} onChange={handleChange} />
          <input name="rate" type="number" placeholder="Rate ₹" value={form.rate} onChange={handleChange} />

          <button type="submit" className="submit-btn">Add</button>
        </form>
      </div>

      {/* BOQ LIST */}
      <div className="qsboq-list">
        {items.length === 0 ? (
          <p className="empty">No BOQ items added</p>
        ) : (
          items.map((i, index) => (
            <div key={index} className="boq-item">

              <div className="boq-left">
                <div className="top-row">
                  <span className="boq-badge">BOQ</span>
                  <span className="boq-id">#ITEM-{index + 1}</span>
                </div>

                <h3 className="boq-title">{i.item}</h3>

                <div className="boq-meta">
                  <span>{i.quantity} {i.unit}</span>
                  <span>•</span>
                  <span>₹{i.rate} / unit</span>
                </div>
              </div>

              <div className="boq-right">
                <div className="boq-total">₹{i.total}</div>

                <button
                  className="delete-btn"
                  onClick={() => handleDelete(index)}
                >
                  Delete
                </button>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default Qsboq;