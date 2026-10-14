// ===== FILE: APP_Vindia/app_vindia/src/hooks/useMyProjects.js =====
// The project(s) the logged-in user is assigned to, plus a remembered "active" one.
//   Site Engineer -> projects.site_engineer_id, Project Manager -> manager, etc.
// (GET /api/projects/mine). Replaces hard-coded project names and the unscoped
// "every project in the company" dropdowns.
import { useCallback, useEffect, useState } from "react";
import api from "../services/api";

const KEY = "active_project_id";
const readSaved = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};

export default function useMyProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(readSaved);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/projects/mine");
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || "Could not load your projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // The saved choice only counts if the user is still assigned to it.
  const activeProject =
    projects.find((p) => String(p.id) === String(activeId)) || projects[0] || null;

  const setActiveProject = useCallback((id) => {
    setActiveId(String(id));
    try { localStorage.setItem(KEY, String(id)); } catch { /* storage blocked */ }
  }, []);

  return { projects, activeProject, setActiveProject, loading, error, reload };
}
