import React, { useState, useEffect } from "react";
import "./WBSSection.css";

const API = "http://localhost:5000/api";

const emptyDetails = () => ({
  labour: [],
  material: [],
  equipment: [],
  miscellaneous: [],
});

function WBSSection({ selectedProject }) {
  const [wbsTree, setWbsTree] = useState([]);
  const [loading, setLoading] = useState(false);

  const [expandedWBS, setExpandedWBS] = useState({});
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    wbsId: null,
    name: "",
    type: "task",
  });

  // Drawer state
  const [drawer, setDrawer] = useState(null);
  const [activeTab, setActiveTab] = useState("labour");
  const [showAddRowModal, setShowAddRowModal] = useState(false);
  const [addRowForm, setAddRowForm] = useState({});

  // ── Fetch WBS tree whenever project changes ───────────────────────────────
  useEffect(() => {
    if (!selectedProject?.id) return;
    setLoading(true);
    fetch(`${API}/wbs/${selectedProject.id}`)
      .then((r) => r.json())
      .then((data) => {
        setWbsTree(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("WBS fetch error:", err);
        setLoading(false);
      });
  }, [selectedProject?.id]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const generateWBSCode = () => `${wbsTree.length + 1}`;
  const generateSubCode = (wbsCode, tasksCount) =>
    `${wbsCode}.${tasksCount + 1}`;
  const toggleWBSExpand = (id) =>
    setExpandedWBS((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── open modals ───────────────────────────────────────────────────────────
  const handleAddMainTask = () => {
    setNewTask({ wbsId: null, name: "", type: "task" });
    setShowAddTaskModal(true);
  };
  const handleAddSubTask = (wbsId) => {
    setNewTask({ wbsId, name: "", type: "subtask" });
    setShowAddTaskModal(true);
  };

  // ── open drawer ───────────────────────────────────────────────────────────
  const handleSubtaskClick = (task) => {
    setDrawer({
      wbsId: task.parent_id,
      taskId: task.id,
      taskName: task.name,
      taskCode: task.code,
      details: task.details || emptyDetails(),
    });
    setActiveTab("labour");
  };

  // ── save new task / subtask ───────────────────────────────────────────────
  const handleSaveTask = async () => {
    if (!newTask.name.trim()) {
      alert("Please enter a name");
      return;
    }

    try {
      if (newTask.type === "task") {
        // Top-level WBS item
        const res = await fetch(`${API}/wbs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: selectedProject.id,
            code: generateWBSCode(),
            name: newTask.name,
          }),
        });
        const created = await res.json();
        setWbsTree((prev) => [...prev, created]);
      } else {
        // Child task (subtask)
        const parent = wbsTree.find((w) => w.id === newTask.wbsId);
        const res = await fetch(`${API}/wbs/task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: selectedProject.id,
            parent_id: newTask.wbsId,
            code: generateSubCode(parent.code, (parent.tasks || []).length),
            name: newTask.name,
          }),
        });
        const created = await res.json();

        setWbsTree((prev) =>
          prev.map((w) =>
            w.id !== newTask.wbsId
              ? w
              : { ...w, tasks: [...(w.tasks || []), created] },
          ),
        );
        setExpandedWBS((prev) => ({ ...prev, [newTask.wbsId]: true }));
      }
    } catch (err) {
      console.error("Save task error:", err);
      alert("Failed to save. Check console.");
    }

    setShowAddTaskModal(false);
    setNewTask({ wbsId: null, name: "", type: "task" });
  };

  // ── add cost detail row ───────────────────────────────────────────────────
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

  const handleSaveRow = async () => {
    const tab = activeTab;
    const endpointMap = {
      labour: "labour",
      material: "material",
      equipment: "equipment",
      miscellaneous: "miscellaneous",
    };

    try {
      const res = await fetch(`${API}/wbs/${endpointMap[tab]}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: drawer.taskId, ...addRowForm }),
      });
      const newRow = await res.json();

      // Update drawer live
      setDrawer((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          [tab]: [...(prev.details[tab] || []), newRow],
        },
      }));

      // Also update wbsTree so data survives drawer close/reopen
      setWbsTree((prev) =>
        prev.map((w) => ({
          ...w,
          tasks: (w.tasks || []).map((t) => {
            if (t.id !== drawer.taskId) return t;
            const details = t.details || emptyDetails();
            return {
              ...t,
              details: { ...details, [tab]: [...(details[tab] || []), newRow] },
            };
          }),
        })),
      );
    } catch (err) {
      console.error("Save row error:", err);
      alert("Failed to save row.");
    }

    setShowAddRowModal(false);
    setAddRowForm({});
  };

  // ── totals ────────────────────────────────────────────────────────────────
  const calcTotal = (tab, details) => {
    if (!details) return 0;
    if (tab === "labour")
      return (
        details.labour?.reduce((s, r) => s + (parseFloat(r.cost) || 0), 0) || 0
      );
    if (tab === "material")
      return (
        details.material?.reduce((s, r) => s + (parseFloat(r.total) || 0), 0) ||
        0
      );
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

  // ── tab + field config ────────────────────────────────────────────────────
  const TABS = [
    { key: "labour", label: "Labour", icon: "👷" },
    { key: "material", label: "Material", icon: "🧱" },
    { key: "equipment", label: "Equipment", icon: "🏗️" },
    { key: "miscellaneous", label: "Miscellaneous", icon: "📦" },
  ];

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

  // ── guards ────────────────────────────────────────────────────────────────
  if (!selectedProject?.id) {
    return (
      <div className="wbs-section">
        <div className="empty-state">
          <p>No project selected</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="wbs-section">
        <div className="empty-state">
          <p>Loading WBS...</p>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="wbs-section">
      {/* PAGE HEADER */}
      <div className="wbs-header-bar">
        <h2>📊 Work Breakdown Structure</h2>
        <div className="header-bar-right">
          <span className="wbs-count">{wbsTree.length} items</span>
          <button className="btn-add-task-global" onClick={handleAddMainTask}>
            ➕ Add Task
          </button>
        </div>
      </div>

      <div className="wbs-container">
        {wbsTree.length === 0 ? (
          <div className="empty-state">
            <p>
              No WBS items yet. Click "➕ Add Task" to create your first task.
            </p>
          </div>
        ) : (
          wbsTree.map((wbs) => (
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
                        <div
                          className="task-row clickable"
                          onClick={() => handleSubtaskClick(task)}
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
          ))
        )}
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

              {/* LABOUR */}
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

              {/* MATERIAL */}
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

              {/* EQUIPMENT */}
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

              {/* MISCELLANEOUS */}
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
