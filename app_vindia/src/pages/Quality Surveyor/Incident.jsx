import { useState } from "react";
import "./Incident.css";

export default function Incident() {
  const [incidents, setIncidents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    type: "",
    impact: "",
  });

  const handleAdd = () => {
    if (!form.title) return;

    const newIncident = {
      ...form,
      status: "Open",
    };

    setIncidents([...incidents, newIncident]);
    setForm({ title: "", type: "", impact: "" });
  };

  const handleDelete = (index) => {
    setIncidents(incidents.filter((_, i) => i !== index));
  };

  const handleClose = (index) => {
    const updated = [...incidents];
    updated[index].status = "Closed";
    setIncidents(updated);
  };

  return (
    <div>
      <h2>Incident Management</h2>

      <input
        placeholder="Title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <input
        placeholder="Type (Delay/Safety/Material)"
        value={form.type}
        onChange={(e) => setForm({ ...form, type: e.target.value })}
      />

      <input
        placeholder="Impact (Cost/Time)"
        value={form.impact}
        onChange={(e) => setForm({ ...form, impact: e.target.value })}
      />

      <button onClick={handleAdd}>Add Incident</button>

      <ul>
        {incidents.map((item, i) => (
          <li key={i}>
            <b>{item.title}</b> | {item.type} | {item.impact} | {item.status}

            <button onClick={() => handleClose(i)}>Close</button>
            <button onClick={() => handleDelete(i)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}