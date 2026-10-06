import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [PROJECTS, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const response = await api.get("/projects");

        if (!mounted) return;

        const data = Array.isArray(response.data) ? response.data : [];

        const openOption = {
          id: null,
          code: "OPEN",
          name: "Open Incidents",
          location: "Not project-specific",
        };

        const mapped = data.map((p) => ({
          id: String(p.id),
          code: p.code ?? `PRJ-${String(p.id).padStart(3, "0")}`,
          name: p.name,
          location: p.location ?? "",
        }));

        const allOptions = [openOption, ...mapped];

        setProjects(allOptions);

        const savedId = localStorage.getItem("activeProjectId");

        const saved = allOptions.find(
          (p) => String(p.id) === String(savedId)
        );

        setActiveProject(saved ?? openOption);
      } catch (err) {
        console.error(
          "Failed to load projects:",
          err?.response?.data || err.message || err
        );

        if (mounted) {
          setProjects([]);
          setActiveProject(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSetActiveProject = (project) => {
    setActiveProject(project);

    if (project?.id !== null && project?.id !== undefined) {
      localStorage.setItem("activeProjectId", String(project.id));
    } else {
      localStorage.removeItem("activeProjectId");
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        activeProject,
        setActiveProject: handleSetActiveProject,
        PROJECTS,
        loading,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}