import { useState, useEffect } from "react";
import "../../styles/timesheet.css";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Timesheet() {
  const [rows, setRows] = useState(
    days.map(() => ({
      date: "",
      start1: "",
      end1: "",
      start2: "",
      end2: "",
      wbs: "",
      task: "",
    }))
  );

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    handleChange(0, "date", today);
  }, []);

  const calcHours = (s, e) => {
    if (!s || !e) return 0;
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    return Math.max((eh + em / 60) - (sh + sm / 60), 0);
  };

  const getTotal = (r) => {
    let t =
      calcHours(r.start1, r.end1) +
      calcHours(r.start2, r.end2);

    if (t >= 9) t -= 1;
    else if (t >= 5) t -= 0.5;

    return t;
  };

  const totalHours = rows.reduce((s, r) => s + getTotal(r), 0);

  const handleChange = (i, field, val) => {
    const updated = [...rows];
    updated[i][field] = val;

    if (field === "date" && !rows[i].start1) {
      updated[i].start1 = "09:00";
      updated[i].end1 = "13:00";
      updated[i].start2 = "14:00";
      updated[i].end2 = "18:00";
    }

    setRows(updated);
  };

  return (
    <div className="page-content">
      <div className="page-container">

        {/* HEADER */}
        <div className="ts-header">
          <div>
            <h2>Timesheet</h2>
            <p className="ts-sub">Total: {totalHours.toFixed(1)}h</p>
          </div>

          <div className="ts-right">
            <span className="status">Draft</span>
            <span className={totalHours < 40 ? "warn" : "ok"}>
              {totalHours < 40
                ? `Missing ${40 - totalHours}h`
                : "Complete"}
            </span>
          </div>
        </div>

        {/* META */}
        <div className="ts-meta-card">
          <div>
            <p><strong>Employee:</strong> John Doe</p>
            <p><strong>Role:</strong> Developer</p>
          </div>

          <div style={{ textAlign: "center" }}>
            <p><strong>Manager:</strong> Jane Smith</p>
          </div>

          <div style={{ textAlign: "right" }}>
            <p><strong>Week:</strong> Mar 25 - Mar 31</p>
            <p><strong>Status:</strong> Draft</p>
          </div>
        </div>

        {/* TABLE */}
        <div className="card">
          <table className="ts-table">
            <thead>
              <tr>
                <th rowSpan="2">Day</th>
                <th rowSpan="2">Date</th>
                <th colSpan="2">Morning</th>
                <th colSpan="2">Afternoon</th>
                <th rowSpan="2">WBS</th>
                <th rowSpan="2">Task</th>
                <th rowSpan="2">Total</th>
              </tr>
              <tr>
                <th>Start</th>
                <th>End</th>
                <th>Start</th>
                <th>End</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{days[i]}</td>

                  <td>
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) =>
                        handleChange(i, "date", e.target.value)
                      }
                    />
                  </td>

                  {["start1", "end1", "start2", "end2"].map((f) => (
                    <td key={f}>
                      <input
                        type="time"
                        value={row[f]}
                        onChange={(e) =>
                          handleChange(i, f, e.target.value)
                        }
                      />
                    </td>
                  ))}

                  <td>
                    <select
                      value={row.wbs}
                      onChange={(e) =>
                        handleChange(i, "wbs", e.target.value)
                      }
                    >
                      <option value="">Select</option>
                      <option>WBS-001</option>
                      <option>WBS-002</option>
                    </select>
                  </td>

                  <td>
                    <input
                      placeholder="Task"
                      onChange={(e) =>
                        handleChange(i, "task", e.target.value)
                      }
                    />
                  </td>

                  <td className="total-cell">
                    {getTotal(row).toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ACTION */}
        <div className="ts-actions">
          <button className="btn-primary">Submit</button>
        </div>

      </div>
    </div>
  );
}

export default Timesheet;