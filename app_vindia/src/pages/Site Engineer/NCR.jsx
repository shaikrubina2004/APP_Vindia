import { useState, useEffect } from "react";
import api from "../../services/api";
export default function NCR() {
  const [form, setForm] = useState({ title: "", severity: "" });
  const [ncrs, setNCRs] = useState([]);

  const fetchNCRs = async () => {
    const res = await api.get("/ncr");
    setNCRs(res.data);
  };

  useEffect(() => {
    fetchNCRs();
  }, []);

  const submit = async () => {
    await api.post("/ncr", form);
    fetchNCRs();
  };

  return (
    <div>
      <h2>NCR</h2>

      <input
        placeholder="Title"
        onChange={(e) => setForm({ ...form, title: e.target.value })}
      />

      <input
        placeholder="Severity"
        onChange={(e) => setForm({ ...form, severity: e.target.value })}
      />

      <button onClick={submit}>Submit</button>

      {ncrs.map((n) => (
        <div key={n.id}>
          <p>{n.title}</p>
          <p>{n.status}</p>
        </div>
      ))}
    </div>
  );
}