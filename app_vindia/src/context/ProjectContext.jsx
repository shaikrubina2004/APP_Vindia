import { createContext, useContext, useState } from "react";

export const PROJECTS = [
  {
    id: "p1",
    code: "VIN-001",
    name: "VIndia Tower Block A",
    location: "Bengaluru",
  },
  {
    id: "p2",
    code: "VIN-002",
    name: "VIndia Commercial Hub",
    location: "Hyderabad",
  },
  {
    id: "p3",
    code: "VIN-003",
    name: "VIndia Residential Phase 2",
    location: "Chennai",
  },
];

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [activeProject, setActiveProject] = useState(PROJECTS[0]);
  return (
    <ProjectContext.Provider
      value={{ activeProject, setActiveProject, PROJECTS }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
