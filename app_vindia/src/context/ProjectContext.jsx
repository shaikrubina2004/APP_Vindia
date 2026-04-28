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
        /*
          Map backend fields to what ProjectSwitcher expects:
          id, code, name, location
          Backend returns: id (INT), name, client, location, etc.
          "code" doesn't exist in your projects table so we
          generate it from the id — replace with your actual
          code field if you add one to the projects table later.
        */
        const mapped = data.map((p) => ({
          id: String(p.id),
          code: p.code ?? `PRJ-${String(p.id).padStart(3, "0")}`,
          name: p.name,
          location: p.location ?? "",
        }));
        setProjects(mapped);
        setActiveProject(mapped[0] ?? null);
      })
      .catch((err) => console.error("Failed to load projects:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ProjectContext.Provider
      value={{ activeProject, setActiveProject, PROJECTS, loading }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
