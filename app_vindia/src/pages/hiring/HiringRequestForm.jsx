// ===== FILE: APP_Vindia/app_vindia/src/pages/hiring/HiringRequestForm.jsx =====
// Managers raise a hiring request here (route /hiring-requests/new), or edit and
// resubmit a rejected one (route /hiring-requests/:id/edit).
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import hiringRequestService from "../../services/hiringRequestService";
import useMyProjects from "../../hooks/useMyProjects";
import { useAuth } from "../../context/useAuth";
import { toAnnualRupees } from "../hr/recruitment/offerSalary";
import { EMPLOYMENT_TYPES, URGENCIES } from "./hiringConstants";
import "./HiringRequests.css";

// Used only if the roles API fails, so the department dropdown is never empty.
const FALLBACK_DEPARTMENTS = [
  "HR", "IT", "Operations", "Construction", "Business",
  "Finance", "Design", "Marketing", "Management",
];

// Roles in the roles table that are not real hirable jobs.
const EXCLUDED_ROLES = ["Client"];
const OTHER_VALUE = "__other__";

const EMPTY_FORM = {
  department: "",
  title: "",
  customTitle: "",
  project_id: "",
  vacancies: 1,
  employment_type: "full_time",
  urgency: "normal",
  expected_joining_date: "",
  salary_min_lpa: "",
  salary_max_lpa: "",
  justification: "",
  job_description: "",
};

const normalizeRole = (role) =>
  String(role || "").trim().toLowerCase().replace(/[\s-]+/g, "_");

const flowNotice = (role) => {
  if (role === "finance_manager") {
    return "This request goes straight to HR (Finance cannot approve a request raised by Finance).";
  }
  if (role === "hr_manager") {
    return "This request goes to Finance for budget approval, then needs CEO approval at the HR step.";
  }
  return "This request goes to Finance for budget approval first, then to HR. HR starts recruitment once both approve.";
};

