import { useState, useEffect } from "react";
import api from "../../services/api";
export default function RFI() {
  const [form, setForm] = useState({ title: "", description: "" });
  const [rfis, setRFIs] = useState([]);

  const fetchRFIs = async () => {
    const res = await api.get("/rfi");
    setRFIs(res.data);
  };

  useEffect(() => {
    fetchRFIs();
  }, []);

  const submit = async () => {
    await api.post("/rfi", form);
    fetchRFIs();
  };

  return (
    <div>
      <h2>RFI</h2>

      <input
        placeholder="Title"
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <textarea
        placeholder="Description"
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <button onClick={submit}>Submit</button>

      {rfis.map((r) => (
        <div key={r.id}>
          <p>{r.title}</p>
          <p>{r.status}</p>
        </div>
      ))}
    </div>
  );
}