// CEO → Reports: every manager's daily update in one review inbox.
// Finance, Project Manager, Business Development, Operations Manager and HR
// all arrive through /api/ceo-reports (Finance is merged in by the backend).

import { useState, useEffect, useMemo, useCallback } from "react";
import { RefreshCw, Download, Search } from "lucide-react";
import { ceoReportService } from "../../services/ceoHubService";
import {
  REPORT_TYPES, STATUS_LABEL, formatValue,
} from "../../utils/dailyReportConfig";
import { initials, statusChip, fmtDate, Card, Empty, downloadCsv } from "./ceoShared";
import "./ceoHub.css";

const TABS = [
  { id: "all",     label: "All reports" },
  { id: "finance", label: "Finance" },
  { id: "pm",      label: "Projects" },
  { id: "bda",     label: "Business Development" },
  { id: "ops",     label: "Operations" },
  { id: "hr",      label: "HR" },
];

const STATUS_FILTERS = [
  { id: "all",      label: "All" },
  { id: "pending",  label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Sent back" },
];

const REVIEW_TEXT = { pending: "Pending", approved: "Approved", rejected: "Sent back" };
const REVIEW_CHIP = { pending: "ceo-chip--warn", approved: "ceo-chip--ok", rejected: "ceo-chip--bad" };

export default function Reports() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("30");
  const [q, setQ] = useState("");

  const [open, setOpen] = useState(null);       // report shown in the drawer
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3200);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ceoReportService.list();
      setRows(res.data.data || []);
    } catch (err) {
      console.error("Failed to load reports:", err);
      setError(err?.response?.data?.message || "Couldn't load reports. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* pending counts per tab (ignoring the other filters, like an inbox) */
  const pendingBy = useMemo(() => {
    const m = { all: 0 };
    rows.forEach((r) => {
      if (r.status !== "pending") return;
      m.all++;
      m[r.report_type] = (m[r.report_type] || 0) + 1;
    });
    return m;
  }, [rows]);

  const kpi = useMemo(() => ({
    pending: rows.filter((r) => r.status === "pending").length,
    approved: rows.filter((r) => r.status === "approved").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
    critical: rows.filter((r) => r.status === "pending" && r.overall_status === "critical").length,
  }), [rows]);

  const visible = useMemo(() => {
    const since = days === "all" ? null : new Date(Date.now() - Number(days) * 86400000);
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (tab !== "all" && r.report_type !== tab) return false;
      if (status !== "all" && r.status !== status) return false;
      if (since && new Date(r.report_date) < since) return false;
      if (needle && !`${r.submitted_by_name} ${r.project_name || ""} ${r.summary || ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [rows, tab, status, days, q]);

  const openReport = (r) => { setOpen(r); setNote(r.review_note || ""); };

  const decide = async (decision) => {
    if (!open) return;
    setBusy(true);
    try {
      await ceoReportService.review(open.source, open.id, decision, note.trim() || undefined);
      flash(decision === "approved" ? "Report approved" : "Report sent back to the manager");
      setOpen(null);
      await load();
    } catch (err) {
      flash(err?.response?.data?.message || "Couldn't save your decision", true);
    } finally {
      setBusy(false);
    }
  };

  const exportCsv = () => {
    downloadCsv(`manager-reports-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Date", "Team", "Submitted by", "Project", "Reported status", "Review", "Summary", "Review note"],
      ...visible.map((r) => [
        fmtDate(r.report_date), r.role_label, r.submitted_by_name, r.project_name || "",
        STATUS_LABEL[r.overall_status] || r.overall_status, REVIEW_TEXT[r.status] || r.status,
        r.summary || "", r.review_note || "",
      ]),
    ]);
  };

  const cfg = open ? REPORT_TYPES[open.report_type] : null;

  return (
    <div className="ceo-page">
      <div className="ceo-head">
        <div>
          <h1 className="ceo-title">Reports</h1>
          <p className="ceo-sub">Daily updates submitted to you by your managers.</p>
        </div>
        <div className="ceo-toolbar" style={{ margin: 0 }}>
          <button className="ceo-pill" onClick={load}><RefreshCw /> Refresh</button>
          <button className="ceo-pill" onClick={exportCsv} disabled={!visible.length}><Download /> Download data</button>
        </div>
      </div>

      <div className="ceo-grid ceo-grid--kpi">
        <Card><div className="ceo-kpi"><span className="ceo-kpi__label">Pending your review</span><span className="ceo-kpi__value">{kpi.pending}</span><span className="ceo-kpi__foot">Across all teams</span></div></Card>
        <Card><div className={`ceo-kpi${kpi.critical ? " is-alert" : ""}`}><span className="ceo-kpi__label">Critical and pending</span><span className="ceo-kpi__value">{kpi.critical}</span><span className="ceo-kpi__foot">Marked critical by the submitter</span></div></Card>
        <Card><div className="ceo-kpi"><span className="ceo-kpi__label">Approved</span><span className="ceo-kpi__value">{kpi.approved}</span><span className="ceo-kpi__foot">Reviewed and accepted</span></div></Card>
        <Card><div className="ceo-kpi"><span className="ceo-kpi__label">Sent back</span><span className="ceo-kpi__value">{kpi.rejected}</span><span className="ceo-kpi__foot">Waiting for a resubmission</span></div></Card>
      </div>

      <div className="ceo-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`ceo-tab${tab === t.id ? " is-active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
            {pendingBy[t.id] > 0 && <em>{pendingBy[t.id]}</em>}
          </button>
        ))}
      </div>

      <div className="ceo-toolbar">
        {STATUS_FILTERS.map((s) => (
          <button key={s.id} className={`ceo-pill${status === s.id ? " is-active" : ""}`} onClick={() => setStatus(s.id)}>{s.label}</button>
        ))}
        <select className="ceo-pill" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Date range">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="all">All time</option>
        </select>
        <span style={{ flex: 1 }} />
        <label className="ceo-search">
          <Search />
          <input placeholder="Search name, project or notes" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {error && <div className="ceo-card" style={{ marginBottom: 18, color: "var(--c-bad)" }}>{error}</div>}

      <Card>
        <div className="ceo-table-wrap" style={{ margin: "-20px -22px" }}>
          <table className="ceo-table">
            <thead>
              <tr>
                <th>Submitted by</th><th>Team</th><th>Date</th><th>Project</th>
                <th>Reported status</th><th>Key figure</th><th>Review</th><th />
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8}><Empty>Loading reports…</Empty></td></tr>}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={8}><Empty>{rows.length ? "No reports match these filters." : "No manager has submitted a daily update yet."}</Empty></td></tr>
              )}
              {!loading && visible.map((r) => {
                const first = REPORT_TYPES[r.report_type]?.fields.find((f) => f.kind !== "text");
                return (
                  <tr key={r.key} className="is-click" onClick={() => openReport(r)}>
                    <td>
                      <div className="ceo-cell-user">
                        <span className="cd-avatar">{initials(r.submitted_by_name)}</span>
                        <b>{r.submitted_by_name}</b>
                      </div>
                    </td>
                    <td>{r.role_label}</td>
                    <td>{fmtDate(r.report_date)}</td>
                    <td className="ceo-muted">{r.project_name || "—"}</td>
                    <td><span className={`ceo-chip ${statusChip(r.overall_status)}`}>{STATUS_LABEL[r.overall_status] || r.overall_status}</span></td>
                    <td>
                      {first ? <><span className="ceo-muted">{first.label}: </span><b>{formatValue(first.kind, r.payload?.[first.key])}</b></> : "—"}
                    </td>
                    <td><span className={`ceo-chip ${REVIEW_CHIP[r.status] || ""}`}>{REVIEW_TEXT[r.status] || r.status}</span></td>
                    <td><button className="ceo-btn ceo-btn--outline" onClick={(e) => { e.stopPropagation(); openReport(r); }}>{r.status === "pending" ? "Review" : "View"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {open && (
        <div className="crp-overlay" onClick={() => !busy && setOpen(null)}>
          <aside className="crp-drawer" role="dialog" aria-modal="true" aria-label="Report details" onClick={(e) => e.stopPropagation()}>
            <div className="crp-drawer__head">
              <div>
                <h3>{open.role_label} daily update</h3>
                <div className="ceo-muted">
                  {open.submitted_by_name} · {fmtDate(open.report_date)}{open.project_name ? ` · ${open.project_name}` : ""}
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={`ceo-chip ${statusChip(open.overall_status)}`}>{STATUS_LABEL[open.overall_status] || open.overall_status}</span>
                  <span className={`ceo-chip ${REVIEW_CHIP[open.status] || ""}`}>{REVIEW_TEXT[open.status] || open.status}</span>
                </div>
              </div>
              <button className="crp-close" onClick={() => setOpen(null)} aria-label="Close">✕</button>
            </div>

            <div className="crp-drawer__body">
              {cfg && (
                <dl className="crp-fields" style={{ margin: 0 }}>
                  {cfg.fields.map((f) => (
                    <div key={f.key} className={`crp-field${f.wide ? " crp-field--wide" : ""}`}>
                      <dt>{f.label}</dt>
                      <dd>{formatValue(f.kind, open.payload?.[f.key])}</dd>
                    </div>
                  ))}
                </dl>
              )}

              <div>
                <p className="crp-section-title">Manager's notes</p>
                <div className="crp-summary">{open.summary || "No notes were added."}</div>
              </div>

              <div>
                <p className="crp-section-title">Your note to {open.submitted_by_name?.split(" ")[0] || "the manager"} (optional)</p>
                <textarea className="crp-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add feedback or the reason you are sending it back" />
                {open.reviewed_at && (
                  <p className="crp-reviewed">Last reviewed by {open.reviewed_by_name || "you"} on {new Date(open.reviewed_at).toLocaleString("en-IN")}.</p>
                )}
              </div>
            </div>

            <div className="crp-drawer__foot">
              <button className="ceo-btn ceo-btn--danger" disabled={busy} onClick={() => decide("rejected")}>Send back</button>
              <button className="ceo-btn ceo-btn--ok" disabled={busy} onClick={() => decide("approved")}>{busy ? "Saving…" : "Approve"}</button>
            </div>
          </aside>
        </div>
      )}

      {toast && <div className={`ceo-toast${toast.isError ? " is-error" : ""}`} role="status">{toast.msg}</div>}
    </div>
  );
}