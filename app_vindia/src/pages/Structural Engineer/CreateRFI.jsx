import { useState } from "react";
import axios from "axios";
import "./RFI.css";

export default function CreateRFI({ onClose, refresh }) {
  const [form, setForm] = useState({
    project: "",
    subject: "",
    description: "",
    priority: "Medium",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      await axios.post("http://localhost:5000/api/rfi", form);
      refresh(); // reload table
      onClose(); // close modal
    } catch (err) {
      console.error(err);
      alert("Error creating RFI");
    }
  };

  return (
    <div className="rfi-modal">
      <div className="rfi-modal-content">
        <h3>Create RFI</h3>

        <input
          name="project"
          placeholder="Project Name"
          onChange={handleChange}
        />

        <input
          name="subject"
          placeholder="Subject"
          onChange={handleChange}
        />

        <textarea
          name="description"
          placeholder="Describe the issue..."
          onChange={handleChange}
        />

        <select name="priority" onChange={handleChange}>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>

        <div className="rfi-actions">
          <button onClick={handleSubmit}>Submit</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}