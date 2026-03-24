import { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/wbs.css";

function WbsPage({ projectId }) {

  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [projectId]);

  // 🔹 Fetch Project Info
  const fetchProject = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/projects/${projectId}`
      );
      setProject(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Fetch Tasks
  const fetchTasks = async () => {
    try {
      const res = await axios.get(
        `http://localhost:5000/api/tasks/${projectId}`
      );
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // 🔹 Add Task (simple version)
  const handleAddTask = async () => {
    try {
      await axios.post("http://localhost:5000/api/tasks", {
        project_id: projectId,
        task: "New Task",
        material: 10000,
        labour: 5000,
        equipment: 2000,
        progress: 0,
        status: "In Progress"
      });

      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) return <p>Loading...</p>;

  // 🔹 Calculations
  const spent = tasks.reduce(
    (sum, t) => sum + t.material + t.labour + t.equipment,
    0
  );

  const remaining = project.budget - spent;

  return (
    <div className="wbs-page">

      {/* HEADER */}
      <div className="wbs-header">
        <h1>WBS Management</h1>

        <button className="add-btn" onClick={handleAddTask}>
          + Add Task
        </button>
      </div>

      {/* PROJECT INFO */}
      <div className="project-info">

        <div>
          <p className="label">Project</p>
          <h3>{project.name}</h3>
        </div>

        <div>
          <p className="label">Client</p>
          <h3>{project.client}</h3>
        </div>

        <div>
          <p className="label">Budget</p>
          <h3>₹{project.budget?.toLocaleString()}</h3>
        </div>

      </div>

      {/* SUMMARY */}
      <div className="summary-grid">

        <div className="summary-card">
          <p>Budget</p>
          <h2>₹{project.budget?.toLocaleString()}</h2>
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

      {/* TABLE */}
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

            {tasks.length === 0 ? (
              <tr>
                <td colSpan="7">No tasks found</td>
              </tr>
            ) : (
              tasks.map((task) => {

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

              })
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default WbsPage;