import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import WbsPage from "../wbs/WbsPage";

function ProjectDetails() {

  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    fetchProject();
  }, []);

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
    <div style={{ padding: "20px" }}>

      {/* PROJECT HEADER */}
      <h1>{project.name}</h1>

      <div style={{ display: "flex", gap: "40px", marginTop: "10px" }}>
        <div>
          <p>Client</p>
          <h3>{project.client}</h3>
        </div>

        <div>
          <p>Budget</p>
          <h3>₹{project.budget}</h3>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
        <button onClick={() => setTab("overview")}>Overview</button>
        <button onClick={() => setTab("wbs")}>WBS</button>
        <button onClick={() => setTab("timesheet")}>Timesheet</button>
        <button onClick={() => setTab("cost")}>Cost</button>
      </div>

      {/* CONTENT */}
      <div style={{ marginTop: "20px" }}>

        {tab === "overview" && (
          <div>
            <h2>Overview</h2>
            <p>Project summary and stats will come here</p>
          </div>
        )}

        {tab === "wbs" && <WbsPage projectId={id} />}

        {tab === "timesheet" && (
          <div>
            <h2>Timesheet (Next Step)</h2>
          </div>
        )}

        {tab === "cost" && (
          <div>
            <h2>Cost Module (Later)</h2>
          </div>
        )}

      </div>

    </div>
  );
}

export default ProjectDetails;