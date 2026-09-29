// ===== FILE: APP_Vindia/app_vindia/src/pages/hr/recruitment/JobOpeningDetail.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import recruitmentService from "../../../services/recruitmentService";
import "./JobOpeningDetail.css";

const STAGE_OPTIONS = ["all", "applied", "screening", "interview", "offer", "hired", "rejected"];

const EMPTY_CANDIDATE = { name: "", email: "", phone: "", source: "" };

const JobOpeningDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [opening, setOpening] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [stageFilter, setStageFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_CANDIDATE);
  const [formError, setFormError] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [openingRes, candidatesRes] = await Promise.all([
        recruitmentService.getJobOpeningById(id),
        recruitmentService.getCandidatesByJobOpening(id),
      ]);
      setOpening(openingRes.data);
      setCandidates(candidatesRes.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load this job opening");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = candidates.filter(
    (c) => stageFilter === "all" || c.stage === stageFilter
  );

  const stageCounts = STAGE_OPTIONS.reduce((acc, s) => {
    if (s === "all") return acc;
    acc[s] = candidates.filter((c) => c.stage === s).length;
    return acc;
  }, {});

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
      : "—";

  const openModal = () => {
    setForm(EMPTY_CANDIDATE);
    setFormError(null);
    setShowModal(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCandidate = async () => {
    setFormError(null);

    if (!form.name.trim()) {
      setFormError("Candidate name is required.");
      return;
    }

    setSaving(true);
    try {
      await recruitmentService.createCandidate({
        job_opening_id: Number(id),
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        source: form.source || null,
      });
      setShowModal(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to add candidate");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="jod-state">Loading…</div>;

  if (error && !opening) {
    return (
      <div className="jod-state jod-state--error">
        {error}
        <button onClick={() => navigate("/hr/recruitment/job-openings")}>
          Back to Job Openings
        </button>
      </div>
    );
  }

  return (
    <div className="jod-page">
      <button className="jod-back-btn" onClick={() => navigate("/hr/recruitment/job-openings")}>
        ← Back to Job Openings
      </button>

      <div className="jod-header">
        <div>
          <h1>{opening.title}</h1>
          <span className={`jod-badge jod-badge--${opening.status}`}>{opening.status}</span>
        </div>
        <button className="jod-primary-btn" onClick={openModal}>
          + Add Candidate
        </button>
      </div>

      <div className="jod-meta">
        <div className="jod-meta-item">
          <span className="jod-meta-label">Department</span>
          <span className="jod-meta-value">{opening.department || "—"}</span>
        </div>
        <div className="jod-meta-item">
          <span className="jod-meta-label">Project</span>
          <span className="jod-meta-value">{opening.project_name || "—"}</span>
        </div>
        <div className="jod-meta-item">
          <span className="jod-meta-label">Vacancies</span>
          <span className="jod-meta-value">{opening.vacancies}</span>
        </div>
        <div className="jod-meta-item">
          <span className="jod-meta-label">Posted</span>
          <span className="jod-meta-value">{formatDate(opening.created_at)}</span>
        </div>
      </div>

      {opening.description && <p className="jod-description">{opening.description}</p>}

      <div className="jod-filters">
        {STAGE_OPTIONS.map((s) => (
          <button
            key={s}
            className={`jod-filter-btn ${stageFilter === s ? "jod-filter-btn--active" : ""}`}
            onClick={() => setStageFilter(s)}
          >
            {s === "all" ? "All" : s} {s !== "all" ? `(${stageCounts[s] || 0})` : ""}
          </button>
        ))}
      </div>

      {error && <p className="jod-inline-error">{error}</p>}

      {filtered.length === 0 ? (
        <p className="jod-empty">
          {candidates.length === 0
            ? "No candidates yet. Add one to get started."
            : "No candidates at this stage."}
        </p>
      ) : (
        <table className="jod-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Source</th>
              <th>Stage</th>
              <th>Applied</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} onClick={() => navigate(`/hr/recruitment/candidates/${c.id}`)}>
                <td className="jod-name-cell">{c.name}</td>
                <td>{c.email || c.phone || "—"}</td>
                <td>{c.source || "—"}</td>
                <td>
                  <span className={`jod-stage-badge jod-stage-badge--${c.stage}`}>
                    {c.stage}
                  </span>
                </td>
                <td>{formatDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="jod-modal-backdrop" onClick={() => !saving && setShowModal(false)}>
          <div className="jod-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Candidate</h2>

            <label className="jod-field">
              Name *
              <input name="name" value={form.name} onChange={handleFormChange} />
            </label>

            <div className="jod-field-row">
              <label className="jod-field">
                Email
                <input name="email" type="email" value={form.email} onChange={handleFormChange} />
              </label>
              <label className="jod-field">
                Phone
                <input name="phone" value={form.phone} onChange={handleFormChange} />
              </label>
            </div>

            <label className="jod-field">
              Source
              <select name="source" value={form.source} onChange={handleFormChange}>
                <option value="">Select source…</option>
                <option value="referral">Referral</option>
                <option value="job_board">Job Board</option>
                <option value="walk_in">Walk-in</option>
                <option value="other">Other</option>
              </select>
            </label>

            {formError && <p className="jod-form-error">{formError}</p>}

            <div className="jod-modal-actions">
              <button className="jod-cancel-btn" disabled={saving} onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="jod-primary-btn" disabled={saving} onClick={handleAddCandidate}>
                {saving ? "Adding…" : "Add Candidate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobOpeningDetail;