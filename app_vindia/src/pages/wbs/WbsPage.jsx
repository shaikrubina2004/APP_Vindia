import React from "react";

function WBSSection({ selectedProject }) {
  return (
    <div className="wbs-section">
      <h2>Work Breakdown Structure (WBS)</h2>

      <div className="wbs-tree">
        {(selectedProject?.wbs || []).map((wbs) => (
          <div key={wbs.id} className="wbs-item">
            {/* HEADER */}
            <div className="wbs-header">
              <span className="code">{wbs.code || "-"}</span>

              <div className="wbs-info">
                <h4>{wbs.name}</h4>
                <p>
                  Budget: ₹{(wbs.budget / 10000000).toFixed(1)}Cr | Spent: ₹
                  {(wbs.spent / 10000000).toFixed(1)}Cr
                </p>
              </div>

              <div className="wbs-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${wbs.progress || 0}%` }}
                  ></div>
                </div>
                <span>{wbs.progress || 0}%</span>
              </div>
            </div>

            {/* TASKS */}
            <div className="tasks-list">
              {(wbs.tasks || []).length > 0 ? (
                wbs.tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    <input
                      type="checkbox"
                      checked={task.status === "Completed"}
                      readOnly
                    />

                    <span className="task-name">{task.name}</span>
                    <span className="task-duration">{task.duration}</span>

                    <span
                      className={`task-status ${task.status.toLowerCase()}`}
                    >
                      {task.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="no-task">No tasks available</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WBSSection;
