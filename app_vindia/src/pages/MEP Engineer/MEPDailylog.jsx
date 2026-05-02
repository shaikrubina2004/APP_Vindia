import { useState, useRef, useEffect } from "react";
import { useProject } from "../../context/ProjectContext";
import { API } from "../../services/authService";
import "../../styles/MEPEngineer.css";

const CHECKS = [
  {
    label: "MEP coordination with Architect confirmed",
    sub: "Design compatibility verified for today's scope",
    key: "coord_checked",
  },
  {
    label: "Structural coordination reviewed",
    sub: "No new clashes identified or incidents raised",
    key: "structural_checked",
  },
  {
    label: "Latest drawing version used on site",
    sub: "Verified team is working on current revision",
    key: "drawing_checked",
  },
  {
    label: "Incident queue reviewed",
    sub: "All open incidents acknowledged and actioned",
    key: "incident_checked",
  },
  {
    label: "Site photos uploaded",
    sub: "Photographic evidence attached to this log",
    key: "photos_uploaded",
  },
];

const DISC_BADGE = {
  Mechanical: { cls: "badge-mep-m", label: "Mechanical" },
  Electrical: { cls: "badge-mep-e", label: "Electrical" },
  Plumbing: { cls: "badge-mep-p", label: "Plumbing" },
};

