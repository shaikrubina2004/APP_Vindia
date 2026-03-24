import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../styles/projects.css";

function ProjectsPage() {

  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/projects");
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProject = async () => {
    try {
      await axios.post("http://localhost:5000/api/projects", {
        name: "Apartment Tower",
        client: "ABC Builders",
        budget: 50000000,
        manager_id: 1
      });

      fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="projects-container">

      {/* HEADER */}
      <div className="projects-header">
        <h1>Project Management</h1>

        <button className="add-btn" onClick={handleAddProject}>
          + Add Project
        </button>
      </div>

      {/* TABLE */}
      <div className="table-wrapper">
        <table className="projects-table">

          <thead>
            <tr>
              <th>Project</th>
              <th>Client</th>
              <th>Budget</th>
              <th>Manager</th>
            </tr>
          </thead>

          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No projects found
                </td>
              </tr>
            ) : (
              projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <td>{p.name}</td>
                  <td>{p.client}</td>
                  <td>₹{p.budget?.toLocaleString()}</td>
                  <td>{p.manager || "N/A"}</td>
                </tr>
              ))
            )}
          </tbody>

        </table>
      </div>

    </div>
  );
}

export default ProjectsPage;