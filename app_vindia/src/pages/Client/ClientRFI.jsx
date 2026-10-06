import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

const ROLE_LABEL = {
  project_coordinator: "Project Coordinator",
  architect: "Architect",
  site_engineer: "Site Engineer",
  project_manager: "Project Manager",
  client: "Client",
};
const roleLabel = (r) => ROLE_LABEL[String(r || "").toLowerCase()] || String(r || "—").replace(/_/g, " ");
const STATUS = { open: ["Open", "pill--warning"], responded: ["Responded", "pill--info"], closed: ["Closed", "pill--neutral"] };
const statusOf = (s) => STATUS[String(s || "").toLowerCase()] || [String(s || "—"), "pill--neutral"];
const PRIORITY = { low: "pill--neutral", medium: "pill--info", high: "pill--warning", critical: "pill--danger" };
const EMPTY = { subject: "", description: "", priority: "medium", assigned_to_role: "project_coordinator", drawing_ref: "", zone: "", response_required_by: "" };
const msg = (e, fallback) => e?.response?.data?.message || fallback;

function NewRfi({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.subject.trim()) return setErr("Please enter a subject.");
    setBusy(true);
    try {
      await API.post("/client/rfi", {
        ...form,
        subject: form.subject.trim(),
        description: form.description.trim(),
        response_required_by: form.response_required_by || undefined,
        project_id: getClientProjectId() || undefined,
      });
      onCreated();
    } catch (e2) {
      setErr(msg(e2, "Could not submit the RFI."));
      setBusy(false);
    }
  };

  return (
    <ClientModal title="Raise a Request for Information" onClose={onClose}>
      <form className="cl-form" onSubmit={submit}>
        {err && <div className="cl-alert cl-alert--error">{err}</div>}
        <label className="cl-field">
          <span>Subject *</span>
          <input className="cl-input" value={form.subject} onChange={set("subject")} maxLength={255} placeholder="What do you need clarified?" autoFocus />
        </label>
        <label className="cl-field">
          <span>Details</span>
          <textarea className="cl-input" rows={4} value={form.description} onChange={set("description")} maxLength={4000} />
        </label>
        <div className="cl-form__row">
          <label className="cl-field">
            <span>Address to</span>
            <select className="cl-input" value={form.assigned_to_role} onChange={set("assigned_to_role")}>
              {["project_coordinator", "architect", "site_engineer", "project_manager"].map((r) => (
                <option key={r} value={r}>{roleLabel(r)}</option>
              ))}
            </select>
          </label>
          <label className="cl-field">
            <span>Priority</span>
            <select className="cl-input" value={form.priority} onChange={set("priority")}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
        </div>
        <div className="cl-form__row">
          <label className="cl-field"><span>Drawing reference</span><input className="cl-input" value={form.drawing_ref} onChange={set("drawing_ref")} /></label>
          <label className="cl-field"><span>Zone / area</span><input className="cl-input" value={form.zone} onChange={set("zone")} /></label>
        </div>
        <label className="cl-field">
          <span>Response needed by (optional)</span>
          <input type="date" className="cl-input" value={form.response_required_by} onChange={set("response_required_by")} />
        </label>
        <div className="cl-form__actions">
          <button type="button" className="cl-btn cl-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="cl-btn cl-btn--primary" disabled={busy}>{busy ? "Sending…" : "Submit RFI"}</button>
        </div>
        <p className="cl-muted-note">The person you address is notified straight away.</p>
      </form>
    </ClientModal>
  );
}

