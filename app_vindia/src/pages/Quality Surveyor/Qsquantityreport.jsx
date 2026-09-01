import React, { useState, useEffect, useCallback, useMemo } from "react";
import "./Qsquantityreport.css";

// ── ADDED: PendingMeasurements import ──
// Inline component to avoid extra file dependency issues.
// Displays submitted measurements waiting for QR creation.
import api from "../../services/api";

/* ─────────────────────────────────────────────────────────
   ADDED: Pending Measurements Section
   Shows measurements with status='submitted' and no linked QR.
   QS clicks "Create Quantity Report" → POST /api/quantity-report/create
───────────────────────────────────────────────────────── */
function PendingMeasurements({ onQrCreated, notify }) {
  const [measurements, setMeasurements] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [creatingId,   setCreatingId]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/site-measurements/pending");
      setMeasurements(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("PendingMeasurements:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = useCallback(async (m) => {
    setCreatingId(m.measurementId);
    try {
      await api.post("/quantity-report/create", {
        measurementId: m.measurementId,
      });
      // Remove from list immediately
      setMeasurements(prev => prev.filter(x => x.measurementId !== m.measurementId));
      notify("✅ Quantity Report created and sent to SE for approval.", "success");
      onQrCreated?.(); // refresh QR list in parent
    } catch (err) {
      notify(err?.response?.data?.error || "Failed to create Quantity Report.", "error");
    } finally {
      setCreatingId(null);
    }
  }, [notify, onQrCreated]);

  // Hide section entirely if nothing pending
  if (!loading && measurements.length === 0) return null;

  return (
    <div className="qr__pending-section">
      <div className="qr__pending-header">
        <div className="qr__pending-title-row">
          <span className="qr__pending-dot" />
          <h3 className="qr__pending-title">Pending Measurements</h3>
          {!loading && measurements.length > 0 && (
            <span className="qr__pending-count">{measurements.length}</span>
          )}
        </div>
        <button className="qr__pending-refresh" onClick={load}>↻ Refresh</button>
      </div>

      <div className="qr__pending-info">
        📐 These measurements were submitted by the Site Engineer and are waiting for you to generate a Quantity Report.
      </div>

      {loading ? (
        <div className="qr__pending-loading">Loading pending measurements…</div>
      ) : (
        <div className="qr__pending-cards">
          {measurements.map(m => (
            <div key={m.measurementId} className="qr__pending-card">
              <div className="qr__pending-card-info">
                <div className="qr__pending-card-top">
                  <span className="qr__pending-id">#{m.measurementId}</span>
                  <span className="qr__pending-status">Submitted</span>
                </div>
                <div className="qr__pending-project">{m.projectName}</div>
                <div className="qr__pending-meta">
                  {m.milestoneName && <span>🏗️ {m.milestoneName}</span>}
                  {m.submittedBy   && <span>👤 {m.submittedBy}</span>}
                  {(m.submittedDate || m.date) && <span>📅 {m.submittedDate || m.date}</span>}
                  {m.zone          && <span>📍 {m.zone}</span>}
                  {m.activity      && <span>⚙️ {m.activity}</span>}
                  <span>📦 {(m.items || []).length} item{(m.items || []).length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <button
                className="qr__pending-create-btn"
                disabled={creatingId === m.measurementId}
                onClick={() => handleCreate(m)}
              >
                {creatingId === m.measurementId ? "Creating…" : "📑 Create Quantity Report"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   EXISTING COMPONENT — unchanged except:
   1. PendingMeasurements rendered above the report list
   2. fetchReports passed as onQrCreated callback
───────────────────────────────────────────────────────── */
const API_BASE = "/api/quantity-report";

const safeArr = (v) => {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  return [];
};

const fmtDate = (s) => s
  ? new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

const STATUS = {
  pending_se: { label: "Awaiting SE Approval", color: "blue",   icon: "⏳" },
  approved:   { label: "Approved by SE",        color: "green",  icon: "✅" },
  rejected:   { label: "Changes Requested",     color: "red",    icon: "↩️" },
  obsolete:   { label: "Obsolete",              color: "gray",   icon: "🗄️" },
};

export default function Qsquantityreport() {
  const [reports,       setReports]      = useState([]);
  const [loading,       setLoading]      = useState(true);
  const [toast,         setToast]        = useState(null);
  const [filterProject, setFilterProj]   = useState("");
  const [filterStatus,  setFilterSt]     = useState("");
  const [projects,      setProjects]     = useState([]);
  const [viewing,       setViewing]      = useState(null);

  // ── Toast helper (passed down to PendingMeasurements) ──
  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Fetch QRs ──
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.append("projectId", filterProject);
      if (filterStatus)  params.append("status",    filterStatus);
      const res  = await api.get(`/quantity-report?${params.toString()}`);
      const data = Array.isArray(res?.data) ? res.data : [];
      setReports(data);
      // Extract unique projects for filter dropdown
      const seen = new Set();
      const projs = [];
      data.forEach(r => {
        if (r.projectId && !seen.has(r.projectId)) {
          seen.add(r.projectId);
          projs.push({ id: r.projectId, name: r.projectName });
        }
      });
      setProjects(projs);
    } catch (err) {
      notify("Failed to load Quantity Reports.", "error");
    } finally {
      setLoading(false);
    }
  }, [filterProject, filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const filtered = useMemo(() => {
    return reports.filter(r => {
      if (filterProject && String(r.projectId) !== String(filterProject)) return false;
      if (filterStatus  && r.status !== filterStatus)                       return false;
      return true;
    });
  }, [reports, filterProject, filterStatus]);

  const st = (status) => STATUS[status] || { label: status, color: "gray", icon: "📑" };

  return (
    <div className="qr-page">

      {/* Toast */}
      {toast && (
        <div className={`qr__toast qr__toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* Page header */}
      <div className="qr__page-header">
        <div>
          <div className="qr__eyebrow">Quantity Surveyor</div>
          <h1 className="qr__title">Quantity Reports</h1>
          <p className="qr__sub">Review SE measurements · Generate and manage quantity reports</p>
        </div>
        <div className="qr__header-pills">
          <span className="qr__pill qr__pill--muted">{reports.length} reports</span>
          {reports.filter(r => r.status === "pending_se").length > 0 && (
            <span className="qr__pill qr__pill--amber">
              ⏳ {reports.filter(r => r.status === "pending_se").length} awaiting SE
            </span>
          )}
        </div>
      </div>

      {/* ── ADDED: Pending Measurements section ── */}
      {/* Rendered above the QR list. Hidden automatically when no pending measurements. */}
      <PendingMeasurements
        onQrCreated={fetchReports}
        notify={notify}
      />

      {/* Divider — only shown if pending section was visible */}
      <div className="qr__section-divider" />

      {/* Filters */}
      <div className="qr__filters">
        <h3 className="qr__section-title">All Quantity Reports</h3>
        <div className="qr__filter-row">
          <select
            className="qr__select"
            value={filterProject}
            onChange={e => setFilterProj(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            className="qr__select"
            value={filterStatus}
            onChange={e => setFilterSt(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button className="qr__refresh-btn" onClick={fetchReports}>↻ Refresh</button>
        </div>
      </div>

      {/* QR list */}
      {loading ? (
        <div className="qr__loading">
          <div className="qr__spinner" />Loading reports…
        </div>
      ) : filtered.length === 0 ? (
        <div className="qr__empty">
          <div className="qr__empty-icon">📑</div>
          <div className="qr__empty-title">No Quantity Reports yet</div>
          <div className="qr__empty-sub">
            Submit site measurements above and click "Create Quantity Report" to get started.
          </div>
        </div>
      ) : (
        <div className="qr__cards">
          {filtered.map(r => {
            const s     = st(r.status);
            const items = safeArr(r.items);
            return (
              <div
                key={r.id}
                className={`qr__card qr__card--${s.color}`}
                onClick={() => setViewing(r)}
              >
                <div className="qr__card-top">
                  <div className="qr__card-left">
                    <div className="qr__card-meta-row">
                      <span className="qr__card-id">QR #{r.id}</span>
                      <span className={`qr__badge qr__badge--${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <div className="qr__card-project">{r.projectName}</div>
                    <div className="qr__card-meta">
                      {r.milestoneName && <span>🏗️ {r.milestoneName}</span>}
                      {r.zone          && <span>📍 {r.zone}</span>}
                      {r.activity      && <span>⚙️ {r.activity}</span>}
                      <span>📦 {items.length} item{items.length !== 1 ? "s" : ""}</span>
                      <span>📅 {fmtDate(r.createdDate || r.created_at)}</span>
                    </div>
                    {r.seComment && (
                      <div className="qr__card-comment">
                        💬 SE: {r.seComment}
                      </div>
                    )}
                  </div>
                  <div className="qr__card-arrow">›</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Detail modal */}
      {viewing && (
        <div className="qr__modal-overlay" onClick={() => setViewing(null)}>
          <div className="qr__modal" onClick={e => e.stopPropagation()}>
            <div className="qr__modal-header">
              <div>
                <div className="qr__modal-id">QR #{viewing.id}</div>
                <div className="qr__modal-project">{viewing.projectName} · {viewing.milestoneName}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className={`qr__badge qr__badge--${st(viewing.status).color}`}>
                  {st(viewing.status).icon} {st(viewing.status).label}
                </span>
                <button className="qr__modal-close" onClick={() => setViewing(null)}>✕</button>
              </div>
            </div>

            <div className="qr__modal-body">
              {/* Metadata */}
              <div className="qr__modal-meta-grid">
                {[
                  ["BOQ #",        viewing.boqId           || "—"],
                  ["Measurement #", viewing.measurementId   || "—"],
                  ["Submitted by",  viewing.submittedBy     || "—"],
                  ["Zone",          viewing.zone            || "—"],
                  ["Activity",      viewing.activity        || "—"],
                  ["Measured date", viewing.measurementDate ? fmtDate(viewing.measurementDate) : "—"],
                  ["Created",       fmtDate(viewing.createdDate || viewing.created_at)],
                ].map(([l, v]) => (
                  <div key={l} className="qr__modal-meta-item">
                    <span className="qr__modal-meta-label">{l}</span>
                    <span className="qr__modal-meta-val">{v}</span>
                  </div>
                ))}
              </div>

              {/* SE comment */}
              {viewing.seComment && (
                <div className="qr__modal-comment">
                  <strong>💬 SE Comment:</strong> {viewing.seComment}
                </div>
              )}

              {/* Items table */}
              <div className="qr__modal-section-title">Quantity Comparison</div>
              <table className="qr__modal-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Material</th>
                    <th>Unit</th>
                    <th>BOQ Qty</th>
                    <th>Actual Qty</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {safeArr(viewing.items).map((it, i) => {
                    const boqQ    = parseFloat(it.boqQuantity) || 0;
                    const actQ    = parseFloat(it.quantity)    || 0;
                    const pct     = boqQ ? Math.round(((actQ - boqQ) / boqQ) * 100) : null;
                    const varCls  = pct === null ? "" : Math.abs(pct) <= 5 ? "var--ok" : Math.abs(pct) <= 15 ? "var--warn" : "var--danger";
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{it.material}</strong></td>
                        <td>{it.unit}</td>
                        <td>{boqQ ? boqQ.toLocaleString("en-IN") : "—"}</td>
                        <td>{actQ.toLocaleString("en-IN")}</td>
                        <td>
                          {pct !== null ? (
                            <span className={`qr__var ${varCls}`}>
                              {pct > 0 ? "+" : ""}{pct}%
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="qr__modal-footer">
              <button className="qr__modal-close-btn" onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}