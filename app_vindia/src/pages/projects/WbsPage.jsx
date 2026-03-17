import { useState } from "react";
import "../../styles/wbs.css";

function WbsPage() {

  const [tasks] = useState([
    {
      id: 1,
      task: "Site Preparation",
      material: 100000,
      labour: 50000,
      equipment: 20000,
      progress: 100,
      status: "Completed"
    },
    {
      id: 2,
      task: "Foundation Work",
      material: 500000,
      labour: 200000,
      equipment: 100000,
      progress: 60,
      status: "In Progress"
    }
  ]);

  const budget = 50000000;

  const spent = tasks.reduce(
    (sum, t) => sum + t.material + t.labour + t.equipment,
    0
  );

  const remaining = budget - spent;

  return (

    <div className="wbs-page">

      {/* HEADER */}

      <div className="wbs-header">
        <h1>WBS Management</h1>

        <button className="add-btn">
          + Add Task
        </button>
      </div>

      {/* PROJECT INFO */}

      <div className="project-info">

        <div>
          <p className="label">Project</p>
          <h3>Apartment Tower</h3>
        </div>

        <div>
          <p className="label">Client</p>
          <h3>ABC Builders</h3>
        </div>

        <div>
          <p className="label">Budget</p>
          <h3>₹{budget.toLocaleString()}</h3>
        </div>

      </div>


      {/* SUMMARY CARDS */}

      <div className="summary-grid">

        <div className="summary-card">
          <p>Budget</p>
          <h2>₹{budget.toLocaleString()}</h2>
        </div>

        <div className="summary-card">
          <p>Spent</p>
          <h2>₹{spent.toLocaleString()}</h2>
        </div>

        <div className="summary-card">
          <p>Remaining</p>
          <h2>₹{remaining.toLocaleString()}</h2>
        </div>

      </div>


      {/* TASK TABLE */}

      <div className="table-container">

        <h2>WBS Tasks</h2>

        <table className="wbs-table">

          <thead>
            <tr>
              <th>Task</th>
              <th>Material</th>
              <th>Labour</th>
              <th>Equipment</th>
              <th>Total</th>
              <th>Progress</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {tasks.map((task) => {

              const total =
                task.material +
                task.labour +
                task.equipment;

              return (

                <tr key={task.id}>

                  <td className="task">{task.task}</td>

                  <td>₹{task.material.toLocaleString()}</td>

                  <td>₹{task.labour.toLocaleString()}</td>

                  <td>₹{task.equipment.toLocaleString()}</td>

                  <td className="total">
                    ₹{total.toLocaleString()}
                  </td>

                  <td>

                    <div className="progress-wrapper">

                      <div className="progress-bar">

                        <div
                          className="progress-fill"
                          style={{ width: `${task.progress}%` }}
                        />

                      </div>

                      <span>{task.progress}%</span>

                    </div>

                  </td>

                  <td>

                    <span
                      className={
                        task.status === "Completed"
                          ? "status done"
                          : "status progress"
                      }
                    >
                      {task.status}
                    </span>

                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>

    </div>

  );
}

export default WbsPage;