export default function MEPDailyLog() {
  const { activeProject } = useProject();
  const today = new Date().toISOString().split("T")[0];
  const [floors, setFloors] = useState([]);
  const [pastLogs, setPastLogs] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    floor_id: "",
    discipline: "",
    log_date: today,
    shift: "Day",
    workers_deployed: "",
    materials_used: "",
    activities: "",
    blockers: "",
    plan_tomorrow: "",
    completion_pct: "",
    coord_checked: false,
    structural_checked: false,
    drawing_checked: false,
    incident_checked: false,
    photos_uploaded: false,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!activeProject) return;
    API.get(`/drawings/floors/${activeProject.id}`)
      .then((r) => setFloors(r.data))
      .catch((err) => console.error("Failed to load floors:", err));
    API.get(`/drawings/daily-logs/${activeProject.id}?limit=3`)
      .then((r) => setPastLogs(r.data))
      .catch((err) => console.error("Failed to load logs:", err));
  }, [activeProject?.id]);

  const toggle = (key) => set(key, !form[key]);

  const handlePhotos = (e) => {
    Array.from(e.target.files)
      .slice(0, 10)
      .forEach((f) => {
        const reader = new FileReader();
        reader.onload = (ev) =>
          setPhotos((p) => [...p.slice(0, 9), ev.target.result]);
        reader.readAsDataURL(f);
      });
  };

  const submit = async (status) => {
    try {
      await API.post("/drawings/daily-logs", {
        ...form,
        project_id: activeProject.id,
        photos_uploaded: photos.length > 0,
        status,
      });
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      API.get(`/drawings/daily-logs/${activeProject.id}?limit=3`).then((r) =>
        setPastLogs(r.data),
      );
    } catch (err) {
      alert("Failed: " + (err.response?.data?.error ?? err.message));
    }
  };
  return (
    <div className="mep-page">
      {/* ── Header ── */}
      <div className="mep-header">
        <div>
          <h1>Daily Progress Log</h1>
          <p>Mandatory EOD submission — MEP installation activities</p>
        </div>
        <button className="btn-outline">View History</button>
      </div>

      {/* ── Alert ── */}
      {!pastLogs.some(
        (l) => l.log_date?.slice(0, 10) === today && l.status === "Submitted",
      ) && (
        <div className="alert alert-amber">
          <span className="alert-icon">⏰</span>
          <span>
            <strong>Reminder:</strong> Today's daily log has not been submitted
            yet. Log must be posted before end of day (6:00 PM).
          </span>
        </div>
      )}

      {/* ── Log Form ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">📋 New Daily Log Entry</span>
          <span className="badge badge-red">Mandatory</span>
        </div>
        <div className="mep-card-body">
          <div
            className="edit-form-grid"
            style={{ gridTemplateColumns: "repeat(5, 1fr)" }}
          >
            <div className="edit-form-group">
              <label>Project</label>
              <input
                className="edit-form-input"
                value={activeProject?.name ?? ""}
                readOnly
                style={{
                  background: "var(--bg-light)",
                  color: "var(--text-secondary)",
                }}
              />
            </div>
            <div className="edit-form-group">
              <label>
                Date <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="date"
                className="edit-form-input"
                value={form.log_date}
                onChange={(e) => set("log_date", e.target.value)}
              />
            </div>
            <div className="edit-form-group">
              <label>Shift</label>
              <select
                className="edit-form-input"
                value={form.shift}
                onChange={(e) => set("shift", e.target.value)}
              >
                <option value="Day">Day Shift (6AM–6PM)</option>
                <option value="Night">Night Shift (6PM–6AM)</option>
              </select>
            </div>
            <div className="edit-form-group">
              <label>
                Work Zone <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="edit-form-input"
                value={form.floor_id}
                onChange={(e) => set("floor_id", e.target.value)}
              >
                <option value="">Select zone</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="edit-form-group">
              <label>
                Discipline <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select
                className="edit-form-input"
                value={form.discipline}
                onChange={(e) => set("discipline", e.target.value)}
              >
                <option value="">Select</option>
                <option value="Mechanical">Mechanical (HVAC)</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
              </select>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div className="edit-form-group">
              <label>Workers Deployed</label>
              <input
                type="number"
                className="edit-form-input"
                placeholder="e.g. 12"
                min={0}
                value={form.workers_deployed}
                onChange={(e) => set("workers_deployed", e.target.value)}
              />
            </div>
            <div className="edit-form-group">
              <label>Materials Used</label>
              <input
                type="text"
                className="edit-form-input"
                placeholder="e.g. 50m HDPE pipe, 4 AHU units"
                value={form.materials_used}
                onChange={(e) => set("materials_used", e.target.value)}
              />
            </div>
            <div className="edit-form-group">
              <label>
                Completion % for this Floor & Discipline
                <span style={{ color: "var(--danger)" }}> *</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  className="edit-form-input"
                  placeholder="e.g. 68"
                  min={0}
                  max={100}
                  style={{ paddingRight: 32 }}
                  value={form.completion_pct}
                  onChange={(e) => set("completion_pct", e.target.value)}
                />
                <span
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-secondary)",
                  }}
                >
                  %
                </span>
              </div>
            </div>
          </div>

          <div className="edit-form-group" style={{ marginTop: 12 }}>
            <label>
              Activities Completed Today{" "}
              <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <textarea
              className="edit-form-input"
              style={{ minHeight: 80, resize: "vertical" }}
              placeholder="Describe MEP installation activities completed today — include zone, scope, and progress..."
              value={form.activities}
              onChange={(e) => set("activities", e.target.value)}
            />
          </div>
          <div className="edit-form-group" style={{ marginTop: 12 }}>
            <label>Issues / Blockers</label>
            <textarea
              className="edit-form-input"
              style={{ minHeight: 64, resize: "vertical" }}
              placeholder="Any issues, delays, or blockers encountered today..."
              value={form.blockers}
              onChange={(e) => set("blockers", e.target.value)}
            />
          </div>
          <div className="edit-form-group" style={{ marginTop: 12 }}>
            <label>Plan for Tomorrow</label>
            <textarea
              className="edit-form-input"
              style={{ minHeight: 64, resize: "vertical" }}
              placeholder="Next day MEP activities planned..."
              value={form.plan_tomorrow}
              onChange={(e) => set("plan_tomorrow", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Checklist ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">✅ EOD Checklist</span>
        </div>
        <div className="mep-card-body">
          <div className="checklist">
            {CHECKS.map((c) => (
              <div
                key={c.key}
                className={`check-item${form[c.key] ? " checked" : ""}`}
                onClick={() => toggle(c.key)}
              >
                <div className="check-box">{form[c.key] ? "✓" : ""}</div>
                <div>
                  <div className="check-label">{c.label}</div>
                  <div className="check-sub">{c.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Photo Upload ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">📸 Site Photos</span>
        </div>
        <div className="mep-card-body">
          <div className="upload-zone" onClick={() => fileRef.current.click()}>
            <span className="upload-zone-icon">📷</span>
            <h3>Upload Site Photos</h3>
            <p>
              <strong>Click to upload</strong> or drag and drop — JPG, PNG — max
              10 photos
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handlePhotos}
            />
          </div>
          {photos.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
              }}
            >
              {photos.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 8,
                    objectFit: "cover",
                    border: "1px solid var(--border-color)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="mep-card-foot">
          <button className="btn-outline" onClick={() => submit("Draft")}>
            Save Draft
          </button>
          <button className="btn-primary" onClick={() => submit("Submitted")}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Submit Daily Log
          </button>
        </div>
      </div>

      {/* ── Past Logs (attendance-style rows) ── */}
      <div className="mep-card">
        <div className="mep-card-head">
          <span className="card-title">🗓️ Recent Logs</span>
          <span className="badge badge-blue">Last 3 Days</span>
        </div>
        <div className="mep-card-body" style={{ padding: 0 }}>
          <div className="records-list" style={{ gap: 0 }}>
            {pastLogs.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  fontSize: 12,
                  color: "var(--text-secondary)",
                }}
              >
                No logs yet for this project.
              </div>
            ) : (
              pastLogs.map((log, i) => {
                const d = new Date(log.log_date);
                const badge = DISC_BADGE[log.discipline];
                return (
                  <div
                    key={log.id}
                    className="record-row bl-blue"
                    style={{
                      borderRadius: 0,
                      borderBottom:
                        i < pastLogs.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                      borderLeft: "3px solid var(--primary-blue)",
                    }}
                  >
                    <div
                      className="row-avatar"
                      style={{
                        flexDirection: "column",
                        gap: 0,
                        height: 40,
                        width: 40,
                      }}
                    >
                      <span
                        style={{ fontSize: 14, fontWeight: 700, lineHeight: 1 }}
                      >
                        {d.getDate()}
                      </span>
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 700,
                          letterSpacing: 1,
                        }}
                      >
                        {d
                          .toLocaleString("en", { month: "short" })
                          .toUpperCase()}
                      </span>
                    </div>

                    <div className="row-main" style={{ flex: 1, minWidth: 0 }}>
                      <span className="row-name">
                        {log.activities?.slice(0, 60)}…
                      </span>
                      <span className="row-sub">
                        {log.floor_name} · Workers:{" "}
                        {log.workers_deployed ?? "—"} ·{" "}
                        {log.materials_used || "No materials noted"}
                      </span>
                    </div>

                    <div className="row-divider" />

                    {badge && (
                      <span className={`badge ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}

                    <div className="row-spacer" />
                    <span
                      className={`status-pill ${
                        log.status === "Submitted"
                          ? "pill-submitted"
                          : log.status === "Verified"
                            ? "pill-resolved"
                            : "pill-inprog"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showToast && (
        <div className="toast toast-success">
          ✅ Daily log submitted successfully!
        </div>
      )}
    </div>
  );
}
