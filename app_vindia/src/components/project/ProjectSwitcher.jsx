import { useState, useRef, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";

export default function ProjectSwitcher() {
  const { activeProject, setActiveProject, PROJECTS } = useProject();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="project-switcher-wrap" ref={ref}>
      <button
        className="project-switcher-btn"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="ps-icon">🏗️</div>
        <div className="ps-info">
          <span className="ps-code">{activeProject.code}</span>
          <span className="ps-name">{activeProject.name}</span>
        </div>
        <svg
          className={`ps-chevron${open ? " open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="ps-dropdown">
          <div className="ps-dropdown-label">Switch Project</div>
          {PROJECTS.map((p) => (
            <div
              key={p.id}
              className={`ps-option${p.id === activeProject.id ? " active" : ""}`}
              onClick={() => {
                setActiveProject(p);
                setOpen(false);
              }}
            >
              <div className="ps-option-top">
                <span className="ps-option-code">{p.code}</span>
                {p.id === activeProject.id && (
                  <span className="ps-active-dot" />
                )}
              </div>
              <div className="ps-option-name">{p.name}</div>
              <div className="ps-option-meta">{p.location}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
