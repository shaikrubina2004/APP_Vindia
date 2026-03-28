import { useState } from "react";
import "../../styles/timesheet.css";

const sampleData = [
  {
    id: 1,
    name: "John Doe",
    week: "Mar 25 - Mar 31",
    total: 38,
    status: "Pending",
  },
  {
    id: 2,
    name: "Alice",
    week: "Mar 25 - Mar 31",
    total: 42,
    status: "Approved",
  },
];

function ManagerTimesheet() {
  const [data, setData] = useState(sampleData);

  const handleAction = (id, action) => {
    const updated = data.map((item) =>
      item.id === id ? { ...item, status: action } : item
    );
    setData(updated);
  };

  return (
    <div className="page-content">
      <div className="page-container">

        {/* HEADER */}
        <div className="ts-header">
          <h2>Team Timesheets</h2>
        </div>

        {/* TABLE */}
        <div className="card">
          <table className="ts-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Week</th>
                <th>Total Hours</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.week}</td>
                  <td>{item.total} hrs</td>

                  <td>
                    <span
                      className={
                        item.status === "Approved"
                          ? "ok"
                          : item.status === "Rejected"
                          ? "danger"
                          : "warn"
                      }
                    >
                      {item.status}
                    </span>
                  </td>

                  <td>
                    {item.status === "Pending" && (
                      <>
                        <button
                          className="btn-success"
                          onClick={() =>
                            handleAction(item.id, "Approved")
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="btn-danger"
                          onClick={() =>
                            handleAction(item.id, "Rejected")
                          }
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}

export default ManagerTimesheet;