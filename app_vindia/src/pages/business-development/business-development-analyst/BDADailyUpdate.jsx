import { useState, useEffect, useCallback } from "react";
import bdaDailyUpdateService from "../../../services/bdaDailyUpdateService";
import "./BDADailyUpdate.css";

const EMPTY_STATS = {
  leads_added: 0, leads_qualified: 0, leads_converted: 0, leads_deleted: 0,
  followups_done: 0, followups_due_tomorrow: 0, followups_overdue: 0,
};

const EMPTY_FORM = {
  calls_made: "", emails_sent: "", meetings_held: "", proposals_sent: "",
  pipeline_value: "", key_opportunity: "",
  overall_status: "on-track",
  summary: "", highlights: "", issues: "", plan_tomorrow: "",
};

const STATUS_OPTIONS = [
  { value: "on-track", label: "On track" },
  { value: "attention", label: "Needs attention" },
  { value: "critical", label: "Critical" },
];

/* Read-only tile whose value comes from the system, not the BDA. */
const AutoStat = ({ label, value, tone }) => (
  <div className={`bdu-stat ${tone ? `bdu-stat--${tone}` : ""}`}>
    <span className="bdu-stat__label">{label}</span>
    <span className="bdu-stat__value">{value}</span>
    <span className="bdu-stat__tag">Auto</span>
  </div>
);

const NumField = ({ label, value, onChange }) => (
  <div className="bdu-field">
    <label>{label}</label>
    <input type="number" min="0" value={value} onChange={onChange} placeholder="0" />
  </div>
);

export default function BDADailyUpdate() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sentToday, setSentToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([
        bdaDailyUpdateService.getStats(),
        bdaDailyUpdateService.getToday(),
      ]);
      setStats({ ...EMPTY_STATS, ...s.data.data });
      const today = t.data.data;
      if (today) {
        setSentToday(true);
        setForm({
          calls_made: today.calls_made ?? "",
          emails_sent: today.emails_sent ?? "",
          meetings_held: today.meetings_held ?? "",
          proposals_sent: today.proposals_sent ?? "",
          pipeline_value: today.pipeline_value ?? "",
          key_opportunity: today.key_opportunity || "",
          overall_status: today.overall_status || "on-track",
          summary: today.summary || "",
          highlights: today.highlights || "",
          issues: today.issues || "",
          plan_tomorrow: today.plan_tomorrow || "",
        });
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't load your daily update.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep counts live while the page is open (e.g. after adding a lead in another tab)
  useEffect(() => {
    const id = setInterval(() => {
      bdaDailyUpdateService.getStats()
        .then((r) => setStats({ ...EMPTY_STATS, ...r.data.data }))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summary.trim()) {
      setError("Summary of the day is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Auto fields are NOT sent — the server recalculates them.
      await bdaDailyUpdateService.submit(form);
      setSentToday(true);
      setToast(sentToday ? "Update resent to the CEO." : "Daily update sent to the CEO.");
      load();
    } catch (err) {
      setError(err?.response?.data?.message || "Couldn't send your update.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="bdu-root"><p className="bdu-state">Loading…</p></div>;

  return (
    <div className="bdu-root">
      <header className="bdu-header">
        <div>
          <p className="bdu-eyebrow">Business Development</p>
          <h1 className="bdu-title">Daily Update</h1>
          <p className="bdu-sub">
            Sent straight to the CEO. Lead and follow-up numbers fill in
            automatically from your own activity.
          </p>
        </div>
        <span className={`bdu-pill ${sentToday ? "bdu-pill--ok" : "bdu-pill--warn"}`}>
          {sentToday ? "Sent today" : "Not sent today"}
        </span>
      </header>

      {error && <div className="bdu-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* ── 4 sections ───────────────────────────── */}
        <div className="bdu-grid">
          <section className="bdu-card">
            <h2>Leads</h2>
            <div className="bdu-stats">
              <AutoStat label="No. of leads" value={stats.leads_added} />
              <AutoStat label="Leads qualified" value={stats.leads_qualified} />
              <AutoStat label="Leads converted" value={stats.leads_converted} tone="ok" />
              <AutoStat label="Leads deleted" value={stats.leads_deleted} tone="bad" />
            </div>
          </section>

          <section className="bdu-card">
            <h2>Outreach</h2>
            <div className="bdu-fields">
              <NumField label="Calls made" value={form.calls_made} onChange={set("calls_made")} />
              <NumField label="Emails sent" value={form.emails_sent} onChange={set("emails_sent")} />
              <NumField label="Meetings held" value={form.meetings_held} onChange={set("meetings_held")} />
              <NumField label="Proposals / quotes sent" value={form.proposals_sent} onChange={set("proposals_sent")} />
            </div>
          </section>

          <section className="bdu-card">
            <h2>Follow-ups</h2>
            <div className="bdu-stats bdu-stats--3">
              <AutoStat label="Follow-ups done" value={stats.followups_done} tone="ok" />
              <AutoStat label="Due tomorrow" value={stats.followups_due_tomorrow} />
              <AutoStat label="Overdue" value={stats.followups_overdue} tone="bad" />
            </div>
          </section>

          <section className="bdu-card">
            <h2>Pipeline</h2>
            <div className="bdu-fields">
              <NumField label="Pipeline value (₹)" value={form.pipeline_value} onChange={set("pipeline_value")} />
              <div className="bdu-field">
                <label>Key opportunity today</label>
                <input type="text" value={form.key_opportunity} onChange={set("key_opportunity")} />
              </div>
            </div>
          </section>
        </div>

        {/* ── Status + notes ───────────────────────── */}
        <section className="bdu-card bdu-card--full">
          <label className="bdu-label">Overall status</label>
          <div className="bdu-status">
            {STATUS_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`bdu-chip bdu-chip--${o.value} ${form.overall_status === o.value ? "is-active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, overall_status: o.value }))}
              >
                {o.label}
              </button>
            ))}
          </div>

          <div className="bdu-field">
            <label>Summary of the day <span className="bdu-req">*</span></label>
            <textarea rows={4} value={form.summary} onChange={set("summary")} />
          </div>

          <div className="bdu-two">
            <div className="bdu-field">
              <label>Highlights</label>
              <textarea rows={4} value={form.highlights} onChange={set("highlights")} />
            </div>
            <div className="bdu-field">
              <label>Issues / risks</label>
              <textarea rows={4} value={form.issues} onChange={set("issues")} />
            </div>
          </div>

          <div className="bdu-field">
            <label>Plan for tomorrow</label>
            <textarea rows={3} value={form.plan_tomorrow} onChange={set("plan_tomorrow")} />
          </div>

          <button className="bdu-submit" type="submit" disabled={saving}>
            {saving ? "Sending…" : sentToday ? "Resend to CEO" : "Send to CEO"}
          </button>
        </section>
      </form>

      {toast && <div className="bdu-toast">{toast}</div>}
    </div>
  );
}