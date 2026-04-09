import { useState } from "react";
import api from "../../services/api";
export default function DailyDiary() {
  const [form, setForm] = useState({
    weather: "",
    work_done: "",
    labour_skilled: "",
    labour_unskilled: "",
  });

  const handleSubmit = async () => {
    await API.post("/daily-report", form);
    alert("Report Submitted");
  };

  return (
    <div>
      <h2>Daily Diary</h2>

      <input
        placeholder="Weather"
        onChange={(e) => setForm({ ...form, weather: e.target.value })}
      />

      <textarea
        placeholder="Work Done"
        onChange={(e) => setForm({ ...form, work_done: e.target.value })}
      />

      <input
        placeholder="Skilled Labour"
        onChange={(e) =>
          setForm({ ...form, labour_skilled: e.target.value })
        }
      />

      <input
        placeholder="Unskilled Labour"
        onChange={(e) =>
          setForm({ ...form, labour_unskilled: e.target.value })
        }
      />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}