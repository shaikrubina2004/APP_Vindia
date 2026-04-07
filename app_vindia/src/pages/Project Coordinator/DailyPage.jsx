import React, { useState } from "react";
import "./CoordinatorPages.css";

export default function DailyPage() {
  const [form, setForm] = useState({
    work: "",
    issues: "",
    pending: "",
    next: "",
  });

  return (
    <div className="page-container">
      <h2>Daily Updates</h2>

      <textarea placeholder="Work done"
        onChange={(e)=>setForm({...form, work:e.target.value})} />

      <textarea placeholder="Issues / Incidents"
        onChange={(e)=>setForm({...form, issues:e.target.value})} />

      <textarea placeholder="Pending work"
        onChange={(e)=>setForm({...form, pending:e.target.value})} />

      <textarea placeholder="Tomorrow plan"
        onChange={(e)=>setForm({...form, next:e.target.value})} />

      <button className="btn">Save Update</button>
    </div>
  );
}