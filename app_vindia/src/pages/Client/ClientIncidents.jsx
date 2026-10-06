import { useState } from "react";
import { API } from "../../services/authService";
import {
  useClientAPI,
  getClientProjectId,
  assetUrl,
  PageLoader,
  PageError,
  fmtDate,
  fmtDateTime,
} from "../../hooks/Useclientapi.jsx";
import ClientModal from "./ClientModal";
import "../../styles/Client.css";

const STATUS_PILL = {
  Created: "pill--neutral",
  Assigned: "pill--info",
  "In Progress": "pill--info",
  Resolved: "pill--success",
  Closed: "pill--neutral",
};
const PRIORITY = {
  P1: ["Critical", "pill--danger"],
  P2: ["Normal", "pill--warning"],
  P3: ["Low", "pill--neutral"],
};
const EMPTY = { title: "", description: "", priority: "P2", deadline_at: "" };
const msg = (e, fallback) => e?.response?.data?.message || fallback;

function NewIncident({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.title.trim()) return setErr("Please enter a title.");
    setBusy(true);
    try {
      await API.post("/client/incidents", {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        deadline_at: form.deadline_at || undefined,
        project_id: getClientProjectId() || undefined,
      });
      onCreated();
    } catch (e2) {
      setErr(msg(e2, "Could not raise the incident."));
      setBusy(false);
    }
  };

  return (
    <ClientModal title="Raise an incident" onClose={onClose}>
      <form className="cl-form" onSubmit={submit}>
        {err && <div className="cl-alert cl-alert--error">{err}</div>}
        <label className="cl-field">
          <span>Title *</span>
          <input className="cl-input" value={form.title} onChange={set("title")} maxLength={200} placeholder="What happened?" autoFocus />
        </label>
        <label className="cl-field">
          <span>Details</span>
          <textarea className="cl-input" rows={4} value={form.description} onChange={set("description")} maxLength={4000} placeholder="Where, when and anything the team should know" />
        </label>
        <div className="cl-form__row">
          <label className="cl-field">
            <span>Priority</span>
            <select className="cl-input" value={form.priority} onChange={set("priority")}>
              <option value="P1">P1 · Critical</option>
              <option value="P2">P2 · Normal</option>
              <option value="P3">P3 · Low</option>
            </select>
          </label>
          <label className="cl-field">
            <span>Needs resolving by (optional)</span>
            <input type="date" className="cl-input" value={form.deadline_at} onChange={set("deadline_at")} />
          </label>
        </div>
        <div className="cl-form__actions">
          <button type="button" className="cl-btn cl-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="cl-btn cl-btn--primary" disabled={busy}>{busy ? "Sending…" : "Raise incident"}</button>
        </div>
        <p className="cl-muted-note">Your project team is notified as soon as you submit.</p>
      </form>
    </ClientModal>
  );
}