function RfiDetail({ id, onClose }) {
  const { data, loading, error, refetch } = useClientAPI(`/client/rfi/${id}`);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await API.post(`/client/rfi/${id}/respond`, { message: text.trim(), project_id: getClientProjectId() || undefined });
      setText("");
      refetch();
    } catch (e) {
      setErr(msg(e, "Could not send your reply."));
    } finally {
      setBusy(false);
    }
  };

  const r = data?.rfi;
  const [slabel, scls] = statusOf(r?.status);
  return (
    <ClientModal title={r ? `${r.rfi_code} · ${r.subject}` : "RFI"} onClose={onClose} wide>
      {loading && !data ? <p className="cl-muted-note">Loading…</p> : error ? <div className="cl-alert cl-alert--error">{error}</div> : r && (
        <>
          <div className="cl-detail-meta">
            <span className={`pill ${scls}`}>{slabel}</span>
            <span className={`pill ${PRIORITY[String(r.priority).toLowerCase()] || "pill--neutral"}`}>{r.priority}</span>
            <span>Raised by {r.raised_by_name || roleLabel(r.raised_by_role)} · {fmtDateTime(r.created_at)}</span>
            <span>To {roleLabel(r.assigned_to_role)}</span>
            {r.response_required_by && <span>Needed by {fmtDate(r.response_required_by)}</span>}
            {r.drawing_ref && <span>Drawing {r.drawing_ref}</span>}
            {r.zone && <span>Zone {r.zone}</span>}
          </div>
          {r.description && <p className="cl-detail-desc">{r.description}</p>}

          <div className="cl-thread">
            <div className="cl-thread__title">Responses</div>
            {data.responses?.length ? data.responses.map((x) => (
              <div key={x.id} className="cl-thread__msg">
                <div className="cl-thread__who">{x.responder_name} <em>{roleLabel(x.responder_role)}</em> <span>{fmtDateTime(x.created_at)}</span></div>
                <div>{x.message}</div>
                {x.file_url && <a className="sf-download-btn" style={{ fontSize: 11, marginTop: 6, display: "inline-block" }} href={assetUrl(x.file_url)} target="_blank" rel="noreferrer">📎 {x.file_name || "Attachment"}</a>}
              </div>
            )) : <p className="cl-muted-note">No responses yet. You will be notified when the team replies.</p>}
          </div>

          {String(r.status).toLowerCase() !== "closed" ? (
            <div className="cl-reply">
              {err && <div className="cl-alert cl-alert--error">{err}</div>}
              <textarea className="cl-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Reply to this RFI…" />
              <button className="cl-btn cl-btn--primary" disabled={busy || !text.trim()} onClick={send}>{busy ? "Sending…" : "Reply"}</button>
            </div>
          ) : <p className="cl-muted-note">This RFI is closed.</p>}
        </>
      )}
    </ClientModal>
  );
}

export default function ClientRFI() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useClientAPI("/client/rfi");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");

  if (loading && !data) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const rfis = data?.rfis || [];
  const filtered = rfis.filter((r) => {
    const q = search.toLowerCase();
    return (status === "all" || String(r.status).toLowerCase() === status) &&
      `${r.rfi_code} ${r.subject}`.toLowerCase().includes(q);
  });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Support</div>
          <h1 className="cl-page-title">Requests for Information</h1>
          <p className="cl-page-sub">Questions you have raised, and questions the team has sent to you</p>
        </div>
        <button className="cl-btn cl-btn--primary" onClick={() => setCreating(true)}>+ Raise RFI</button>
      </div>

      {notice && <div className="cl-alert cl-alert--success">{notice}</div>}

      <div className="cl-toolbar">
        <input className="cl-search" placeholder="Search RFIs…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="cl-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="open">Open</option>
          <option value="responded">Responded</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="cl-card">
        <div className="cl-table-wrap">
          <table className="cl-table">
            <thead>
              <tr><th>RFI</th><th>Subject</th><th>Priority</th><th>To</th><th>Status</th><th>Raised</th><th>Replies</th><th /></tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((r) => {
                const [slabel, scls] = statusOf(r.status);
                return (
                  <tr key={r.id}>
                    <td><span className="cl-mono">{r.rfi_code}</span></td>
                    <td style={{ fontWeight: 600 }}>{r.subject}</td>
                    <td><span className={`pill ${PRIORITY[String(r.priority).toLowerCase()] || "pill--neutral"}`}>{r.priority}</span></td>
                    <td>{roleLabel(r.assigned_to_role)}</td>
                    <td><span className={`pill ${scls}`}>{slabel}</span></td>
                    <td style={{ color: "var(--text-muted)" }}>{fmtDate(r.created_at)}</td>
                    <td>{r.response_count}</td>
                    <td><button className="cl-btn cl-btn--ghost" style={{ padding: "3px 12px", fontSize: 12 }} onClick={() => navigate(`/client/rfi/${r.id}`)}>View</button></td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={8}>
                  <div className="cl-empty">
                    <div className="cl-empty__icon">❓</div>
                    <p>{rfis.length ? "No RFIs match your filter." : "No RFIs yet. Raise one when you need information or a decision from the team."}</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {creating && (
        <NewRfi
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); setNotice("RFI submitted. The team has been notified."); refetch(); }}
        />
      )}
      {id && <RfiDetail id={id} onClose={() => { navigate("/client/rfi"); refetch(); }} />}
    </div>
  );
}
