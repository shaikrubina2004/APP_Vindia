import { useState, useRef } from "react";
import "../../styles/MEPEngineer.css";

const CHECKS = [
  {
    label: "MEP coordination with Architect confirmed",
    sub: "Design compatibility verified for today's scope",
  },
  {
    label: "Structural coordination reviewed",
    sub: "No new clashes identified or incidents raised",
  },
  {
    label: "Latest drawing version used on site",
    sub: "Verified team is working on current revision",
  },
  {
    label: "Incident queue reviewed",
    sub: "All open incidents acknowledged and actioned",
  },
  {
    label: "Site photos uploaded",
    sub: "Photographic evidence attached to this log",
  },
];

function getPastLogs() {
  const data = [
    {
      disc: "Plumbing",
      tags: [
        { cls: "badge-mep-p", label: "Plumbing" },
        { cls: "badge-mep-m", label: "Mechanical" },
      ],
      meta: "Workers: 14 · 80m PVC pipe · No blockers",
      title: "Drainage installation completed — Level 2 East Wing",
    },
    {
      disc: "Electrical",
      tags: [{ cls: "badge-mep-e", label: "Electrical" }],
      meta: "Workers: 10 · Incident raised #INC-038",
      title: "Electrical conduit routing — Ground Floor",
    },
    {
      disc: "Mechanical",
      tags: [{ cls: "badge-mep-m", label: "Mechanical" }],
      meta: "Workers: 18 · 4 AHU units",
      title: "HVAC duct installation — Level 3",
    },
  ];
  return data.map((d, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (i + 1));
    return {
      ...d,
      day: date.getDate(),
      mon: date.toLocaleString("en", { month: "short" }).toUpperCase(),
    };
  });
}

export default function MEPDailyLog() {
  const today = new Date().toISOString().split("T")[0];
  const [checked, setChecked] = useState({});
  const [showToast, setShowToast] = useState(false);
  const [photos, setPhotos] = useState([]);
  const fileRef = useRef(null);
  const pastLogs = getPastLogs();

  const toggle = (i) => setChecked((p) => ({ ...p, [i]: !p[i] }));

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

  const submit = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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
      <div className="alert alert-amber">
        <span className="alert-icon">⏰</span>
        <span>
          <strong>Reminder:</strong> Today's daily log has not been submitted
          yet. Log must be posted before end of day (6:00 PM).
        </span>
      </div>

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
              <label>
                Project <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select className="edit-form-input">
                <option value="">Select project</option>
                <option>Vindia Tower — Block A</option>
                <option>Greenfield Mall — Phase 2</option>
                <option>Metro Station — Sector 14</option>
              </select>
            </div>
            <div className="edit-form-group">
              <label>
                Date <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="date"
                className="edit-form-input"
                defaultValue={today}
              />
            </div>
            <div className="edit-form-group">
              <label>Shift</label>
              <select className="edit-form-input">
                <option>Day Shift (6AM–6PM)</option>
                <option>Night Shift (6PM–6AM)</option>
              </select>
            </div>
            <div className="edit-form-group">
              <label>
                Work Zone <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select className="edit-form-input">
                <option value="">Select zone</option>
                {[
                  "Basement",
                  "Ground Floor",
                  "Level 1",
                  "Level 2",
                  "Level 3",
                  "Rooftop",
                ].map((z) => (
                  <option key={z}>{z}</option>
                ))}
              </select>
            </div>
            <div className="edit-form-group">
              <label>
                Discipline <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <select className="edit-form-input">
                <option value="">Select</option>
                {[
                  "Mechanical (HVAC)",
                  "Electrical",
                  "Plumbing",
                  "All Disciplines",
                ].map((d) => (
                  <option key={d}>{d}</option>
                ))}
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
              />
            </div>
            <div className="edit-form-group">
              <label>Materials Used</label>
              <input
                type="text"
                className="edit-form-input"
                placeholder="e.g. 50m HDPE pipe, 4 AHU units"
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
            />
          </div>
          <div className="edit-form-group" style={{ marginTop: 12 }}>
            <label>Issues / Blockers</label>
            <textarea
              className="edit-form-input"
              style={{ minHeight: 64, resize: "vertical" }}
              placeholder="Any issues, delays, or blockers encountered today..."
            />
          </div>
          <div className="edit-form-group" style={{ marginTop: 12 }}>
            <label>Plan for Tomorrow</label>
            <textarea
              className="edit-form-input"
              style={{ minHeight: 64, resize: "vertical" }}
              placeholder="Next day MEP activities planned..."
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
            {CHECKS.map((c, i) => (
              <div
                key={i}
                className={`check-item${checked[i] ? " checked" : ""}`}
                onClick={() => toggle(i)}
              >
                <div className="check-box">{checked[i] ? "✓" : ""}</div>
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
          <button className="btn-outline">Save Draft</button>
          <button className="btn-primary" onClick={submit}>
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
            {pastLogs.map((log, i) => (
              <div
                key={i}
                className="record-row bl-blue"
                style={{
                  borderRadius: i === 0 ? "0 0 0 0" : "0",
                  borderBottom:
                    i < pastLogs.length - 1
                      ? "1px solid var(--border-color)"
                      : "none",
                  borderLeft: "3px solid var(--primary-blue)",
                }}
              >
                {/* Date */}
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
                    {log.day}
                  </span>
                  <span
                    style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1 }}
                  >
                    {log.mon}
                  </span>
                </div>

                <div className="row-main" style={{ flex: 1, minWidth: 0 }}>
                  <span className="row-name">{log.title}</span>
                  <span className="row-sub">{log.meta}</span>
                </div>

                <div className="row-divider" />

                {/* Tags */}
                <div
                  style={{
                    display: "flex",
                    gap: 5,
                    flexWrap: "wrap",
                    flexShrink: 0,
                  }}
                >
                  {log.tags.map((t) => (
                    <span key={t.label} className={`badge ${t.cls}`}>
                      {t.label}
                    </span>
                  ))}
                </div>

                <div className="row-spacer" />
                <span className="status-pill pill-submitted">Submitted</span>
              </div>
            ))}
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
