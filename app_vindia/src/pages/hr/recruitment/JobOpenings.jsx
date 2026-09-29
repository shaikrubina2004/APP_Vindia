// ===== FILE: APP_Vindia/app_vindia/src/pages/hr/recruitment/JobOpenings.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import recruitmentService from "../../../services/recruitmentService";
import { getProjects } from "../../../services/projectService";
import "./JobOpenings.css";

// Same department list AddEmployee.jsx uses (DEPT_MAP), so a hired
// candidate's department pre-fills cleanly later.
const DEPARTMENTS = [
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

const STATUS_OPTIONS = ["all", "open", "closed"];

const EMPTY_FORM = {
  title: "",
  department: "",
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

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async () => {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("Job title is required.");
      return;
    }
    if (!(Number(form.vacancies) >= 1)) {
      setFormError("Vacancies must be at least 1.");
      return;
    }

    setSaving(true);
    try {
      await recruitmentService.createJobOpening({
        title: form.title.trim(),
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

            <label className="jo-field">
              Job Title *
              <input
                name="title"
                value={form.title}
                onChange={handleFormChange}
                placeholder="e.g. Site Supervisor"
              />
            </label>

            <div className="jo-field-row">
              <label className="jo-field">
                Department
                <select name="department" value={form.department} onChange={handleFormChange}>
                  <option value="">Select department…</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
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