export default function HiringRequestForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  const { projects } = useMyProjects();

  const [form, setForm] = useState(EMPTY_FORM);
  const [roles, setRoles] = useState([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [existing, setExisting] = useState(null); // request being edited
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const populated = useRef(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  /* Roles + departments come from the database, same as the Job Openings page */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/roles");
        setRoles(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.warn("Could not load roles", err);
        setRoles([]);
      } finally {
        setRolesLoaded(true);
      }
    })();
  }, []);

  /* Edit mode: load the rejected request */
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await hiringRequestService.getOne(id);
        setExisting(res.data);
      } catch (err) {
        setError(err?.response?.data?.error || "Could not load this request");
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [id, isEdit]);

  const departments = useMemo(() => {
    const fromRoles = [
      ...new Set(roles.filter((r) => r.department_name).map((r) => r.department_name)),
    ].sort((a, b) => a.localeCompare(b));
    return fromRoles.length ? fromRoles : FALLBACK_DEPARTMENTS;
  }, [roles]);

  const titleOptions = useMemo(
    () =>
      roles
        .filter((r) => r.department_name === form.department && !EXCLUDED_ROLES.includes(r.name))
        .map((r) => r.name),
    [roles, form.department],
  );

  /* Edit mode: fill the form once both the request and the roles are loaded */
  useEffect(() => {
    if (!existing || !rolesLoaded || populated.current) return;
    populated.current = true;

    const known = roles
      .filter((r) => r.department_name === existing.department && !EXCLUDED_ROLES.includes(r.name))
      .map((r) => r.name);
    const inList = known.includes(existing.position_title);

    const toLpa = (v) =>
      v === null || v === undefined || v === "" ? "" : String(Number(v) / 100000);

    setForm({
      department: existing.department || "",
      title: inList ? existing.position_title : OTHER_VALUE,
      customTitle: inList ? "" : existing.position_title,
      project_id: existing.project_id ? String(existing.project_id) : "",
      vacancies: existing.vacancies || 1,
      employment_type: existing.employment_type || "full_time",
      urgency: existing.urgency || "normal",
      expected_joining_date: existing.expected_joining_date || "",
      salary_min_lpa: toLpa(existing.salary_min),
      salary_max_lpa: toLpa(existing.salary_max),
      justification: existing.justification || "",
      job_description: existing.job_description || "",
    });
  }, [existing, rolesLoaded, roles]);

  const onDepartmentChange = (e) =>
    setForm((f) => ({ ...f, department: e.target.value, title: "", customTitle: "" }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const positionTitle = (form.title === OTHER_VALUE ? form.customTitle : form.title).trim();
    if (!form.department) return setError("Please choose a department.");
    if (!positionTitle) return setError("Please choose or enter a position title.");
    if (!form.justification.trim()) return setError("Please explain why this hire is needed.");

    const vacancies = Number(form.vacancies);
    if (!Number.isInteger(vacancies) || vacancies < 1) {
      return setError("Number of vacancies must be at least 1.");
    }

    const minLpa = form.salary_min_lpa === "" ? "" : Number(form.salary_min_lpa);
    const maxLpa = form.salary_max_lpa === "" ? "" : Number(form.salary_max_lpa);
    if ((minLpa !== "" && Number.isNaN(minLpa)) || (maxLpa !== "" && Number.isNaN(maxLpa))) {
      return setError("Salary must be a number (in LPA).");
    }
    if (minLpa !== "" && maxLpa !== "" && maxLpa < minLpa) {
      return setError("Maximum salary cannot be less than minimum salary.");
    }

    const payload = {
      position_title: positionTitle,
      department: form.department,
      project_id: form.project_id || null,
      vacancies,
      employment_type: form.employment_type,
      urgency: form.urgency,
      expected_joining_date: form.expected_joining_date || null,
      // stored as yearly rupees
      salary_min: minLpa === "" ? null : toAnnualRupees(minLpa, "lpa"),
      salary_max: maxLpa === "" ? null : toAnnualRupees(maxLpa, "lpa"),
      justification: form.justification.trim(),
      job_description: form.job_description.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) await hiringRequestService.resubmit(id, payload);
      else await hiringRequestService.create(payload);
      navigate("/hiring-requests");
    } catch (err) {
      setError(err?.response?.data?.error || "Could not submit the request. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loadingExisting) {
    return <div className="hr-req-page">Loading request…</div>;
  }

  return (
    <div className="hr-req-page">
      <div className="hr-req-header">
        <div>
          <h1>{isEdit ? "Edit & Resubmit Hiring Request" : "New Hiring Request"}</h1>
          <p>Request approval to hire for a new position.</p>
        </div>
        <button
          type="button"
          className="hr-req-btn hr-req-btn--ghost"
          onClick={() => navigate("/hiring-requests")}
        >
          ← My Hiring Requests
        </button>
      </div>

      <div className="hr-req-alert hr-req-alert--info">{flowNotice(role)}</div>

      {isEdit && existing && existing.status !== "rejected" && (
        <div className="hr-req-alert hr-req-alert--warn">
          Only rejected requests can be edited and resubmitted.
        </div>
      )}

      {isEdit && existing && (existing.finance_remark || existing.hr_remark) && (
        <div className="hr-req-alert hr-req-alert--warn">
          {existing.finance_remark && (
            <div>
              <b>Finance remark:</b> {existing.finance_remark}
            </div>
          )}
          {existing.hr_remark && (
            <div>
              <b>HR remark:</b> {existing.hr_remark}
            </div>
          )}
        </div>
      )}

      {error && <div className="hr-req-alert hr-req-alert--error">{error}</div>}

      <form className="hr-req-form" onSubmit={handleSubmit}>
        <div className="hr-req-grid">
          <div className="hr-req-field">
            <label>
              Department <span className="hr-req-required">*</span>
            </label>
            <select value={form.department} onChange={onDepartmentChange}>
              <option value="">Select department</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="hr-req-field">
            <label>
              Position title <span className="hr-req-required">*</span>
            </label>
            <select
              value={form.title}
              onChange={set("title")}
              disabled={!form.department}
            >
              <option value="">
                {form.department ? "Select position" : "Choose a department first"}
              </option>
              {titleOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
              {form.department && <option value={OTHER_VALUE}>Other (enter manually)</option>}
            </select>
            {form.title === OTHER_VALUE && (
              <input
                type="text"
                placeholder="Enter the position title"
                value={form.customTitle}
                onChange={set("customTitle")}
              />
            )}
          </div>

          <div className="hr-req-field">
            <label>
              Number of vacancies <span className="hr-req-required">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.vacancies}
              onChange={set("vacancies")}
            />
          </div>

          <div className="hr-req-field">
            <label>Employment type</label>
            <select value={form.employment_type} onChange={set("employment_type")}>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hr-req-field">
            <label>Project (optional)</label>
            <select value={form.project_id} onChange={set("project_id")}>
              <option value="">Not linked to a project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hr-req-field">
            <label>Urgency</label>
            <select value={form.urgency} onChange={set("urgency")}>
              {URGENCIES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="hr-req-field">
            <label>Minimum salary (LPA)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 3"
              value={form.salary_min_lpa}
              onChange={set("salary_min_lpa")}
            />
            <span className="hr-req-hint">Lakhs per year, for one position.</span>
          </div>

          <div className="hr-req-field">
            <label>Maximum salary (LPA)</label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="e.g. 4.5"
              value={form.salary_max_lpa}
              onChange={set("salary_max_lpa")}
            />
            <span className="hr-req-hint">Finance uses this range to check the budget.</span>
          </div>

          <div className="hr-req-field">
            <label>Expected joining date</label>
            <input
              type="date"
              value={form.expected_joining_date}
              onChange={set("expected_joining_date")}
            />
          </div>

          <div className="hr-req-field hr-req-field--full">
            <label>
              Justification — why is this hire needed?{" "}
              <span className="hr-req-required">*</span>
            </label>
            <textarea
              value={form.justification}
              onChange={set("justification")}
              placeholder="Workload, new project, replacement, team gap…"
            />
          </div>

          <div className="hr-req-field hr-req-field--full">
            <label>Job description / requirements (optional)</label>
            <textarea
              value={form.job_description}
              onChange={set("job_description")}
              placeholder="Responsibilities, skills, experience needed. HR will use this for the job opening."
            />
          </div>
        </div>

        <div className="hr-req-form-actions">
          <button
            type="button"
            className="hr-req-btn hr-req-btn--ghost"
            onClick={() => navigate("/hiring-requests")}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="hr-req-btn hr-req-btn--primary"
            disabled={saving || (isEdit && existing && existing.status !== "rejected")}
          >
            {saving ? "Submitting…" : isEdit ? "Resubmit Request" : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  );
}