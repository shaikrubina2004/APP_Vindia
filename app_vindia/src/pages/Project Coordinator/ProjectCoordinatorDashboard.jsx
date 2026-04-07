import React, { useState, useEffect } from "react";
import ProjectCard from "../../components/project/ProjectCard";
import WbsPage from "../wbs/WbsPage";
import IncidentPanel from "../../components/coordinator/IncidentPanel";
import "./Coordinator.css";

const ProjectCoordinatorDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    fetch("http://localhost:5000/api/projects")
      .then((res) => res.json())
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0]);
      })
      .catch((err) => console.error(err));
  }, []);

  return (
    <div className="pc-dashboard">

      {/* HEADER */}
      <div className="pc-header">
        <h1>Project Coordinator Dashboard</h1>
        <p>Manage execution, coordination & communication</p>
      </div>

      {/* PROJECT CARDS */}
      <div className="pc-projects">
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

      {/* TABS */}
      <div className="pc-tabs">
        {["overview", "wbs", "daily", "incidents", "payments"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="pc-content">

        {activeTab === "overview" && (
          <OverviewSection selectedProject={selectedProject} />
        )}

        {activeTab === "wbs" && (
          <WbsPage selectedProject={selectedProject} />
        )}

        {activeTab === "daily" && <DailyUpdates />}

        {activeTab === "incidents" && <IncidentPanel />}

        {activeTab === "payments" && <PaymentsSection />}

      </div>
    </div>
  );
};

export default ProjectCoordinatorDashboard;


/* ================= OVERVIEW ================= */

const OverviewSection = ({ selectedProject }) => {
  if (!selectedProject) return <p>Select a project</p>;

  return (
    <div className="pc-overview">

      {/* SUMMARY */}
      <div className="pc-cards">

        <div className="pc-card">
          <h4>Progress</h4>
          <p>{selectedProject.progress || 0}%</p>
        </div>

        <div className="pc-card highlight">
          <h4>Next Milestone</h4>
          <p>Structure Work</p>
        </div>

        <div className="pc-card">
          <h4>Pending Tasks</h4>
          <p>8 Tasks</p>
        </div>

        <div className="pc-card">
          <h4>Team</h4>
          <p>Architect, Engineer, PM</p>
        </div>

      </div>

      {/* EXTRA SECTION */}
      <div className="pc-grid-2">

        <div className="pc-box">
          <h3>Milestone Planning</h3>
          <p>Plan upcoming stages and assign deadlines</p>
          <button className="pc-btn">Plan Next Stage</button>
        </div>

        <div className="pc-box">
          <h3>Notifications</h3>
          <p>✔ Client notified: Foundation completed</p>
          <p>⏳ Upcoming stage alert pending</p>
        </div>

      </div>

    </div>
  );
};


/* ================= DAILY ================= */

const DailyUpdates = () => {
  const [form, setForm] = useState({
    workDone: "",
    issues: "",
    pending: "",
    nextPlan: "",
  });

  return (
    <div className="pc-daily">

      <h2>Daily Progress</h2>

      <div className="pc-grid-2">

        <textarea placeholder="Work done today"
          onChange={(e) => setForm({ ...form, workDone: e.target.value })} />

        <textarea placeholder="Issues / Incidents"
          onChange={(e) => setForm({ ...form, issues: e.target.value })} />

        <textarea placeholder="Pending tasks"
          onChange={(e) => setForm({ ...form, pending: e.target.value })} />

        <textarea placeholder="Tomorrow plan"
          onChange={(e) => setForm({ ...form, nextPlan: e.target.value })} />

      </div>

      <button className="pc-btn">Save Update</button>

    </div>
  );
};


/* ================= PAYMENTS ================= */

const PaymentsSection = () => {
  return (
    <div className="pc-payments">

      <h2>Payments</h2>

      <div className="pc-grid-2">

        <div className="payment-card">
          <p>Foundation - ₹10,00,000</p>
          <span className="pending">Pending</span>
          <button className="pc-btn">Send Reminder</button>
        </div>

        <div className="payment-card">
          <p>Structure - ₹15,00,000</p>
          <span className="completed">Completed</span>
        </div>

      </div>

    </div>
  );
};