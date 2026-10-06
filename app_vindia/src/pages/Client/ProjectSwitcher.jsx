import { useClientAPI, getClientProjectId, setClientProjectId } from "../../hooks/Useclientapi.jsx";

// Shown only to clients who own more than one project.
export default function ProjectSwitcher() {
  const { data } = useClientAPI("/client/projects");
  const projects = data?.projects || [];
  if (projects.length < 2) return null;

  const onChange = (e) => {
    setClientProjectId(e.target.value);
    window.location.reload(); // every page refetches for the chosen project
  };

  return (
    <label className="cl-switcher">
      <span>Project</span>
      <select className="cl-select" value={getClientProjectId()} onChange={onChange}>
        <option value="">Latest active project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </label>
  );
}