function IncidentDetail({ id, onClose }) {
  const { data, loading, error, refetch } = useClientAPI(`/client/incidents/${id}`);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await API.post(`/client/incidents/${id}/comments`, { body: text.trim(), project_id: getClientProjectId() || undefined });
      setText("");
      refetch();
    } catch (e) {
      setErr(msg(e, "Could not send your comment."));
    } finally {
      setBusy(false);
    }
  };

  const inc = data?.incident;
  return (
    <ClientModal title={inc ? `${inc.incident_no} · ${inc.title}` : "Incident"} onClose={onClose} wide>
      {loading && !data ? <p className="cl-muted-note">Loading…</p> : error ? <div className="cl-alert cl-alert--error">{error}</div> : inc && (
        <>
          <div className="cl-detail-meta">
            <span className={`pill ${STATUS_PILL[inc.status] || "pill--neutral"}`}>{inc.status}</span>
            <span className={`pill ${(PRIORITY[inc.priority] || PRIORITY.P2)[1]}`}>{(PRIORITY[inc.priority] || PRIORITY.P2)[0]}</span>
            <span>Raised {fmtDateTime(inc.created_at)}</span>
            {inc.deadline_at && <span>Needed by {fmtDate(inc.deadline_at)}</span>}
            {inc.assigned_to_name && <span>Assigned to {inc.assigned_to_name}</span>}
          </div>
          {inc.description && <p className="cl-detail-desc">{inc.description}</p>}

          {data.photos?.length > 0 && (
            <div className="cl-photo-strip">
              {data.photos.map((p) => (
                <a key={p.id} href={assetUrl(p.url)} target="_blank" rel="noreferrer">
                  <img src={assetUrl(p.url)} alt="Incident" loading="lazy" />
                </a>
              ))}
            </div>
          )}

          <div className="cl-thread">
            <div className="cl-thread__title">Conversation</div>
            {data.comments?.length ? data.comments.map((c) => (
              <div key={c.id} className="cl-thread__msg">
                <div className="cl-thread__who">{c.author_name || "Team"} <span>{fmtDateTime(c.created_at)}</span></div>
                <div>{c.body}</div>
              </div>
            )) : <p className="cl-muted-note">No messages yet.</p>}
          </div>

          {inc.status !== "Closed" ? (
            <div className="cl-reply">
              {err && <div className="cl-alert cl-alert--error">{err}</div>}
              <textarea className="cl-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Add a comment for the team…" />
              <button className="cl-btn cl-btn--primary" disabled={busy || !text.trim()} onClick={send}>{busy ? "Sending…" : "Send"}</button>
            </div>
          ) : <p className="cl-muted-note">This incident is closed.</p>}
        </>
      )}
    </ClientModal>
  );
}

export default function ClientIncidents() {
  const { data, loading, error, refetch } = useClientAPI("/client/incidents");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [notice, setNotice] = useState("");

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const incidents = data?.incidents || [];
  const filtered = incidents.filter((i) => {
    const q = search.toLowerCase();
    return (status === "all" || i.status === status) &&
      (`${i.incident_no} ${i.title}`.toLowerCase().includes(q));
  });
  const statuses = ["all", ...new Set(incidents.map((i) => i.status))];

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Support</div>
          <h1 className="cl-page-title">Incidents</h1>
          <p className="cl-page-sub">Issues you have raised with your project team</p>
        </div>
        <button className="cl-btn cl-btn--primary" onClick={() => setCreating(true)}>+ Raise incident</button>
      </div>

      {notice && <div className="cl-alert cl-alert--success">{notice}</div>}

      <div className="cl-toolbar">
        <input className="cl-search" placeholder="Search incidents…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="cl-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : s}</option>)}
        </select>
      </div>

      <div className="cl-card">
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr><th>No.</th><th>Title</th><th>Priority</th><th>Status</th><th>Raised</th><th>Assigned to</th><th /></tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((i) => {
                const [plabel, pcls] = PRIORITY[i.priority] || PRIORITY.P2;
                return (
                  <tr key={i.id}>
                    <td><span className="cl-mono">{i.incident_no}</span></td>
                    <td style={{ fontWeight: 600 }}>{i.title}</td>
                    <td><span className={`pill ${pcls}`}>{plabel}</span></td>
                    <td><span className={`pill ${STATUS_PILL[i.status] || "pill--neutral"}`}>{i.status}</span></td>
                    <td style={{ color: "var(--text-muted)" }}>{fmtDate(i.created_at)}</td>
                    <td>{i.assigned_to_name || "—"}</td>
                    <td><button className="cl-btn cl-btn--ghost" style={{ padding: "3px 12px", fontSize: 12 }} onClick={() => setOpenId(i.id)}>View</button></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={7}>
                  <div className="cl-empty">
                    <div className="cl-empty__icon">🛡️</div>
                    <p>{incidents.length ? "No incidents match your filter." : "You have not raised any incidents. Use “Raise incident” if something needs the team's attention."}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <NewIncident
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setNotice("Incident raised. Your project team has been notified."); refetch(); }}
        />
      )}
      {openId && <IncidentDetail id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
