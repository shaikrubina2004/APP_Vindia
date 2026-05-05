import React, { useState, useEffect, useRef } from "react";
import { getProjects } from "../../services/projectService";
import { getArchitects, assignArchitect } from "../../services/architectAssignService";
import "./ArchitectAssign.css";

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const fmt = (n) => {
  const num = Number(n);
  if (!num) return "—";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(1)}L`;
  return `₹${num.toLocaleString("en-IN")}`;
};

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_MAP = {
  "IN PROGRESS": { bg: "#eff6ff", color: "#2563eb", border: "#93c5fd" },
  "Active":      { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  "active":      { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
  "ON HOLD":     { bg: "#fefce8", color: "#ca8a04", border: "#fde047" },
  "Completed":   { bg: "#f0fdf4", color: "#16a34a", border: "#86efac" },
};
const getStatus = (s) => STATUS_MAP[s] || { bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" };

/* ─────────────────────────────────────────
   STATUS PILL
───────────────────────────────────────── */
const StatusPill = ({ status }) => {
  const cfg = getStatus(status);
  return (
    <span
      className="aat-pill"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      {status}
    </span>
  );
};

/* ─────────────────────────────────────────
   MULTI-SELECT ARCHITECT DROPDOWN
───────────────────────────────────────── */
const ArchMultiSelect = ({ architects, selected, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const toggle = (id) => {
    if (disabled) return;
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const label =
    selected.length === 0
      ? "— Select architect(s) —"
      : selected.length === 1
      ? architects.find((a) => a.id === selected[0])?.name || "1 selected"
      : `${selected.length} architects selected`;

  return (
    <div className="aat-ms" ref={ref}>
      <button
        type="button"
        className={`aat-ms__trigger ${open ? "open" : ""} ${disabled ? "dis" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
      >
        <span>{label}</span>
        <span className="aat-ms__arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="aat-ms__drop">
          {architects.map((a) => {
            const checked = selected.includes(a.id);
            return (
              <div
                key={a.id}
                className={`aat-ms__opt ${checked ? "checked" : ""}`}
                onClick={() => toggle(a.id)}
              >
                <span className={`aat-ms__chk ${checked ? "checked" : ""}`}>
                  {checked ? "✓" : ""}
                </span>
                <div>
                  <p className="aat-ms__name">{a.name}</p>
                  <p className="aat-ms__sub">{a.email}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="aat-chips">
          {selected.map((id) => {
            const arch = architects.find((a) => a.id === id);
            return (
              <span key={id} className="aat-chip">
                {arch?.name || `#${id}`}
                {!disabled && (
                  <button type="button" onClick={() => toggle(id)}>
                    ×
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   DETAIL + ASSIGNMENT PANEL
───────────────────────────────────────── */
const DetailPanel = ({ project, architects, onClose, onSubmitSuccess, currentUserId }) => {
  const [assignType, setAssignType]   = useState("single");
  const [selectedIds, setSelectedIds] = useState([]);
  const [teamMembers, setTeamMembers] = useState([{ name: "", role: "" }]);
  const [submitting, setSubmitting]   = useState(false);

  // ✅ Editable if:
  //    1. Project not yet assigned (anyone can assign)
  //    2. Project assigned to ME (I can edit my own assignment)
  // Locked if assigned to someone else
  const isAssignedToMe = project.architect_id === currentUserId;
  const isLocked = project.architect_id && !isAssignedToMe;

  useEffect(() => {
    if (project.assignment_data) {
      const d = project.assignment_data;
      setAssignType(d.type || "single");
      setSelectedIds(d.architect_ids || (project.architect_id ? [project.architect_id] : []));
      setTeamMembers(d.team?.length ? d.team : [{ name: "", role: "" }]);
    } else if (project.architect_id === currentUserId) {
      // ✅ Assigned to me but no assignment_data yet — pre-fill my ID
      setAssignType("single");
      setSelectedIds([currentUserId]);
      setTeamMembers([{ name: "", role: "" }]);
    } else {
      setAssignType("single");
      setSelectedIds([]);
      setTeamMembers([{ name: "", role: "" }]);
    }
  }, [project.id, project.assignment_data, currentUserId]);

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const team = assignType === "group" ? teamMembers.filter((m) => m.name.trim()) : [];
      const assignment_data = {
        type: assignType,
        architect_ids: selectedIds,
        team,
        assigned_at: new Date().toISOString(),
      };

      const res = await assignArchitect(project.id, {
        architect_id: selectedIds[0],
        assignment_data,
      });

      onSubmitSuccess(project.id, {
        architect_id: selectedIds[0],
        assignment_data,
      });

      showToast(`✅ ${res.data.message || "Assignment saved!"}`);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save. Please try again.";
      showToast(`❌ ${msg}`, true);
    } finally {
      setSubmitting(false);
    }
  };

  const budget    = Number(project.budget || 0);
  const spent     = Number(project.spent || 0);
  const paid      = Number(project.client_paid || 0);
  const remaining = Math.max(0, budget - spent);

  return (
    <div className="aat-detail-panel">
      {/* ── Panel header ── */}
      <div className="aat-dp-header">
        <div>
          <p className="aat-dp-client">{project.client || "—"}</p>
          <h3 className="aat-dp-name">{project.name}</h3>
        </div>
        <div className="aat-dp-header-right">
          <StatusPill status={project.status} />
          <button className="aat-close-btn" onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="aat-stats">
        <div className="aat-stat">
          <p className="aat-stat__l">Progress</p>
          <p className="aat-stat__v" style={{ color: "#2563eb" }}>{project.progress || 0}%</p>
        </div>
        <div className="aat-stat">
          <p className="aat-stat__l">Budget</p>
          <p className="aat-stat__v" style={{ color: "#0a2540" }}>{fmt(budget)}</p>
        </div>
        <div className="aat-stat">
          <p className="aat-stat__l">Spent</p>
          <p className="aat-stat__v" style={{ color: "#dc2626" }}>{fmt(spent)}</p>
        </div>
        <div className="aat-stat">
          <p className="aat-stat__l">Received</p>
          <p className="aat-stat__v" style={{ color: "#16a34a" }}>{fmt(paid)}</p>
        </div>
      </div>

      {/* ── Budget bar ── */}
      <div className="aat-budget-bar-track" style={{ marginBottom: 16 }}>
        <div
          className="aat-budget-bar-fill aat-budget-bar-fill--spent"
          style={{ width: `${budget ? Math.min(100, (spent / budget) * 100) : 0}%` }}
        />
        <div
          className="aat-budget-bar-fill aat-budget-bar-fill--paid"
          style={{ width: `${budget ? Math.min(100, (paid / budget) * 100) : 0}%` }}
        />
      </div>
      <div className="aat-budget-legend" style={{ marginBottom: 16 }}>
        <span><span className="aat-dot aat-dot--red" />Spent {fmt(spent)}</span>
        <span><span className="aat-dot aat-dot--green" />Received {fmt(paid)}</span>
        <span><span className="aat-dot aat-dot--blue" />Remaining {fmt(remaining)}</span>
      </div>

      {/* ── Info grid ── */}
      <div className="aat-info-grid">
        {[
          ["", "Location",     project.location],
          ["", "Building Type",project.building_type],
          ["", "Plot Size",    project.plot_size ? `${project.plot_size} sqft` : null],
          ["", "Floors",       project.floors],
          ["", "Start Date",   fmtDate(project.start_date)],
          ["", "End Date",     fmtDate(project.end_date)],
          ["", "Client",       project.client],
          ["", "Phone",        project.phone],
        ].map(([icon, label, value]) => (
          <div key={label} className="aat-info-row">
            <span className="aat-info-icon">{icon}</span>
            <div>
              <p className="aat-info-lbl">{label}</p>
              <p className="aat-info-val">{value || "—"}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Assignment section ── */}
      <div className={`aat-assign ${isLocked ? "aat-assign--locked" : ""}`}>
        {isLocked ? (
          // 🔒 Assigned to someone else — read only
          <LockedView project={project} architects={architects} />
        ) : (
          // ✅ Not assigned yet OR assigned to me — fully editable
          <>
            <p className="aat-assign-title">
              {isAssignedToMe ? "Edit  Assignment" : "Assign Architect"}
            </p>

            
            <div className="aat-type-toggle">
              <button
                className={`aat-type-btn ${assignType === "single" ? "active" : ""}`}
                onClick={() => setAssignType("single")}
              >
                Single
              </button>
              <button
                className={`aat-type-btn ${assignType === "group" ? "active" : ""}`}
                onClick={() => setAssignType("group")}
              >
                Team
              </button>
            </div>

            <div className="aat-field">
              <label>Select Architect(s) *</label>
              <ArchMultiSelect
                architects={architects}
                selected={selectedIds}
                onChange={setSelectedIds}
                disabled={false}
              />
            </div>

            {assignType === "group" && (
              <div className="aat-field">
                <label>Team Members</label>
                <div className="aat-team-list">
                  {teamMembers.map((m, i) => (
                    <div key={i} className="aat-team-row">
                      <input
                        type="text"
                        placeholder="Member name"
                        value={m.name}
                        onChange={(e) => {
                          const next = [...teamMembers];
                          next[i] = { ...next[i], name: e.target.value };
                          setTeamMembers(next);
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Role (e.g. MEP Engineer)"
                        value={m.role}
                        onChange={(e) => {
                          const next = [...teamMembers];
                          next[i] = { ...next[i], role: e.target.value };
                          setTeamMembers(next);
                        }}
                      />
                      {i > 0 && (
                        <button
                          type="button"
                          className="aat-rm-btn"
                          onClick={() => setTeamMembers(teamMembers.filter((_, idx) => idx !== i))}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="aat-add-row-btn"
                  onClick={() => setTeamMembers([...teamMembers, { name: "", role: "" }])}
                >
                  + Add member
                </button>
              </div>
            )}

            <button
              className="aat-submit-btn"
              disabled={selectedIds.length === 0 || submitting}
              onClick={handleSubmit}
            >
              {submitting ? "Saving…" : isAssignedToMe ? "Update Assignment" : "Submit Assignment"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   LOCKED VIEW
───────────────────────────────────────── */
const LockedView = ({ project, architects }) => {
  const d = project.assignment_data;
  const isGroup = d?.type === "group";
  const archNames = (d?.architect_ids || [project.architect_id]).map((id) => {
    const found = architects.find((a) => a.id === id);
    return found ? found.name : `Architect #${id}`;
  });

  return (
    <div className="aat-locked">
      <div className="aat-locked__hdr">
        <span style={{ fontSize: 20 }}>🔒</span>
        <div>
          <p className="aat-locked__sub">
            This project is assigned to another architect and cannot be modified by you.
          </p>
        </div>
      </div>
      <div className="aat-locked__card">
        <div className="aat-locked__row">
          <p className="aat-locked__lbl">Type</p>
          <p className="aat-locked__val">{isGroup ? "Group Project" : "Single Architect"}</p>
        </div>
        <div className="aat-locked__row">
          <p className="aat-locked__lbl">{isGroup ? "Architects" : "Architect"}</p>
          <div>
            {archNames.map((n, i) => (
              <span key={i} className="aat-chip" style={{ marginRight: 4, marginBottom: 4 }}>
                {n}
              </span>
            ))}
          </div>
        </div>
        {d?.assigned_at && (
          <div className="aat-locked__row">
            <p className="aat-locked__lbl">Assigned At</p>
            <p className="aat-locked__val">{new Date(d.assigned_at).toLocaleString("en-IN")}</p>
          </div>
        )}
      </div>
      {isGroup && d?.team?.length > 0 && (
        <>
          <p className="aat-locked__lbl" style={{ margin: "12px 0 6px" }}>Team Members</p>
          <table className="aat-team-table">
            <thead>
              <tr><th>#</th><th>Name</th><th>Role</th></tr>
            </thead>
            <tbody>
              {d.team.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{m.name}</td>
                  <td>{m.role || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(msg, isError = false) {
  const t = document.createElement("div");
  t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:${isError ? "#dc2626" : "#0f172a"};color:#fff;padding:12px 22px;
    border-radius:12px;font-size:12px;font-weight:600;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,.25);white-space:nowrap;font-family:inherit;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity .3s";
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

/* ─────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────── */
const ArchitectAssignTable = () => {
  // ✅ Get logged-in architect's ID from localStorage
  const currentUserId = JSON.parse(localStorage.getItem("user"))?.id;

  const [projects, setProjects]     = useState([]);
  const [architects, setArchitects] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilter]   = useState("ALL");

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projRes, archRes] = await Promise.all([
          getProjects(),
          getArchitects(),
        ]);

        const data = projRes.data?.data || projRes.data || [];
        const sorted = [
          ...data.filter((p) => p.status === "IN PROGRESS"),
          ...data.filter((p) => p.status !== "IN PROGRESS"),
        ];
        setProjects(sorted);
        setArchitects(archRes.data?.data || []);
      } catch (err) {
        console.error("Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleSubmitSuccess = (projectId, payload) => {
    setProjects((prev) => {
      const updated = prev.map((p) =>
        p.id === projectId ? { ...p, ...payload } : p
      );
      const updatedProject = updated.find((p) => p.id === projectId);
      setSelected(updatedProject || null);
      return updated;
    });
  };

  const statuses = ["ALL", ...Array.from(new Set(projects.map((p) => p.status?.toLowerCase())))];

  const filtered = projects.filter((p) => {
    if (!p) return false;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(q) ||
      p.client?.toLowerCase().includes(q) ||
      p.location?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "ALL" || p.status?.toLowerCase() === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="aat-page">
      {/* ── Page Header ── */}
      <div className="aat-page-header">
        <div>
          <h1 className="aat-page-title">Architect Assignment</h1>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="aat-filters">
        <div className="aat-search-wrap">
          <span className="aat-search-icon">🔍</span>
          <input
            className="aat-search"
            type="text"
            placeholder="Search by project, client or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="aat-search-clr" onClick={() => setSearch("")}>×</button>
          )}
        </div>
        <div className="aat-status-filters">
          {statuses.map((s) => (
            <button
              key={s}
              className={`aat-filter-btn ${filterStatus === s ? "active" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s === "ALL" ? "ALL" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body: Table + Detail Panel ── */}
      <div className={`aat-body ${selected ? "aat-body--split" : ""}`}>

        {/* TABLE */}
        <div className="aat-table-wrap">
          {loading ? (
            <div className="aat-loading">Loading projects…</div>
          ) : filtered.length === 0 ? (
            <div className="aat-empty"><br />No projects found</div>
          ) : (
            <table className="aat-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project Name</th>
                  <th>Client</th>
                  <th>Budget</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Architect</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((proj, idx) => {
                  const isActive      = selected?.id === proj.id;
                  const isAssigned    = !!proj.architect_id;
                  const isMine        = proj.architect_id === currentUserId;

                  return (
                    <tr
                      key={proj.id}
                      className={`aat-row ${isActive ? "aat-row--active" : ""} ${isAssigned ? "aat-row--assigned" : ""}`}
                      onClick={() => setSelected(isActive ? null : proj)}
                    >
                      <td className="aat-td-num">{idx + 1}</td>
                      <td className="aat-td-name">
                        <p className="aat-proj-name">{proj.name}</p>
                        {proj.building_type && (
                          <p className="aat-proj-type">{proj.building_type}</p>
                        )}
                      </td>
                      <td>{proj.client || "—"}</td>
                      <td><span className="aat-budget">{fmt(proj.budget)}</span></td>
                      <td>{proj.location || "—"}</td>
                      <td><StatusPill status={proj.status} /></td>
                      <td>
                        {isAssigned ? (
                          <span className="aat-arch-chip aat-arch-chip--done">
                            {architects.find((a) => a.id === proj.architect_id)?.name ||
                              `ID #${proj.architect_id}`}
                            {/* ✅ Show "You" badge if this is the logged-in architect */}
                            
                          </span>
                        ) : (
                          <span className="aat-arch-chip aat-arch-chip--pending">⚠ Not assigned</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`aat-action-btn ${
                            isAssigned
                              ? isMine
                                ? "aat-action-btn--assign"  // ✅ Edit style for own projects
                                : "aat-action-btn--view"    // 🔒 View only for others
                              : "aat-action-btn--assign"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(isActive ? null : proj);
                          }}
                        >
                          {isAssigned ? (isMine ? "Edit" : "View") : "Assign"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* DETAIL PANEL */}
        {selected && (
          <div className="aat-panel-wrap">
            <DetailPanel
              key={selected.id}
              project={selected}
              architects={architects}
              currentUserId={currentUserId}
              onClose={() => setSelected(null)}
              onSubmitSuccess={handleSubmitSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchitectAssignTable;