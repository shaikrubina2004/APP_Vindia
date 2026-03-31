import React, { useState, useEffect } from "react";
import "./WBSSection.css";

// ── Default empty detail structure for every subtask ──────────────────────────
const emptyDetails = () => ({
  labour: [], // { id, name, role, hours, rate, cost }
  material: [], // { id, name, quantity, unit, price, vendor }
  equipment: [], // { id, name, duration, unit, cost }
  miscellaneous: [], // { id, name, cost, note }
});

function WBSSection({ selectedProject }) {
  const [project, setProject] = useState(selectedProject);
  const [expandedWBS, setExpandedWBS] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    wbsId: null,
    name: "",
    type: "task",
  });

  // Drawer state
  const [drawer, setDrawer] = useState(null); // { wbsId, taskId, taskName, details }
  const [activeTab, setActiveTab] = useState("labour");
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [addRowForm, setAddRowForm] = useState({});

  useEffect(() => {
    setProject(selectedProject);
  }, [selectedProject]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const generateWBSCode = () => `${(project.wbs || []).length + 1}`;
  const generateSubCode = (wbsCode, tasksCount) =>
    `${wbsCode}.${tasksCount + 1}`;

  const toggleWBSExpand = (wbsId) =>
    setExpandedWBS((prev) => ({ ...prev, [wbsId]: !prev[wbsId] }));

  // ── open modals ───────────────────────────────────────────────────────────
  const handleAddMainTask = () => {
    setNewTask({ wbsId: null, name: "", type: "task" });
    setShowAddTaskModal(true);
  };

  const handleAddSubTask = (wbsId) => {
    setNewTask({ wbsId, name: "", type: "subtask" });
    setShowAddTaskModal(true);
  };

  // ── open drawer when subtask is clicked ──────────────────────────────────
  const handleSubtaskClick = (wbsId, task) => {
    setDrawer({
      wbsId,
      taskId: task.id,
      taskName: task.name,
      taskCode: task.code,
      details: task.details || emptyDetails(),
    });
    setActiveTab("labour");
  };

  // ── save new task / subtask ───────────────────────────────────────────────
  const handleSaveTask = () => {
    if (!newTask.name.trim()) {
      alert("Please enter a name");
      return;
    }

    if (newTask.type === "task") {
      const newWBSItem = {
        id: Date.now(),
        code: generateWBSCode(),
        name: newTask.name,
        progress: 0,
        status: "Pending",
        tasks: [],
      };
      setProject((prev) => ({ ...prev, wbs: [...prev.wbs, newWBSItem] }));
    } else {
      setProject((prev) => ({
        ...prev,
        wbs: prev.wbs.map((w) => {
          if (w.id !== newTask.wbsId) return w;
          const existingTasks = w.tasks || [];
          const newChildTask = {
            id: Date.now(),
            code: generateSubCode(w.code, existingTasks.length),
            name: newTask.name,
            status: "Pending",
            subtasks: [],
            details: emptyDetails(),
          };
          return { ...w, tasks: [...existingTasks, newChildTask] };
        }),
      }));
      setExpandedWBS((prev) => ({ ...prev, [newTask.wbsId]: true }));
    }
    setShowAddTaskModal(false);
    setNewTask({ wbsId: null, name: "", type: "task" });
  };

  // ── add row inside drawer ─────────────────────────────────────────────────
  const openAddRowModal = () => {
    const defaults = {
      labour: { name: "", role: "", hours: "", rate: "" },
      material: { name: "", quantity: "", unit: "", price: "", vendor: "" },
      equipment: { name: "", duration: "", unit: "days", cost: "" },
      miscellaneous: { name: "", cost: "", note: "" },
    };
    setAddRowForm(defaults[activeTab]);
    setShowAddRowModal(true);
  };

  const handleSaveRow = () => {
    const tab = activeTab;
    let newRow = { id: Date.now(), ...addRowForm };

    // auto-calc cost where applicable
    if (tab === "labour") {
      newRow.cost =
        (parseFloat(newRow.hours) || 0) * (parseFloat(newRow.rate) || 0);
    }
    if (tab === "material") {
      newRow.total =
        (parseFloat(newRow.quantity) || 0) * (parseFloat(newRow.price) || 0);
    }

    // persist into project state
    setProject((prev) => ({
      ...prev,
      wbs: prev.wbs.map((w) => {
        if (w.id !== drawer.wbsId) return w;
        return {
          ...w,
          tasks: w.tasks.map((t) => {
            if (t.id !== drawer.taskId) return t;
            const details = t.details || emptyDetails();
            return {
              ...t,
              details: { ...details, [tab]: [...(details[tab] || []), newRow] },
            };
          }),
        };
      }),
    }));

    // also update drawer live
    setDrawer((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        [tab]: [...(prev.details[tab] || []), newRow],
      },
    }));

    setShowAddRowModal(false);
    setAddRowForm({});
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const calcTotal = (tab, details) => {
    if (!details) return 0;
    if (tab === "labour")
      return details.labour?.reduce((s, r) => s + (r.cost || 0), 0) || 0;
    if (tab === "material")
      return details.material?.reduce((s, r) => s + (r.total || 0), 0) || 0;
    if (tab === "equipment")
      return (
        details.equipment?.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0) ||
        0
      );
    if (tab === "miscellaneous")
      return (
        details.miscellaneous?.reduce(
          (s, r) => s + (parseFloat(r.cost) || 0),
          0,
        ) || 0
      );
    return 0;
  };

  const grandTotal = (details) =>
    ["labour", "material", "equipment", "miscellaneous"].reduce(
      (s, t) => s + calcTotal(t, details),
      0,
    );

  const fmt = (n) =>
    `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  // ── tab config ────────────────────────────────────────────────────────────
  const TABS = [
    { key: "labour", label: "Labour", icon: "👷" },
    { key: "material", label: "Material", icon: "🧱" },
    { key: "equipment", label: "Equipment", icon: "🏗️" },
    { key: "miscellaneous", label: "Miscellaneous", icon: "📦" },
  ];

  // ── field configs for add-row modal ──────────────────────────────────────
  const FIELDS = {
    labour: [
      { key: "name", label: "Worker Name", placeholder: "e.g. Rajan Kumar" },
      { key: "role", label: "Role", placeholder: "e.g. Mason, Carpenter" },
      { key: "hours", label: "Hours", placeholder: "e.g. 8", type: "number" },
      {
        key: "rate",
        label: "Rate / Hr (₹)",
        placeholder: "e.g. 250",
        type: "number",
      },
    ],
    material: [
      {
        key: "name",
        label: "Material Name",
        placeholder: "e.g. Cement (OPC 53)",
      },
      {
        key: "quantity",
        label: "Quantity",
        placeholder: "e.g. 50",
        type: "number",
      },
      { key: "unit", label: "Unit", placeholder: "e.g. Bags, Kg, Ltrs" },
      {
        key: "price",
        label: "Unit Price (₹)",
        placeholder: "e.g. 380",
        type: "number",
      },
      { key: "vendor", label: "Vendor", placeholder: "e.g. UltraTech Dealer" },
    ],
    equipment: [
      { key: "name", label: "Equipment", placeholder: "e.g. JCB Excavator" },
      {
        key: "duration",
        label: "Duration",
        placeholder: "e.g. 2",
        type: "number",
      },
      { key: "unit", label: "Unit", placeholder: "days / hrs" },
      {
        key: "cost",
        label: "Total Cost (₹)",
        placeholder: "e.g. 4500",
        type: "number",
      },
    ],
    miscellaneous: [
      { key: "name", label: "Item", placeholder: "e.g. Safety gear" },
      {
        key: "cost",
        label: "Cost (₹)",
        placeholder: "e.g. 1200",
        type: "number",
      },
      { key: "note", label: "Note", placeholder: "Optional note" },
    ],
  };

  // ── render subtasks ───────────────────────────────────────────────────────
  const renderSubtasks = (parentTask, level = 1) => (
    <>
      {(parentTask.subtasks || []).map((subtask) => (
        <div key={subtask.id} className={`wbs-task subtask level-${level}`}>
          <div className="task-row">
            <div
              className="task-indent"
              style={{ marginLeft: `${level * 24}px` }}
            >
              <span className="tree-line">└</span>
            </div>
            <input
              type="checkbox"
              checked={subtask.status === "Completed"}
              readOnly
            />
            <span className="task-code">{subtask.code}</span>
            <span className="task-name">{subtask.name}</span>
            <span
              className={`task-status ${subtask.status?.toLowerCase() || "pending"}`}
            >
              {subtask.status}
            </span>
          </div>
          {subtask.subtasks?.length > 0 && renderSubtasks(subtask, level + 1)}
        </div>
      ))}
    </>
  );

  if (!project?.wbs)
    return (
      <div className="wbs-section">
        <div className="empty-state">
          <p>No project selected</p>
        </div>
      </div>
    );

  return (
    <div className="wbs-section">
      {/* PAGE HEADER */}
      <div className="wbs-header-bar">
        <h2>📊 Work Breakdown Structure</h2>
        <div className="header-bar-right">
          <span className="wbs-count">{project.wbs.length} items</span>
          <button className="btn-add-task-global" onClick={handleAddMainTask}>
            ➕ Add Task
          </button>
        </div>
      </div>

      <div className="wbs-container">
        {project.wbs.map((wbs) => (
          <div key={wbs.id} className="wbs-block">
            <div className="wbs-header">
              <button
                className="expand-btn"
                onClick={() => toggleWBSExpand(wbs.id)}
              >
                {expandedWBS[wbs.id] ? "▼" : "▶"}
              </button>
              <div className="wbs-info">
                <span className="wbs-code">{wbs.code}</span>
                <span className="wbs-name">{wbs.name}</span>
              </div>
              <div className="wbs-meta">
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${wbs.progress || 0}%` }}
                    />
                  </div>
                  <span className="progress-text">{wbs.progress || 0}%</span>
                </div>
                <span
                  className={`status-badge ${(wbs.status || "pending").toLowerCase()}`}
                >
                  {wbs.status}
                </span>
              </div>
              <button
                className="btn-add-subtask-header"
                onClick={() => handleAddSubTask(wbs.id)}
              >
                + Sub
              </button>
            </div>

            {expandedWBS[wbs.id] && (
              <div className="tasks-list">
                {(wbs.tasks || []).length > 0 ? (
                  wbs.tasks.map((task) => (
                    <div key={task.id} className="wbs-task main-task">
                      {/* Clickable subtask row */}
                      <div
                        className="task-row clickable"
                        onClick={() => handleSubtaskClick(wbs.id, task)}
                        title="Click to view details"
                      >
                        <span className="tree-line">├</span>
                        <input
                          type="checkbox"
                          checked={task.status === "Completed"}
                          readOnly
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="task-code">{task.code}</span>
                        <span className="task-name">{task.name}</span>
                        <span
                          className={`task-status ${task.status?.toLowerCase() || "pending"}`}
                        >
                          {task.status}
                        </span>
                        <span className="detail-hint">View Details →</span>
                      </div>
                      {task.subtasks?.length > 0 && renderSubtasks(task, 1)}
                    </div>
                  ))
                ) : (
                  <div className="empty-tasks">
                    <p>No subtasks yet. Click "+ Sub" to add one.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ADD TASK MODAL ── */}
      {showAddTaskModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddTaskModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {newTask.type === "task" ? "Add New Task" : "Add Subtask"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowAddTaskModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>
                  {newTask.type === "task" ? "Task Name *" : "Subtask Name *"}
                </label>
                <input
                  type="text"
                  placeholder={
                    newTask.type === "task"
                      ? "e.g. Site Preparation & Foundation"
                      : "e.g. Soil Testing"
                  }
                  value={newTask.name}
                  onChange={(e) =>
                    setNewTask({ ...newTask, name: e.target.value })
                  }
                  className="form-input"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTask()}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddTaskModal(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveTask}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL DRAWER ── */}
      {drawer && (
        <div className="drawer-overlay" onClick={() => setDrawer(null)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            {/* Drawer header */}
            <div className="drawer-header">
              <div className="drawer-title-block">
                <span className="drawer-code">{drawer.taskCode}</span>
                <div>
                  <h3 className="drawer-title">{drawer.taskName}</h3>
                  <p className="drawer-subtitle">Cost Breakdown</p>
                </div>
              </div>
              <div className="drawer-header-right">
                <div className="grand-total-badge">
                  <span className="gt-label">Grand Total</span>
                  <span className="gt-value">
                    {fmt(grandTotal(drawer.details))}
                  </span>
                </div>
                <button
                  className="drawer-close"
                  onClick={() => setDrawer(null)}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="drawer-tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  className={`drawer-tab ${activeTab === tab.key ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span className="tab-total">
                    {fmt(calcTotal(tab.key, drawer.details))}
                  </span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="drawer-body">
              <div className="table-toolbar">
                <h4 className="table-heading">
                  {TABS.find((t) => t.key === activeTab)?.icon}{" "}
                  {TABS.find((t) => t.key === activeTab)?.label} Details
                </h4>
                <button className="btn-add-row" onClick={openAddRowModal}>
                  + Add Row
                </button>
              </div>

              {/* LABOUR TABLE */}
              {activeTab === "labour" && (
                <div className="table-wrap">
                  {drawer.details.labour?.length > 0 ? (
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Worker Name</th>
                          <th>Role</th>
                          <th>Hours</th>
                          <th>Rate / Hr</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawer.details.labour.map((r, i) => (
                          <tr key={r.id}>
                            <td className="row-num">{i + 1}</td>
                            <td className="bold-cell">{r.name}</td>
                            <td>
                              <span className="role-badge">{r.role}</span>
                            </td>
                            <td>{r.hours} hrs</td>
                            <td>{fmt(r.rate)}</td>
                            <td className="cost-cell">{fmt(r.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={5} className="total-label">
                            Total Labour Cost
                          </td>
                          <td className="total-value">
                            {fmt(calcTotal("labour", drawer.details))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <EmptyTable message="No labour entries yet. Click '+ Add Row' to begin." />
                  )}
                </div>
              )}

              {/* MATERIAL TABLE */}
              {activeTab === "material" && (
                <div className="table-wrap">
                  {drawer.details.material?.length > 0 ? (
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Material</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Unit Price</th>
                          <th>Vendor</th>
                          <th>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawer.details.material.map((r, i) => (
                          <tr key={r.id}>
                            <td className="row-num">{i + 1}</td>
                            <td className="bold-cell">{r.name}</td>
                            <td>{r.quantity}</td>
                            <td>{r.unit}</td>
                            <td>{fmt(r.price)}</td>
                            <td>
                              <span className="vendor-badge">{r.vendor}</span>
                            </td>
                            <td className="cost-cell">{fmt(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={6} className="total-label">
                            Total Material Cost
                          </td>
                          <td className="total-value">
                            {fmt(calcTotal("material", drawer.details))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <EmptyTable message="No material entries yet. Click '+ Add Row' to begin." />
                  )}
                </div>
              )}

              {/* EQUIPMENT TABLE */}
              {activeTab === "equipment" && (
                <div className="table-wrap">
                  {drawer.details.equipment?.length > 0 ? (
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Equipment</th>
                          <th>Duration</th>
                          <th>Unit</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawer.details.equipment.map((r, i) => (
                          <tr key={r.id}>
                            <td className="row-num">{i + 1}</td>
                            <td className="bold-cell">{r.name}</td>
                            <td>{r.duration}</td>
                            <td>{r.unit}</td>
                            <td className="cost-cell">{fmt(r.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={4} className="total-label">
                            Total Equipment Cost
                          </td>
                          <td className="total-value">
                            {fmt(calcTotal("equipment", drawer.details))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <EmptyTable message="No equipment entries yet. Click '+ Add Row' to begin." />
                  )}
                </div>
              )}

              {/* MISCELLANEOUS TABLE */}
              {activeTab === "miscellaneous" && (
                <div className="table-wrap">
                  {drawer.details.miscellaneous?.length > 0 ? (
                    <table className="detail-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Item</th>
                          <th>Note</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawer.details.miscellaneous.map((r, i) => (
                          <tr key={r.id}>
                            <td className="row-num">{i + 1}</td>
                            <td className="bold-cell">{r.name}</td>
                            <td className="note-cell">{r.note || "—"}</td>
                            <td className="cost-cell">{fmt(r.cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="total-label">
                            Total Miscellaneous Cost
                          </td>
                          <td className="total-value">
                            {fmt(calcTotal("miscellaneous", drawer.details))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <EmptyTable message="No miscellaneous entries yet. Click '+ Add Row' to begin." />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ADD ROW MODAL ── */}
      {showAddRowModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddRowModal(false)}
        >
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add {TABS.find((t) => t.key === activeTab)?.label} Entry</h3>
              <button
                className="modal-close"
                onClick={() => setShowAddRowModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {FIELDS[activeTab].map((f) => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    type={f.type || "text"}
                    placeholder={f.placeholder}
                    value={addRowForm[f.key] || ""}
                    onChange={(e) =>
                      setAddRowForm({ ...addRowForm, [f.key]: e.target.value })
                    }
                    className="form-input"
                  />
                </div>
              ))}
              {activeTab === "labour" &&
                addRowForm.hours &&
                addRowForm.rate && (
                  <div className="calc-preview">
                    Cost Preview:{" "}
                    {fmt(
                      (parseFloat(addRowForm.hours) || 0) *
                        (parseFloat(addRowForm.rate) || 0),
                    )}
                  </div>
                )}
              {activeTab === "material" &&
                addRowForm.quantity &&
                addRowForm.price && (
                  <div className="calc-preview">
                    Total Preview:{" "}
                    {fmt(
                      (parseFloat(addRowForm.quantity) || 0) *
                        (parseFloat(addRowForm.price) || 0),
                    )}
                  </div>
                )}
            </div>
            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowAddRowModal(false)}
              >
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveRow}>
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyTable({ message }) {
  return (
    <div className="empty-table">
      <div className="empty-table-icon">📋</div>
      <p>{message}</p>
    </div>
  );
}

export default WBSSection;
