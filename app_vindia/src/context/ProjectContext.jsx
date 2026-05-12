import { createContext, useContext, useState, useEffect } from "react";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [PROJECTS, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/projects")
      .then((res) => res.json())
      .then((data) => {
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
        const saved = allOptions.find((p) => String(p.id) === savedId);
        // ✅ restore saved project, fallback to openOption only if nothing saved
        setActiveProject(saved ?? openOption);
      })
      .catch((err) => console.error("Failed to load projects:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSetActiveProject = (project) => {
    setActiveProject(project);
    // ✅ only persist real projects, not "Open Incidents"
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