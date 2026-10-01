import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import API from "../services/authService";
import "./ManagerReports.css";

/* Daily update to the CEO for HR, Business Development and Operations managers.
   Every role reports on DIFFERENT things, so each role has its own field set.
   (Finance and the Project Manager use their own daily update pages.) */

const num = (key, label) => ({ key, label, type: "number" });
const money = (key, label) => ({ key, label, type: "number", kind: "money" });
const text = (key, label) => ({ key, label, type: "text" });
const pick = (key, label, options) => ({ key, label, type: "select", options });

const ROLE_CONFIG = {
  hr_manager: {
    label: "HR Manager",
    sections: [
      { title: "Attendance", fields: [num("present", "Present today"), num("absent", "Absent"), num("on_leave", "On leave"), num("late", "Late arrivals"), num("wfh", "Working from home")] },
      { title: "Leaves & requests", fields: [num("leave_pending", "Leave requests pending"), num("leave_approved", "Leaves approved today"), num("travel_pending", "Travel requests pending")] },
      { title: "Recruitment", fields: [num("open_positions", "Open positions"), num("interviews", "Interviews held"), num("offers", "Offers released"), num("new_joiners", "New joiners"), num("exits", "Resignations / exits")] },
      { title: "Payroll & compliance", fields: [pick("payroll", "Payroll status", ["Not started", "In progress", "Processed"]), num("docs_pending", "Documents pending verification"), text("grievances", "Grievances / disciplinary notes")] },
    ],
  },
  bda: {
    label: "Business Development",
    sections: [
      { title: "Leads", fields: [num("new_leads", "New leads added"), num("qualified", "Leads qualified"), num("converted", "Leads converted"), num("lost", "Leads lost")] },
      { title: "Outreach", fields: [num("calls", "Calls made"), num("emails", "Emails sent"), num("meetings", "Meetings held"), num("proposals", "Proposals / quotes sent")] },
      { title: "Follow-ups", fields: [num("fu_done", "Follow-ups done"), num("fu_due", "Follow-ups due tomorrow"), num("fu_overdue", "Follow-ups overdue")] },
      { title: "Pipeline", fields: [money("pipeline", "Pipeline value"), text("top_opportunity", "Key opportunity today")] },
    ],
  },
  operations_manager: {
    label: "Operations Manager",
    sections: [
      { title: "Procurement", fields: [num("po_raised", "Purchase orders raised"), num("po_pending", "Purchase orders pending"), num("mr_pending", "Material requests pending"), text("vendor_issue", "Vendor issues")] },
      { title: "Inventory", fields: [num("low_stock", "Low-stock items"), num("stock_in", "Stock-in entries"), num("stock_out", "Stock-out entries")] },
      { title: "Logistics", fields: [num("deliv_expected", "Deliveries expected"), num("deliv_done", "Deliveries completed"), num("deliv_delayed", "Deliveries delayed")] },
      { title: "Team & administration", fields: [num("team_reviewed", "Team updates reviewed"), num("team_pending", "Team updates pending"), text("admin_issue", "Office / admin issues")] },
    ],
  },
};
const FALLBACK = { label: "Manager", sections: [] };

const STATUSES = [["on-track", "On track", "#10b981"], ["attention", "Needs attention", "#f59e0b"], ["critical", "Critical", "#ef4444"]];
const OTHER_TYPES = [["weekly", "Weekly"], ["monthly", "Monthly"], ["incident", "Incident"], ["other", "Other"]];
const REVIEW = { submitted: "Awaiting review", reviewed: "Reviewed", needs_changes: "Needs changes" };
const EMPTY_OTHER = { title: "", report_type: "weekly", period_label: "", summary: "", highlights: "", issues: "", next_steps: "" };
const EMPTY_COMMON = { summary: "", highlights: "", issues: "", next_steps: "" };

const todayLabel = () => new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const detailStatus = (d) => { try { const o = typeof d === "string" ? JSON.parse(d) : d; return o && o.status; } catch { return null; } };

export default function ManagerReports() {
  const { user } = useAuth();
  const cfg = ROLE_CONFIG[user?.role] || FALLBACK;

  const [tab, setTab] = useState("daily");
  const [values, setValues] = useState({});
  const [common, setCommon] = useState(EMPTY_COMMON);
  const [status, setStatus] = useState("on-track");
  const [other, setOther] = useState(EMPTY_OTHER);
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try { const { data } = await API.get("/manager-reports/mine"); setHistory(data); }
    catch { setError("Could not load your previous updates."); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const sentToday = useMemo(() => history.some((r) => r.report_type === "daily" && new Date(r.created_at).toDateString() === new Date().toDateString()), [history]);

  const setVal = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }));
  const setCom = (k) => (e) => setCommon((v) => ({ ...v, [k]: e.target.value }));
  const setOth = (k) => (e) => setOther((v) => ({ ...v, [k]: e.target.value }));

  const done = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000); load(); };

  const submitDaily = async (e) => {
    e.preventDefault();
    if (!common.summary.trim()) return setError("Please write a short summary of the day.");
    setSaving(true); setError(null);
    const fields = [];
    cfg.sections.forEach((s) => s.fields.forEach((f) => {
      const raw = values[f.key];
      if (raw === undefined || raw === "") return;
      fields.push({ section: s.title, label: f.label, value: f.type === "number" ? Number(raw) : raw, ...(f.kind ? { kind: f.kind } : {}) });
    }));
    try {
      await API.post("/manager-reports", {
        title: `Daily update — ${cfg.label} — ${todayLabel()}`, report_type: "daily", period_label: todayLabel(),
        ...common, details: { status, fields },
      });
      setValues({}); setCommon(EMPTY_COMMON); setStatus("on-track");
      done("Daily update sent to the CEO.");
    } catch (err) { setError(err.response?.data?.message || "Could not send the update."); }
    finally { setSaving(false); }
  };

  const submitOther = async (e) => {
    e.preventDefault();
    if (!other.title.trim() || !other.summary.trim()) return setError("Title and summary are required.");
    setSaving(true); setError(null);
    try { await API.post("/manager-reports", other); setOther(EMPTY_OTHER); done("Report sent to the CEO."); }
    catch (err) { setError(err.response?.data?.message || "Could not send the report."); }
    finally { setSaving(false); }
  };

  return (
    <div className="mdu-root">
      <div className="mdu-header">
        <div>
          <p className="mdu-eyebrow">{cfg.label}</p>
          <h1 className="mdu-title">Daily Update</h1>
          <p className="mdu-sub">Sent straight to the CEO. The fields below are specific to your role.</p>
        </div>
        <span className={`mdu-badge ${sentToday ? "mdu-badge--sent" : "mdu-badge--none"}`}>{sentToday ? "Today's update sent" : "Not sent today"}</span>
      </div>

      {toast && <div className="mdu-toast">{toast}</div>}
      {error && <div className="mdu-error">{error}</div>}

      <div className="mdu-tabs">
        <button type="button" className={`mdu-pill ${tab === "daily" ? "mdu-pill--active" : ""}`} onClick={() => setTab("daily")}>Daily update</button>
        <button type="button" className={`mdu-pill ${tab === "other" ? "mdu-pill--active" : ""}`} onClick={() => setTab("other")}>Other report</button>
      </div>

      {tab === "daily" ? (
        <form className="mdu-form" onSubmit={submitDaily}>
          {cfg.sections.map((s) => (
            <div className="mdu-section" key={s.title}>
              <h3 className="mdu-section-title">{s.title}</h3>
              <div className="mdu-grid">
                {s.fields.map((f) => (
                  <label className="mdu-field" key={f.key}>{f.label}{f.kind === "money" ? " (₹)" : ""}
                    {f.type === "select" ? (
                      <select value={values[f.key] ?? ""} onChange={setVal(f.key)}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
                    ) : (
                      <input type={f.type} min={f.type === "number" ? 0 : undefined} value={values[f.key] ?? ""} onChange={setVal(f.key)} />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="mdu-status-row">
            <span className="mdu-status-label">Overall status</span>
            <div className="mdu-status-options">
              {STATUSES.map(([k, l, c]) => (
                <button type="button" key={k} className={`mdu-pill ${status === k ? "mdu-pill--active" : ""}`} style={{ "--pill-color": c }} onClick={() => setStatus(k)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="mdu-section">
            <div className="mdu-grid two">
              <label className="mdu-field mdu-field--full">Summary of the day *<textarea value={common.summary} onChange={setCom("summary")} /></label>
              <label className="mdu-field">Highlights<textarea value={common.highlights} onChange={setCom("highlights")} /></label>
              <label className="mdu-field">Issues / risks<textarea value={common.issues} onChange={setCom("issues")} /></label>
              <label className="mdu-field mdu-field--full">Plan for tomorrow<textarea value={common.next_steps} onChange={setCom("next_steps")} /></label>
            </div>
          </div>
          <button className="mdu-submit" disabled={saving}>{saving ? "Sending…" : "Send to CEO"}</button>
        </form>
      ) : (
        <form className="mdu-form" onSubmit={submitOther}>
          <div className="mdu-grid two" style={{ marginBottom: 16 }}>
            <label className="mdu-field">Title *<input value={other.title} onChange={setOth("title")} placeholder="e.g. Weekly progress" /></label>
            <label className="mdu-field">Type<select value={other.report_type} onChange={setOth("report_type")}>{OTHER_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="mdu-field mdu-field--full">Period<input value={other.period_label} onChange={setOth("period_label")} placeholder="e.g. Week 39, Sep 2026" /></label>
            <label className="mdu-field mdu-field--full">Summary *<textarea value={other.summary} onChange={setOth("summary")} /></label>
            <label className="mdu-field">Highlights<textarea value={other.highlights} onChange={setOth("highlights")} /></label>
            <label className="mdu-field">Issues / risks<textarea value={other.issues} onChange={setOth("issues")} /></label>
            <label className="mdu-field mdu-field--full">Next steps<textarea value={other.next_steps} onChange={setOth("next_steps")} /></label>
          </div>
          <button className="mdu-submit" disabled={saving}>{saving ? "Sending…" : "Send to CEO"}</button>
        </form>
      )}

      <div className="mdu-history">
        <h2>My submissions</h2>
        {history.length === 0 ? <p className="mdu-empty">You haven't sent anything yet.</p> : (
          <table className="mdu-table">
            <thead><tr><th>Sent</th><th>Report</th><th>Status</th><th>CEO review</th></tr></thead>
            <tbody>
              {history.map((r) => {
                const st = detailStatus(r.details);
                return (
                  <tr key={r.id}>
                    <td>{fmt(r.created_at)}</td>
                    <td>{r.title}</td>
                    <td>{st ? <span className={`mdu-chip mdu-chip--${st}`}>{STATUSES.find((s) => s[0] === st)?.[1] || st}</span> : "—"}</td>
                    <td><span className={`mdu-chip mdu-chip--${r.status}`}>{REVIEW[r.status] || r.status}</span>
                      {r.ceo_comment && <span className="mdu-note">“{r.ceo_comment}”</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}