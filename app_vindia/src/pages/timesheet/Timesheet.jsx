import { useState } from "react";
import "../../styles/timesheet.css";

function Timesheet() {
  const [currentDate, setCurrentDate] = useState(new Date("2026-03-23"));

  const [rows, setRows] = useState([
    {
      hours: [],
    },
  ]);

  /* ============================= */
  /* ✅ FINAL LOGIC (CORRECT) */
  /* ============================= */

  const getWeekDates = (date) => {
    const d = new Date(date);

    // 👉 Get Monday
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));

    // 👉 Next week Monday
    const nextWeekStart = new Date(start);
    nextWeekStart.setDate(start.getDate() + 7);

    // 👉 Next week Friday
    const nextWeekFriday = new Date(nextWeekStart);
    nextWeekFriday.setDate(nextWeekStart.getDate() + 4);

    // 👉 Month end
    const lastDayOfMonth = new Date(
      start.getFullYear(),
      start.getMonth() + 1,
      0
    );

    let end;

    // 🔥 CORE RULE (YOUR REQUIREMENT)
    if (nextWeekFriday.getMonth() !== start.getMonth()) {
      end = lastDayOfMonth; // ✅ 23 → 31
    } else {
      end = new Date(start);
      end.setDate(start.getDate() + 4); // Mon–Fri
    }

    // 👉 Build days (STRICT WORKING DAYS)
    const week = [];
    let temp = new Date(start);

    while (temp <= end) {
      const day = temp.getDay();

      const isLastDay =
        temp.getDate() === end.getDate();

      // ✅ Only Mon–Fri + include last day (even if weekend)
      if ((day !== 0 && day !== 6) || isLastDay) {
        week.push({
          label: temp.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
          }),
          full: new Date(temp),
        });
      }

      temp.setDate(temp.getDate() + 1);
    }

    return week;
  };

  const weekDates = getWeekDates(currentDate);

  /* ============================= */
  /* NAVIGATION */
  /* ============================= */

  const nextWeek = () => {
    const last = weekDates[weekDates.length - 1].full;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    setCurrentDate(next);
  };

  const prevWeek = () => {
    const first = weekDates[0].full;
    const prev = new Date(first);
    prev.setDate(first.getDate() - 7);
    setCurrentDate(prev);
  };

  /* ============================= */
  /* HEADER */
  /* ============================= */

  const formatRange = () => {
    const start = weekDates[0].full;
    const end = weekDates[weekDates.length - 1].full;

    return `${start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
    })} - ${end.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  };

  /* ============================= */
  /* ROW HANDLING */
  /* ============================= */

  const addRow = () => {
    setRows([
      ...rows,
      {
        hours: Array(weekDates.length).fill(""),
      },
    ]);
  };

  const handleChange = (i, j, value) => {
    const updated = [...rows];

    if (!updated[i].hours.length) {
      updated[i].hours = Array(weekDates.length).fill("");
    }

    updated[i].hours[j] = value;
    setRows(updated);
  };

  /* ============================= */
  /* RENDER */
  /* ============================= */

  return (
    <div className="page-content">
      <div className="ts-wrapper">

        {/* HEADER */}
        <div className="ts-header">
          <div className="ts-week">
            <button onClick={prevWeek}>‹</button>
            <span>{formatRange()}</span>
            <button onClick={nextWeek}>›</button>
          </div>
        </div>

        {/* TABLE */}
        <div className="ts-card">
          <h3>Time Distribution</h3>

          <div className="ts-table-wrapper">
            <table className="ts-table">

              <thead>
                <tr>
                  <th>Task</th>

                  {weekDates.map((d) => (
                    <th key={d.label}>{d.label}</th>
                  ))}

                  <th>Total</th>
                </tr>
              </thead>

              <tbody>

                {rows.map((row, i) => (
                  <tr key={i}>

                    <td>
                      <input placeholder="Task" />
                    </td>

                    {weekDates.map((_, j) => (
                      <td key={j}>
                        <input
                          type="number"
                          value={row.hours[j] || ""}
                          onChange={(e) =>
                            handleChange(i, j, e.target.value)
                          }
                        />
                      </td>
                    ))}

                    <td>
                      {(row.hours || [])
                        .reduce((a, b) => a + Number(b || 0), 0)
                        .toFixed(2)}
                    </td>

                  </tr>
                ))}

                {/* TOTAL ROW */}
                <tr className="total-row">
                  <td>Total</td>

                  {weekDates.map((_, i) => (
                    <td key={i}>
                      {rows
                        .reduce(
                          (sum, r) => sum + Number(r.hours[i] || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                  ))}

                  <td>
                    {rows
                      .reduce(
                        (sum, r) =>
                          sum +
                          (r.hours || []).reduce(
                            (a, b) => a + Number(b || 0),
                            0
                          ),
                        0
                      )
                      .toFixed(2)}
                  </td>
                </tr>

              </tbody>
            </table>
          </div>

          <button onClick={addRow}>+ Add Row</button>
        </div>

      </div>
    </div>
  );
}

export default Timesheet;