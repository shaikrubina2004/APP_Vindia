import React, { useState, useEffect } from "react";
import "./ProjectManagement.css";
import ProjectCard from "../../components/project/ProjectCard";

function ProjectManagement() {
  const [activeTab, setActiveTab] = useState("overview");
  const [activeTask, setActiveTask] = useState(null);
const [activeCategory, setActiveCategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("All");
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setAnimate(false);

        setTimeout(() => {
          setAnimate(true);
        }, 200); // 🔥 increased delay (important)
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);
  const [projects, setProjects] = useState([]);
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/projects");
      const data = await res.json();

      console.log("API DATA:", data);

      setProjects(data);
    } catch (err) {
      console.error("Error:", err);
    }
  };

<<<<<<< Updated upstream
=======
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}, []);
  const [projects, setProjects] = useState([
    {
  id: 2,
  name: "Commercial Tower - Downtown",
  client: "ABC Developers",
  startDate: "2024-01-15",
  endDate: "2025-12-31",
  budget: 50000000,
  spent: 0,
  clientPaid: 0,
  status: "Pending",
  progress: 0,
  manager: "Rajesh Kumar",
  teamSize: 0,
  wbs: [],
},
{
  id: 3,
  name: "Commercial Tower - Downtown",
  client: "ABC Developers",
  startDate: "2024-01-15",
  endDate: "2025-12-31",
  budget: 50000000,
  spent: 50000000,
  clientPaid: 50000000,
  status: "Completed",
  progress: 100,
  manager: "Rajesh Kumar",
  teamSize: 0,
  wbs: [],
},
{
  id: 4,
  name: "Commercial Tower - Downtown",
  client: "ABC Developers",
  startDate: "2024-01-15",
  endDate: "2025-12-31",
  budget: 50000000,
  spent: 0,
  clientPaid: 0,
  status: "Rejected",
  progress: 0,
  manager: "Rajesh Kumar",
  teamSize: 0,
  wbs: [],
},
    {
      id: 1,
      name: "Commercial Tower - Downtown",
      client: "ABC Developers",
      startDate: "2024-01-15",
      endDate: "2025-12-31",
      budget: 50000000,
      spent: 22500000,
      clientPaid: 35000000,
      status: "In Progress",
      progress: 45,
      manager: "Rajesh Kumar",
      teamSize: 45,
      wbs: [
        {
  id: "WBS-1",
  code: "1.0",
  name: "Site Preparation & Foundation",
  status: "Completed",
  progress: 100,
  budget: 8000000,
  spent: 8000000,
  labour: 3000000,
  material: 4500000,
  equipment: 500000,

  costDetails: {
  labour: [
    {
      name: "Ravi Kumar (Supervisor)",
      work: "Site supervision & planning",
      amount: 120000
    },
    {
      name: "Arun (Skilled Worker)",
      work: "Concrete mixing & leveling",
      amount: 80000
    },
    {
      name: "Daily Workers (10)",
      work: "Excavation & material handling",
      amount: 150000
    }
  ],

  material: [
    {
      name: "Cement",
      quantity: "50 bags",
      amount: 75000
    },
    {
      name: "Steel Rods",
      quantity: "2 tons",
      amount: 120000
    },
    {
      name: "Sand",
      quantity: "5 loads",
      amount: 50000
    },
    {
      name: "Gravel",
      quantity: "3 loads",
      amount: 40000
    }
  ],

  equipment: [
    {
      name: "Excavator",
      usage: "Used for digging foundation",
      amount: 100000
    },
    {
      name: "Concrete Mixer",
      usage: "Mixing cement",
      amount: 50000
    }
  ],

  miscellaneous: [
    {
      name: "Transport",
      details: "Material delivery",
      amount: 50000
    }
  ]
},


  tasks: [
    {
      id: "T1",
      name: "Land Clearing",
      status: "Completed",
      duration: "30 days",
      hours: 240,
      rate: 500,
    },
    {
      id: "T2",
      name: "Soil Testing",
      status: "Completed",
      duration: "15 days",
      hours: 120,
      rate: 800,
    },
    {
      id: "T3",
      name: "Foundation Excavation",
      status: "Completed",
      duration: "45 days",
      hours: 360,
      rate: 600,
    },
    {
      id: "T4",
      name: "Foundation Concrete",
      status: "Completed",
      duration: "20 days",
      hours: 160,
      rate: 700,
    },
  ],
},
        {
          id: "WBS-2",
          code: "2.0",
          name: "Structural Work",
          status: "In Progress",
          progress: 60,
          budget: 18000000,
          spent: 10800000,
          labour: 5400000,
          material: 4500000,
          equipment: 900000,
          tasks: [
            {
              id: "T5",
              name: "Column Casting",
              status: "In Progress",
              duration: "60 days",
              hours: 480,
              rate: 650,
            },
            {
              id: "T6",
              name: "Beam Installation",
              status: "In Progress",
              duration: "50 days",
              hours: 400,
              rate: 700,
            },
            {
              id: "T7",
              name: "Floor Slab Casting",
              status: "Pending",
              duration: "45 days",
              hours: 360,
              rate: 600,
            },
            {
              id: "T8",
              name: "Structural Testing",
              status: "Pending",
              duration: "15 days",
              hours: 120,
              rate: 1000,
            },
          ],
        },
      ],
    },
  ]);

