import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import recruitmentService from "../../../services/recruitmentService";
import { getProjects } from "../../../services/projectService";
import api from "../../../services/api";
import "./JobOpenings.css";

// Used ONLY if the departments API call fails, so the dropdown is never empty.
const FALLBACK_DEPARTMENTS = [
  "HR",
  "IT",
  "Operations",
  "Construction",
  "Business",
  "Finance",
  "Design",
  "Marketing",
  "Management",
];

// Roles in the roles table that are not real hirable jobs (e.g. portal
// accounts). Add more names here (exact spelling) to hide them from the
// Job Title dropdown.
const EXCLUDED_ROLES = ["Client"];

// Special <option> value for the "Other (enter manually)" choice.
const OTHER_VALUE = "__other__";

const STATUS_OPTIONS = ["all", "open", "closed"];

const EMPTY_FORM = {
  title: "", // a role name from the DB, or OTHER_VALUE
  customTitle: "", // typed text, used only when title === OTHER_VALUE
  department: "", // department NAME (job_openings.department is a text column)
  project_id: "",
  vacancies: 1,
  description: "",
};

const JobOpenings = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openings, setOpenings] = useState([]);
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]); // [{ id, name }]
  const [roles, setRoles] = useState([]); // [{ id, name, department_id }]
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadOpenings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recruitmentService.getAllJobOpenings();
      setOpenings(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load job openings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOpenings();
  }, [loadOpenings]);

  // Projects are only needed for the create form's dropdown — a failure
  // here shouldn't block the list, so it's loaded separately and quietly.
  useEffect(() => {
    (async () => {
      try {
        const res = await getProjects();
        setProjects(res.data.projects || res.data || []);
      } catch {
        setProjects([]);
      }
    })();
  }, []);

  // Departments + roles come straight from the database, so anything
  // added there later shows up here with no code change.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/users/departments");
        setDepartments(res.data || []);
      } catch (err) {
        console.warn("Could not load departments, using fallback list", err);
        setDepartments(FALLBACK_DEPARTMENTS.map((name, i) => ({ id: i + 1, name })));
      }
      try {
        const res = await api.get("/roles");
        setRoles(res.data || []);
      } catch (err) {
        console.warn("Could not load roles", err);
        setRoles([]);
      }
    })();
  }, []);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "—";

  const filtered = openings.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    const term = searchTerm.toLowerCase();
    return (
      (o.title || "").toLowerCase().includes(term) ||
      (o.department || "").toLowerCase().includes(term) ||
      (o.project_name || "").toLowerCase().includes(term)
    );
  });

  const openCount = openings.filter((o) => o.status === "open").length;
  const totalVacancies = openings
    .filter((o) => o.status === "open")
    .reduce((sum, o) => sum + Number(o.vacancies || 0), 0);
  const activeCandidates = openings.reduce(
    (sum, o) => sum + Number(o.active_candidate_count || 0),
    0
  );

  // Roles shown in the Job Title dropdown: only the chosen department's
  // roles, or every role if no department is chosen yet. Names are
  // de-duplicated and sorted.
  const roleOptions = useMemo(() => {
    const selectedDept = departments.find((d) => d.name === form.department);
    const pool = selectedDept
      ? roles.filter((r) => Number(r.department_id) === Number(selectedDept.id))
      : roles;
    return [...new Set(pool.map((r) => r.name))]
      .filter((name) => !EXCLUDED_ROLES.includes(name))
      .sort((a, b) => a.localeCompare(b));
  }, [roles, departments, form.department]);

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Changing the department resets the title if the picked role does not
  // belong to the new department (manual "Other" entries are kept).
  const handleDepartmentChange = (e) => {
    const department = e.target.value;
    setForm((prev) => {
      const dept = departments.find((d) => d.name === department);
      let title = prev.title;
      if (title && title !== OTHER_VALUE && dept) {
        const stillValid = roles.some(
          (r) => r.name === title && Number(r.department_id) === Number(dept.id)
        );
        if (!stillValid) title = "";
      }
      return { ...prev, department, title };
    });
  };

  const handleCreate = async () => {
    setFormError(null);

    const finalTitle =
      form.title === OTHER_VALUE ? form.customTitle.trim() : form.title.trim();

    if (!finalTitle) {
      setFormError(
        form.title === OTHER_VALUE
          ? "Please type the job title."
          : "Please select a job title."
      );
      return;
    }
    if (!(Number(form.vacancies) >= 1)) {
      setFormError("Vacancies must be at least 1.");
      return;
    }

    setSaving(true);
    try {
      await recruitmentService.createJobOpening({
        title: finalTitle,
        department: form.department || null,
        project_id: form.project_id || null,
        vacancies: Number(form.vacancies),
        description: form.description.trim() || null,
      });
      setShowModal(false);
      loadOpenings();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create job opening");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (e, opening) => {
    e.stopPropagation(); // don't trigger the row's navigate
    setTogglingId(opening.id);
    try {
      await recruitmentService.updateJobOpeningStatus(
        opening.id,
        opening.status === "open" ? "closed" : "open"
      );
      await loadOpenings();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading && openings.length === 0) {
    return <div className="jo-state">Loading job openings…</div>;
  }

  if (error && openings.length === 0) {
    return (
      <div className="jo-state jo-state--error">
        {error}
        <button onClick={loadOpenings}>Retry</button>
      </div>
    );
  }

  return (
    <div className="jo-page">
      <div className="jo-header">
        <div>
          <h1>Job Openings</h1>
          <p>Positions you're hiring for. Open one to manage its candidates.</p>
        </div>
        <button className="jo-primary-btn" onClick={openModal}>
          + New Opening
        </button>
      </div>

      {error && <p className="jo-inline-error">{error}</p>}

      <div className="jo-stats">
        <div className="jo-stat-card">
          <span className="jo-stat-label">Open Positions</span>
          <span className="jo-stat-value">{openCount}</span>
        </div>
        <div className="jo-stat-card">
          <span className="jo-stat-label">Total Vacancies</span>
          <span className="jo-stat-value">{totalVacancies}</span>
        </div>
        <div className="jo-stat-card">
          <span className="jo-stat-label">Active Candidates</span>
          <span className="jo-stat-value">{activeCandidates}</span>
        </div>
      </div>

      <div className="jo-toolbar">
        <div className="jo-filters">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              className={`jo-filter-btn ${statusFilter === s ? "jo-filter-btn--active" : ""}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
        <input
          className="jo-search"
          type="text"
          placeholder="Search by title, department, or project…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="jo-empty">
          {openings.length === 0
            ? "No job openings yet. Create your first one to start adding candidates."
            : "No job openings match this view."}
        </p>
      ) : (
        <table className="jo-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Project</th>
              <th>Vacancies</th>
              <th>Active Candidates</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                onClick={() => navigate(`/hr/recruitment/job-openings/${o.id}`)}
              >
                <td className="jo-title-cell">{o.title}</td>
                <td>{o.department || "—"}</td>
                <td>{o.project_name || "—"}</td>
                <td>{o.vacancies}</td>
                <td>{o.active_candidate_count}</td>
                <td>
                  <span className={`jo-badge jo-badge--${o.status}`}>{o.status}</span>
                </td>
                <td>{formatDate(o.created_at)}</td>
                <td>
                  <button
                    className="jo-toggle-btn"
                    disabled={togglingId === o.id}
                    onClick={(e) => handleToggleStatus(e, o)}
                  >
                    {togglingId === o.id
                      ? "…"
                      : o.status === "open"
                      ? "Close"
                      : "Reopen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="jo-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="jo-modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Job Opening</h2>

            <div className="jo-field-row">
              <label className="jo-field">
                Department
                <select
                  name="department"
                  value={form.department}
                  onChange={handleDepartmentChange}
                >
                  <option value="">Select department…</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="jo-field">
                Vacancies *
                <input
                  type="number"
                  min="1"
                  name="vacancies"
                  value={form.vacancies}
                  onChange={handleFormChange}
                />
              </label>
            </div>

            <label className="jo-field">
              Job Title *
              <select name="title" value={form.title} onChange={handleFormChange}>
                <option value="">Select job title…</option>
                {roleOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                <option value={OTHER_VALUE}>Other (enter manually)</option>
              </select>
            </label>

            {form.title === OTHER_VALUE && (
              <label className="jo-field">
                Enter job title *
                <input
                  name="customTitle"
                  value={form.customTitle}
                  onChange={handleFormChange}
                  placeholder="e.g. Site Supervisor"
                  autoFocus
                />
              </label>
            )}

            <label className="jo-field">
              Project (optional)
              <select name="project_id" value={form.project_id} onChange={handleFormChange}>
                <option value="">Not tied to a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="jo-field">
              Description
              <textarea
                name="description"
                rows={4}
                value={form.description}
                onChange={handleFormChange}
                placeholder="Responsibilities, requirements, experience…"
              />
            </label>

            {formError && <p className="jo-form-error">{formError}</p>}

            <div className="jo-modal-actions">
              <button
                className="jo-cancel-btn"
                disabled={saving}
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button className="jo-primary-btn" disabled={saving} onClick={handleCreate}>
                {saving ? "Creating…" : "Create Opening"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpenings;