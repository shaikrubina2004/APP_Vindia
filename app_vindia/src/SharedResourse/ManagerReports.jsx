import { useEffect, useState } from "react";
import API from "../services/authService";
import "../styles/portalPages.css";

const TYPES = [
  { v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" },
  { v: "monthly", l: "Monthly" }, { v: "incident", l: "Incident" },
  { v: "other", l: "Other" },
];
const STATUS_LABEL = { submitted: "Submitted", reviewed: "Reviewed", needs_changes: "Needs changes" };
const EMPTY = { title: "", report_type: "weekly", period_label: "", summary: "", highlights: "", issues: "", next_steps: "" };

const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

export default function ManagerReports() {
  const [form, setForm] = useState(EMPTY);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    try {
      const { data } = await API.get("/manager-reports/mine");
      setReports(data);
    } catch {
      setMsg({ t: "err", m: "Could not load your previous reports." });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title.trim() || !form.summary.trim()) {
      setMsg({ t: "err", m: "Title and summary are required." });
      return;
    }
    setSaving(true); setMsg(null);
    try {
      await API.post("/manager-reports", form);
      setForm(EMPTY);
      setMsg({ t: "ok", m: "Report sent to the CEO." });
      load();
    } catch (err) {
      setMsg({ t: "err", m: err.response?.data?.message || "Failed to submit report." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pp-page">
      <div className="pp-head">
        <h1>Report to CEO</h1>
        <p>Send a report to the CEO and track whether it has been reviewed.</p>
      </div>

      <div className="pp-card">
        <h3>New report</h3>
        <div className="pp-sub">Fields marked * are required.</div>
        <div className="pp-grid two">
          <div className="pp-field"><label>Title *</label>
            <input value={form.title} onChange={set("title")} placeholder="e.g. Weekly site progress" /></div>
          <div className="pp-field"><label>Type</label>
            <select value={form.report_type} onChange={set("report_type")}>
              {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select></div>
        </div>
        <div className="pp-field"><label>Period</label>
          <input value={form.period_label} onChange={set("period_label")} placeholder="e.g. Week 39, Sep 2026" /></div>
        <div className="pp-field"><label>Summary *</label>
          <textarea value={form.summary} onChange={set("summary")} /></div>
        <div className="pp-grid two">
          <div className="pp-field"><label>Highlights</label>
            <textarea value={form.highlights} onChange={set("highlights")} /></div>
          <div className="pp-field"><label>Issues / risks</label>
            <textarea value={form.issues} onChange={set("issues")} /></div>
        </div>
        <div className="pp-field"><label>Next steps</label>
          <textarea value={form.next_steps} onChange={set("next_steps")} /></div>
        <button className="pp-btn" onClick={submit} disabled={saving}>
          {saving ? "Sending…" : "Send to CEO"}
        </button>
        {msg && <div className={`pp-msg ${msg.t}`}>{msg.m}</div>}
      </div>

      <div className="pp-card">
        <h3>My reports</h3>
        <div className="pp-sub">Most recent first.</div>
        {loading ? <div className="pp-empty">Loading…</div>
          : reports.length === 0 ? <div className="pp-empty">You haven't sent any reports yet.</div>
          : reports.map((r) => (
            <div className="pp-row" key={r.id}>
              <div className="pp-row-top">
                <div>
                  <h4>{r.title}</h4>
                  <div className="pp-meta">{r.report_type}{r.period_label ? ` · ${r.period_label}` : ""} · sent {fmt(r.created_at)}</div>
                </div>
                <span className={`pp-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
              </div>
              <div className="pp-body">{r.summary}</div>
              {r.ceo_comment && (
                <div className="pp-comment"><b>CEO comment:</b> {r.ceo_comment}</div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}