>>>>>>> Stashed changes
  const [timesheets, setTimesheets] = useState([
    {
      id: 1,
      employee: "Ravi Kumar",
      task: "Foundation Excavation",
      hours: 8,
      date: "2024-03-15",
      rate: 600,
      status: "Approved",
    },
    {
      id: 2,
      employee: "Meena Sharma",
      task: "Column Casting",
      hours: 8,
      date: "2024-03-15",
      rate: 650,
      status: "Pending",
    },
    {
      id: 3,
      employee: "Arjun Patel",
      task: "Column Casting",
      hours: 8,
      date: "2024-03-15",
      rate: 650,
      status: "Approved",
    },
    {
      id: 4,
      employee: "Priya Singh",
      task: "Beam Installation",
      hours: 6,
      date: "2024-03-16",
      rate: 700,
      status: "Approved",
    },
  ]);

<<<<<<< Updated upstream
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    if (projects.length > 0) {
      setSelectedProject(projects[0]);
    }
  }, [projects]);
=======
  const [selectedProject, setSelectedProject] = useState(
  projects.find(p => p.wbs && p.wbs.length > 0)
);
>>>>>>> Stashed changes
  const [showTimesheetModal, setShowTimesheetModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newTimesheet, setNewTimesheet] = useState({
    employee: "",
    task: "",
    hours: "",
    date: "",
    rate: "",
  });
  const [newProject, setNewProject] = useState({
    name: "",
    client: "",
    startDate: "",
    endDate: "",
    budget: "",
    manager: "",
    teamSize: "",
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payments, setPayments] = useState([
    {
      id: 1,
      date: "2024-02-15",
      amount: 10000000,
      status: "Completed",
      reference: "INV-001",
    },
    {
      id: 2,
      date: "2024-05-10",
      amount: 15000000,
      status: "Completed",
      reference: "INV-002",
    },
    {
      id: 3,
      date: "2024-08-20",
      amount: 10000000,
      status: "Completed",
      reference: "INV-003",
    },
  ]);
  const [newPayment, setNewPayment] = useState({
    date: "",
    amount: "",
    reference: "",
  });

  // Add new project
  const handleAddProject = () => {
    if (newProject.name && newProject.client && newProject.budget) {
      const project = {
        id: projects.length + 1,
        name: newProject.name,
        client: newProject.client,
        startDate: newProject.startDate,
        endDate: newProject.endDate,
        budget: parseInt(newProject.budget),
        spent: 0,
        clientPaid: 0,
        status: "Planning",
        progress: 0,
        manager: newProject.manager,
        teamSize: parseInt(newProject.teamSize) || 0,
        wbs: [
          {
            id: "WBS-1",
            code: "1.0",
            name: "Planning & Design",
            status: "Pending",
            progress: 0,
            budget: parseInt(newProject.budget) * 0.1,
            spent: 0,
            labour: 0,
            material: 0,
            equipment: 0,
            tasks: [],
          },
        ],
      };
      setProjects([...projects, project]);
      setSelectedProject(project);
      setNewProject({
        name: "",
        client: "",
        startDate: "",
        endDate: "",
        budget: "",
        manager: "",
        teamSize: "",
      });
      setShowProjectModal(false);
    }
  };

  // Add payment
  const handleAddPayment = () => {
    if (newPayment.date && newPayment.amount) {
      const payment = {
        id: payments.length + 1,
        date: newPayment.date,
        amount: parseInt(newPayment.amount),
        status: "Completed",
        reference:
          newPayment.reference ||
          `INV-${String(payments.length + 1).padStart(3, "0")}`,
      };
      setPayments([...payments, payment]);

      // Update selectedProject with new payment
      const updatedProject = {
        ...selectedProject,
        clientPaid:
          (selectedProject.clientPaid || 0) + parseInt(newPayment.amount),
      };
      setSelectedProject(updatedProject);

      setNewPayment({ date: "", amount: "", reference: "" });
      setShowPaymentModal(false);
    }
  };

  // Calculate remaining budget
  const calculateRemaining = (budget, spent) => budget - spent;
  const calculatePercentage = (spent, budget) =>
    ((spent / budget) * 100).toFixed(1);

  // Add timesheet
  const handleAddTimesheet = () => {
    if (newTimesheet.employee && newTimesheet.task && newTimesheet.hours) {
      const newEntry = {
        id: timesheets.length + 1,
        ...newTimesheet,
        hours: parseInt(newTimesheet.hours),
        rate: parseInt(newTimesheet.rate),
        status: "Pending",
      };
      setTimesheets([...timesheets, newEntry]);
      setNewTimesheet({
        employee: "",
        task: "",
        hours: "",
        date: "",
        rate: "",
      });
      setShowTimesheetModal(false);
    }
  };

  // Calculate project cost breakdown
  const costBreakdown = {
    labour: selectedProject?.wbs || [].reduce((sum, w) => sum + w.labour, 0),
    material:
      selectedProject?.wbs || [].reduce((sum, w) => sum + w.material, 0),
    equipment:
      selectedProject?.wbs || [].reduce((sum, w) => sum + w.equipment, 0),
  };

  // Calculate performance metrics
  const performanceMetrics = {
    totalHours: timesheets.reduce((sum, t) => sum + t.hours, 0),
    approvedHours: timesheets
      .filter((t) => t.status === "Approved")
      .reduce((sum, t) => sum + t.hours, 0),
    pendingHours: timesheets
      .filter((t) => t.status === "Pending")
      .reduce((sum, t) => sum + t.hours, 0),
    totalCost: timesheets.reduce((sum, t) => sum + t.hours * t.rate, 0),
  };

  return (
    <div className="project-management-page">
      {/* Header */}
      <div className="pm-header">
        <div>
          <h1>Project Management System</h1>
          <p>
            Enterprise Level - Projects → Tasks → Timesheet → Cost → Performance
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowProjectModal(true)}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          New Project
        </button>
      </div>

      {/* Tabs */}
      <div className="pm-tabs">
        <button
          className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12h18M3 6h18M3 18h18"></path>
          </svg>
          Project Overview
        </button>
        <button
          className={`tab-btn ${activeTab === "wbs" ? "active" : ""}`}
          onClick={() => setActiveTab("wbs")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          WBS & Tasks
        </button>
        <button
          className={`tab-btn ${activeTab === "timesheet" ? "active" : ""}`}
          onClick={() => setActiveTab("timesheet")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"></path>
          </svg>
          Timesheet
        </button>
        <button
          className={`tab-btn ${activeTab === "cost" ? "active" : ""}`}
          onClick={() => setActiveTab("cost")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
            <path d="M12 1v6m0 6v6"></path>
          </svg>
          Cost Tracking
        </button>
        <button
          className={`tab-btn ${activeTab === "performance" ? "active" : ""}`}
          onClick={() => setActiveTab("performance")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"></polyline>
            <polyline points="17 6 23 6 23 12"></polyline>
          </svg>
          Performance
        </button>
        <button
          className={`tab-btn ${activeTab === "payments" ? "active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1"></circle>
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m4.24 4.24l4.24 4.24M1.5 12h6m6 0h6M4.22 19.78l4.24-4.24m4.24-4.24l4.24-4.24"></path>
          </svg>
          Payments
        </button>
      </div>

      {/* Content */}
      <div className="pm-content">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="overview-section">
            {/* Project Cards */}
            <div className="filter-buttons">
              {["All", "In Progress", "Pending", "Completed", "Rejected"].map(
                (status) => (
                  <button
                    key={status}
                    className={`filter-btn ${statusFilter === status ? "active" : ""}`}
                    onClick={() => setStatusFilter(status)}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
            <div className="projects-grid">
              {projects
                .filter((proj) =>
                  statusFilter === "All" ? true : proj.status === statusFilter,
                )
                .map((proj) => (
                  <ProjectCard
                    key={proj.id}
                    proj={proj}
                    isActive={selectedProject?.id === proj.id}
                    onClick={() => setSelectedProject(proj)}
                  />
                ))}
            </div>
            <div className="three-column-layout">
              {/* QUICK INSIGHTS */}
              <div className={`quick-insights ${animate ? "animate" : ""}`}>
                <h3>Quick Insights</h3>
                <p>⚠ 2 projects delayed</p>
                <p>💰 1 over budget</p>
                <p>🚀 Top: 90% progress</p>
              </div>

              {/* TIMESHEET */}
              <div className="timesheet-section-new">
                <h3>Timesheet Submissions</h3>

                {timesheets
                  .slice(-5)
                  .reverse()
                  .map((ts) => (
                    <div key={ts.id} className="timesheet-row">
                      <div className="ts-info">
                        <span className="ts-name">{ts.employee}</span>
                        <span className="ts-task">{ts.task}</span>
                      </div>

                      <div className="ts-meta">
                        <span className="ts-hours">{ts.hours}h</span>
                        <span className="ts-date">{ts.date}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* RECENT ACTIVITIES */}
              <div className="recent-activity">
                <h3>Recent Activities</h3>

                <p>
                  • Payment of ₹10,00,000 received for Commercial Tower
                  &nbsp;&nbsp;project
                </p>
                <p>• ₹5,00,000 released for material procurement</p>
                <p>• Pending payment of ₹2,50,000 awaiting client approval</p>
                <p>• Budget updated after recent cost adjustments</p>
              </div>
            </div>
          </div>
        )}

        {/* WBS TAB */}
        {activeTab === "wbs" && (
          <div className="wbs-section">
            <h2>Work Breakdown Structure (WBS)</h2>
            <div className="wbs-tree">
              {selectedProject?.wbs ||
                [].map((wbs) => (
                  <div key={wbs.id} className="wbs-item">
                    <div className="wbs-header">
                      <span className="code">{wbs.code}</span>
                      <div className="wbs-info">
                        <h4>{wbs.name}</h4>
                        <p>
                          Budget: ₹{(wbs.budget / 10000000).toFixed(1)}Cr |
                          Spent: ₹{(wbs.spent / 10000000).toFixed(1)}Cr
                        </p>
                      </div>
                      <div className="wbs-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${wbs.progress}%` }}
                          ></div>
                        </div>
                        <span>{wbs.progress}%</span>
                      </div>
                    </div>
                    <div className="tasks-list">
                      {wbs.tasks.map((task) => (
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
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TIMESHEET TAB */}
        {activeTab === "timesheet" && (
          <div className="timesheet-section">
            <div className="timesheet-header">
              <h2>Employee Timesheet</h2>
              <button
                className="btn-primary"
                onClick={() => setShowTimesheetModal(true)}
              >
                + Log Hours
              </button>
            </div>

            <div className="timesheet-table">
              <div className="table-header">
                <div>Employee</div>
                <div>Task</div>
                <div>Hours</div>
                <div>Rate/Hr</div>
                <div>Cost</div>
                <div>Date</div>
                <div>Status</div>
              </div>
              {timesheets.map((ts) => (
                <div key={ts.id} className="table-row">
                  <div>{ts.employee}</div>
                  <div>{ts.task}</div>
                  <div>{ts.hours}</div>
                  <div>₹{ts.rate}</div>
                  <div>₹{ts.hours * ts.rate}</div>
                  <div>{ts.date}</div>
                  <div>
                    <span className={`status ${ts.status.toLowerCase()}`}>
                      {ts.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Timesheet Modal */}
            {showTimesheetModal && (
              <div
                className="modal-overlay"
                onClick={() => setShowTimesheetModal(false)}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>Log Working Hours</h2>
                    <button
                      className="close-btn"
                      onClick={() => setShowTimesheetModal(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Employee Name</label>
                      <input
                        type="text"
                        placeholder="Enter employee name"
                        value={newTimesheet.employee}
                        onChange={(e) =>
                          setNewTimesheet({
                            ...newTimesheet,
                            employee: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Task</label>
                      <select
                        value={newTimesheet.task}
                        onChange={(e) =>
                          setNewTimesheet({
                            ...newTimesheet,
                            task: e.target.value,
                          })
                        }
                      >
                        <option>Select Task</option>
                        {selectedProject?.wbs ||
                          [].map((wbs) =>
                            wbs.tasks.map((task) => (
                              <option key={task.id}>{task.name}</option>
                            )),
                          )}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Hours</label>
                        <input
                          type="number"
                          placeholder="8"
                          value={newTimesheet.hours}
                          onChange={(e) =>
                            setNewTimesheet({
                              ...newTimesheet,
                              hours: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label>Rate/Hour (₹)</label>
                        <input
                          type="number"
                          placeholder="500"
                          value={newTimesheet.rate}
                          onChange={(e) =>
                            setNewTimesheet({
                              ...newTimesheet,
                              rate: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={newTimesheet.date}
                        onChange={(e) =>
                          setNewTimesheet({
                            ...newTimesheet,
                            date: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowTimesheetModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleAddTimesheet}
                    >
                      Log Hours
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COST TRACKING TAB */}
        {activeTab === "cost" && (
          <div className="cost-section">
            <h2>Cost Management</h2>

            {/* Cost Breakdown */}
            <div className="cost-breakdown">
              <h3>Cost Breakdown by Category</h3>
              <div className="cost-cards">
                <div className="cost-card labour">
                  <div className="cost-label">Labour Cost</div>
                  <div className="cost-value">
                    ₹{(costBreakdown.labour / 10000000).toFixed(1)}Cr
                  </div>
                  <div className="cost-percent">
                    {(
                      (costBreakdown.labour / selectedProject.spent) *
                      100
                    ).toFixed(1)}
                    % of total
                  </div>
                </div>
                <div className="cost-card material">
                  <div className="cost-label">Material Cost</div>
                  <div className="cost-value">
                    ₹{(costBreakdown.material / 10000000).toFixed(1)}Cr
                  </div>
                  <div className="cost-percent">
                    {(
                      (costBreakdown.material / selectedProject.spent) *
                      100
                    ).toFixed(1)}
                    % of total
                  </div>
                </div>
                <div className="cost-card equipment">
                  <div className="cost-label">Equipment Cost</div>
                  <div className="cost-value">
                    ₹{(costBreakdown.equipment / 10000000).toFixed(1)}Cr
                  </div>
                  <div className="cost-percent">
                    {(
                      (costBreakdown.equipment / selectedProject.spent) *
                      100
                    ).toFixed(1)}
                    % of total
                  </div>
                </div>
              </div>
            </div>

            {/* Budget vs Spent */}
            <div className="budget-comparison">
              <h3>Budget vs Actual Spending</h3>
              <div className="comparison-chart">
                <div className="chart-item">
                  <div className="chart-label">Budget</div>
                  <div className="chart-bar budget">
                    ₹{(selectedProject.budget / 10000000).toFixed(1)}Cr
                  </div>
                </div>
                <div className="chart-item">
                  <div className="chart-label">Spent</div>
                  <div className="chart-bar spent">
                    ₹{(selectedProject.spent / 10000000).toFixed(1)}Cr
                  </div>
                </div>
                <div className="chart-item">
                  <div className="chart-label">Remaining</div>
                  <div className="chart-bar remaining">
                    ₹
                    {(
                      calculateRemaining(
                        selectedProject.budget,
                        selectedProject.spent,
                      ) / 10000000
                    ).toFixed(1)}
                    Cr
                  </div>
                </div>
              </div>
            </div>

            {/* Phase-wise Cost */}
            <div className="phase-wise-cost">
              <h3>Cost by Phase (WBS)</h3>
              <div className="phase-table">
                <div className="table-header">
                  <div>Phase</div>
                  <div>Budget</div>
                  <div>Spent</div>
                  <div>Remaining</div>
                  <div>% Used</div>
                </div>
<<<<<<< Updated upstream
                {selectedProject?.wbs ||
                  [].map((wbs) => (
                    <div key={wbs.id} className="table-row">
                      <div className="phase-name">{wbs.name}</div>
                      <div>₹{(wbs.budget / 10000000).toFixed(1)}Cr</div>
                      <div>₹{(wbs.spent / 10000000).toFixed(1)}Cr</div>
                      <div>
                        ₹{((wbs.budget - wbs.spent) / 10000000).toFixed(1)}Cr
                      </div>
                      <div>{calculatePercentage(wbs.spent, wbs.budget)}%</div>
=======
                {activeTask && (
  <div className="task-cost-details">
    <h3>{activeTask.name} - Cost Details</h3>

    <div className="category-buttons">
      {["labour", "material", "equipment", "miscellaneous"].map((cat) => (
        <button
          key={cat}
          className={`cat-btn ${activeCategory === cat ? "active" : ""}`}
          onClick={() => setActiveCategory(cat)}
        >
          {cat === "miscellaneous" ? "MISC" : cat.toUpperCase()}
        </button>
      ))}
    </div>

    {activeCategory && (
      <div className="category-data">
        {(activeTask.costDetails?.[activeCategory] || []).length === 0 ? (
          <p>No data available</p>
        ) : (
          activeTask.costDetails[activeCategory].map((item, index) => (
            <div key={index} className="cost-item">
  <div>
    <strong>{item.name}</strong>

    {/* 👇 Show extra details */}
    {item.work && <div className="sub-text">Work: {item.work}</div>}
    {item.quantity && <div className="sub-text">Qty: {item.quantity}</div>}
    {item.usage && <div className="sub-text">Usage: {item.usage}</div>}
    {item.details && <div className="sub-text">{item.details}</div>}
  </div>

  <span>₹{item.amount}</span>
</div>
          ))
        )}
      </div>
    )}
  </div>
)}
                {selectedProject.wbs.map((wbs) => (
                 <div
  key={wbs.id}
  className="table-row"
  onClick={() => {
    setActiveTask(wbs);
    setActiveCategory(null);
  }}
>
                    <div className="phase-name">{wbs.name}</div>
                    <div>₹{(wbs.budget / 10000000).toFixed(1)}Cr</div>
                    <div>₹{(wbs.spent / 10000000).toFixed(1)}Cr</div>
                    <div>
                      ₹{((wbs.budget - wbs.spent) / 10000000).toFixed(1)}Cr
>>>>>>> Stashed changes
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* PERFORMANCE TAB */}
        {activeTab === "performance" && (
          <div className="performance-section">
            <h2>Performance Dashboard</h2>

            <div className="performance-cards">
              <div className="perf-card">
                <div className="perf-label">Total Hours Logged</div>
                <div className="perf-value">
                  {performanceMetrics.totalHours}
                </div>
                <div className="perf-unit">hours</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">Approved Hours</div>
                <div className="perf-value">
                  {performanceMetrics.approvedHours}
                </div>
                <div className="perf-unit">hours</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">Pending Approval</div>
                <div className="perf-value">
                  {performanceMetrics.pendingHours}
                </div>
                <div className="perf-unit">hours</div>
              </div>
              <div className="perf-card">
                <div className="perf-label">Labour Cost</div>
                <div className="perf-value">
                  ₹{(performanceMetrics.totalCost / 100000).toFixed(1)}L
                </div>
                <div className="perf-unit">total</div>
              </div>
            </div>

            {/* Project Performance */}
            <div className="project-performance">
              <h3>Project Performance Metrics</h3>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Progress</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${selectedProject.progress}%` }}
                    ></div>
                  </div>
                  <span className="metric-value">
                    {selectedProject.progress}%
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Budget Utilization</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${calculatePercentage(selectedProject.spent, selectedProject.budget)}%`,
                      }}
                    ></div>
                  </div>
                  <span className="metric-value">
                    {calculatePercentage(
                      selectedProject.spent,
                      selectedProject.budget,
                    )}
                    %
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Task Completion</span>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(selectedProject?.wbs || [].filter((w) => w.status === "Completed").length / selectedProject?.wbs || [].length) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="metric-value">
                    {Math.round(
                      (selectedProject?.wbs ||
                        [].filter((w) => w.status === "Completed").length /
                          selectedProject?.wbs ||
                        [].length) * 100,
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Employee Performance */}
            <div className="employee-performance">
              <h3>Employee Performance Summary</h3>
              <div className="emp-perf-list">
                {[...new Set(timesheets.map((t) => t.employee))].map((emp) => {
                  const empData = timesheets.filter((t) => t.employee === emp);
                  const empHours = empData.reduce((sum, t) => sum + t.hours, 0);
                  const empCost = empData.reduce(
                    (sum, t) => sum + t.hours * t.rate,
                    0,
                  );
                  return (
                    <div key={emp} className="emp-perf-item">
                      <div className="emp-info">
                        <span className="emp-name">{emp}</span>
                        <span className="emp-stats">
                          {empHours}h | ₹{(empCost / 100000).toFixed(1)}L
                        </span>
                      </div>
                      <div className="emp-status">
                        {empData.filter((t) => t.status === "Approved").length}/
                        {empData.length} Approved
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="payments-section">
            <div className="payments-header">
              <h2>Payment Tracking</h2>
              <button
                className="btn-primary"
                onClick={() => setShowPaymentModal(true)}
              >
                + Record Payment
              </button>
            </div>

            {/* Payment Overview */}
            <div className="payment-overview">
              <div className="payment-card">
                <div className="card-label">Total Budget</div>
                <div className="card-value">
                  ₹{(selectedProject.budget / 10000000).toFixed(1)}Cr
                </div>
              </div>
              <div className="payment-card">
                <div className="card-label">Total Spent</div>
                <div className="card-value">
                  ₹{(selectedProject.spent / 10000000).toFixed(1)}Cr
                </div>
              </div>
              <div className="payment-card green">
                <div className="card-label">Client Paid</div>
                <div className="card-value">
                  ₹{((selectedProject.clientPaid || 0) / 10000000).toFixed(1)}Cr
                </div>
              </div>
              <div className="payment-card yellow">
                <div className="card-label">Pending Payment</div>
                <div className="card-value">
                  ₹
                  {(
                    (selectedProject.spent -
                      (selectedProject.clientPaid || 0)) /
                    10000000
                  ).toFixed(1)}
                  Cr
                </div>
              </div>
            </div>

            {/* Payment Progress */}
            <div className="payment-progress">
              <h3>Payment Status</h3>
              <div className="progress-item">
                <div className="progress-header">
                  <span>Paid vs Total Spent</span>
                  <span className="percentage">
                    {selectedProject.spent > 0
                      ? (
                          ((selectedProject.clientPaid || 0) /
                            selectedProject.spent) *
                          100
                        ).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="progress-bar large">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${selectedProject.spent > 0 ? ((selectedProject.clientPaid || 0) / selectedProject.spent) * 100 : 0}%`,
                      backgroundColor: "#22c55e",
                    }}
                  ></div>
                </div>
                <div className="progress-labels">
                  <span>
                    Paid: ₹
                    {((selectedProject.clientPaid || 0) / 10000000).toFixed(1)}
                    Cr
                  </span>
                  <span>
                    Spent: ₹{(selectedProject.spent / 10000000).toFixed(1)}Cr
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div className="payment-history">
              <h3>Payment History</h3>
              <div className="payments-table">
                <div className="table-header">
                  <div>Date</div>
                  <div>Amount</div>
                  <div>Reference</div>
                  <div>Status</div>
                </div>
                {payments.map((payment) => (
                  <div key={payment.id} className="table-row">
                    <div>{new Date(payment.date).toLocaleDateString()}</div>
                    <div className="amount">
                      ₹{(payment.amount / 10000000).toFixed(1)}Cr
                    </div>
                    <div>{payment.reference}</div>
                    <div>
                      <span
                        className={`status ${payment.status.toLowerCase()}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
              <div
                className="modal-overlay"
                onClick={() => setShowPaymentModal(false)}
              >
                <div
                  className="modal-content"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>Record Client Payment</h2>
                    <button
                      className="close-btn"
                      onClick={() => setShowPaymentModal(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Payment Date *</label>
                      <input
                        type="date"
                        value={newPayment.date}
                        onChange={(e) =>
                          setNewPayment({ ...newPayment, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Amount (₹) *</label>
                      <input
                        type="number"
                        placeholder="e.g., 10000000"
                        value={newPayment.amount}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            amount: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Reference / Invoice #</label>
                      <input
                        type="text"
                        placeholder="e.g., INV-001"
                        value={newPayment.reference}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            reference: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="info-box">
                      <strong>Total Pending:</strong> ₹
                      {(
                        (selectedProject.spent -
                          (selectedProject.clientPaid || 0)) /
                        10000000
                      ).toFixed(1)}
                      Cr
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      className="btn-secondary"
                      onClick={() => setShowPaymentModal(false)}
                    >
                      Cancel
                    </button>
                    <button className="btn-primary" onClick={handleAddPayment}>
                      Record Payment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NEW PROJECT MODAL */}
        {showProjectModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowProjectModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Project</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowProjectModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Commercial Tower - Downtown"
                    value={newProject.name}
                    onChange={(e) =>
                      setNewProject({ ...newProject, name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Client Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., ABC Developers"
                    value={newProject.client}
                    onChange={(e) =>
                      setNewProject({ ...newProject, client: e.target.value })
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={newProject.startDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={newProject.endDate}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Budget (₹) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 50000000"
                    value={newProject.budget}
                    onChange={(e) =>
                      setNewProject({ ...newProject, budget: e.target.value })
                    }
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Project Manager</label>
                    <input
                      type="text"
                      placeholder="Manager name"
                      value={newProject.manager}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          manager: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>Team Size</label>
                    <input
                      type="number"
                      placeholder="e.g., 45"
                      value={newProject.teamSize}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          teamSize: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleAddProject}>
                  Create Project
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectManagement;
