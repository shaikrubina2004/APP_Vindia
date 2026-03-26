import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/projects.css";

function ProjectDetails() {
  const { id } = useParams();   // 🔥 get project id
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/projects/${id}`);
      setProject(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="project-details">

      {/* HEADER */}
      <div className="project-header">
        <div>
          <h1>{project.name}</h1>
          <p>
            Client: {project.client} • Budget: ₹
            {project.budget?.toLocaleString()}
          </p>
        </div>
      </div>

      {/* TABS */}
      <div className="project-tabs">
        {["overview", "wbs", "timesheet", "finance"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab active" : "tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="project-content">

        {activeTab === "overview" && (
          <div className="card">
            <h3>Project Info</h3>
            <p><strong>Manager:</strong> {project.manager || "N/A"}</p>
            <p><strong>Budget:</strong> ₹{project.budget}</p>
          </div>
        )}

        {activeTab === "wbs" && (
          <div className="card">
            <h3>WBS (Coming Soon)</h3>
          </div>
        )}

        {activeTab === "timesheet" && (
          <div className="card">
            <h3>Timesheet (Coming Soon)</h3>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="card">
            <h3>Finance (Coming Soon)</h3>
          </div>
        )}

      </div>
    </div>
  );
}

export default ProjectDetails;