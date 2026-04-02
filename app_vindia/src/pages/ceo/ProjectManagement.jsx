import React, { useState, useEffect } from "react";
import "./ProjectManagement.css";
import ProjectCard from "../../components/project/ProjectCard";
import CostTracking from "../../pages/projects/CostTracking";
import WbsPage from "../../pages/wbs/WbsPage";

function ProjectManagement() {
  const [activePhase, setActivePhase] = useState(null);
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/projects")
      .then((res) => res.json())
      .then((data) => {
        console.log("PROJECT DATA:", data); // 👈 debug

        setProjects(data);

        // auto select first project
        if (data.length > 0) {
          setSelectedProject(data[0]);
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, []);
  const [siteEngineers, setSiteEngineers] = useState([]);
  useEffect(() => {
    fetch("http://localhost:5000/api/projects/site-engineers")
      .then((res) => res.json())
      .then((data) => setSiteEngineers(data))
      .catch((err) => console.error(err));
  }, []);
  const [managers, setManagers] = useState([]);
  useEffect(() => {
    fetch("http://localhost:5000/api/projects/managers")
      .then((res) => res.json())
      .then((data) => setManagers(data))
      .catch((err) => console.error(err));
  }, []);
  // 🔥 MOVE THIS UP
const [selectedProject, setSelectedProject] = useState(null);

const [costSummary, setCostSummary] = useState([]);


useEffect(() => {
  if (!selectedProject) return;

  fetch(`http://localhost:5000/api/cost-summary/${selectedProject.id}`)
    .then((res) => res.json())
    .then((data) => {
      console.log("API DATA:", data); // 👈 check this
      setCostSummary(data);
    })
    .catch((err) => console.error(err));
}, [selectedProject]);


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
  const handleAddProject = async () => {
    try {
      if (!newProject.name || !newProject.client || !newProject.budget) {
        alert("Please fill required fields");
        return;
      }

      const res = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newProject.name,
          client: newProject.client,
          budget: newProject.budget,
          start_date: newProject.startDate,
          end_date: newProject.endDate,
          manager_id: newProject.manager_id, // ✅ ADD
          site_engineer_id: newProject.site_engineer_id,
        }),
      });

      const data = await res.json();

      // ✅ Update UI instantly
      setProjects((prev) => [data, ...prev]);
      setSelectedProject(data);

      // ✅ Reset form
      setNewProject({
        name: "",
        client: "",
        startDate: "",
        endDate: "",
        budget: "",
        site_engineer_id: "",
      });

      setShowProjectModal(false);
    } catch (err) {
      console.error("Create project error:", err);
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
 const safeData = Array.isArray(costSummary) ? costSummary : [];

const costBreakdown = {
  labour: costSummary.reduce((s, w) => s + Number(w.labour_cost || 0), 0),
  material: costSummary.reduce((s, w) => s + Number(w.material_cost || 0), 0),
  equipment: costSummary.reduce((s, w) => s + Number(w.equipment_cost || 0), 0),
  misc: costSummary.reduce((s, w) => s + Number(w.misc_cost || 0), 0),
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

      {/* Content */}
      <div className="pm-content">
        {/* OVERVIEW TAB */}
      <div className="overview-section">

  {/* FILTER BUTTONS */}
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
      )
    )}
  </div>

  {/* PROJECT CARDS */}
  {loading ? (
    <p>Loading projects...</p>
  ) : (
    <div className="projects-grid">
      {projects.map((proj) => (
        <ProjectCard
          key={proj.id}
          proj={proj}
          isActive={selectedProject?.id === proj.id}
          onClick={() => setSelectedProject(proj)}
          variant="overview"
        />
      ))}
    </div>
  )}

  {/* ✅ TABS (ONLY BUTTONS HERE) */}
 <div className="pm-tabs">
  <button
    className={activeTab === "overview" ? "active" : ""}
    onClick={() => setActiveTab("overview")}
  >
    ≡ Project Overview
  </button>

  <button
    className={activeTab === "wbs" ? "active" : ""}
    onClick={() => setActiveTab("wbs")}
  >
    ⬚ WBS & Tasks
  </button>

  <button
    className={activeTab === "timesheet" ? "active" : ""}
    onClick={() => setActiveTab("timesheet")}
  >
    🗂 Timesheet
  </button>

  <button
    className={activeTab === "cost" ? "active" : ""}
    onClick={() => setActiveTab("cost")}
  >
    📊 Cost Tracking
  </button>

  <button
    className={activeTab === "payments" ? "active" : ""}
    onClick={() => setActiveTab("payments")}
  >
    ✳ Payments
  </button>
</div>

  {/* 🔥 TAB CONTENT (SEPARATE) */}

  {activeTab === "overview" && (
    <div className="three-column-layout">
      
      {/* QUICK INSIGHTS */}
      <ProjectCard variant="overview">
        <div className="quick-insights animate">
          <h3>Quick Insights</h3>
          <p>⚠ 2 projects delayed</p>
          <p>💰 1 over budget</p>
          <p>🚀 Top: 90% progress</p>
        </div>
      </ProjectCard>

      {/* TIMESHEET */}
      <ProjectCard variant="overview">
        <div className="timesheet-section-new">
          <h3>Timesheet Submissions</h3>
          {timesheets.slice(-5).reverse().map((ts) => (
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
      </ProjectCard>

      {/* RECENT ACTIVITIES */}
      <ProjectCard variant="overview">
        <div className="recent-activity">
          <h3>
            {selectedProject
              ? `${selectedProject.name} - Recent Activities`
              : "Recent Activities"}
          </h3>
          <p>• Sample activity</p>
        </div>
      </ProjectCard>

    </div>
  )}

  {activeTab === "wbs" && (
    <WbsPage selectedProject={selectedProject} />
  )}

  {activeTab === "timesheet" && (
    <div className="timesheet-section">Timesheet content</div>
  )}

  {activeTab === "cost" && (
    <CostTracking
      selectedProject={selectedProject}
      activePhase={activePhase}
      setActivePhase={setActivePhase}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      costBreakdown={costBreakdown}
      calculateRemaining={calculateRemaining}
      calculatePercentage={calculatePercentage}
      costSummary={costSummary}
    />
  )}

  {activeTab === "payments" && (
    <div className="payments-section">Payments content</div>
  )}

</div>
        

       

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
                    <select
                      value={newProject.manager_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          manager_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Manager</option>

                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Site Engineer</label>
                    <select
                      value={newProject.site_engineer_id || ""}
                      onChange={(e) =>
                        setNewProject({
                          ...newProject,
                          site_engineer_id: e.target.value,
                        })
                      }
                    >
                      <option value="">Select Site Engineer</option>

                      {siteEngineers.map((eng) => (
                        <option key={eng.id} value={eng.id}>
                          {eng.name}
                        </option>
                      ))}
                    </select>
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
