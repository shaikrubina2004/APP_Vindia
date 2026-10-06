import { useCallback, useEffect, useState } from "react";
import { API } from "../../../services/authService";
import { useProject } from "../../../context/ProjectContext";
import "../../../styles/ProjectApprovals.css";

const STATUSES = ["pending", "approved", "upcoming", "rejected"];
const CATEGORIES = ["statutory", "environmental", "fire", "structural", "electrical", "occupancy", "other"];
const EMPTY = {
  title: "", category: "statutory", issued_by: "", reference_no: "", status: "pending",
  issued_date: "", valid_until: "", validity_note: "", description: "", document_url: "",
  visible_to_client: true,
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const msg = (e, fb) => e?.response?.data?.message || fb;

/**
 * Approvals & clearances for the active project (BBMP sanction, Fire NOC, OC ...).
 * Whatever is marked "Visible to client" appears on the client's Approvals page, and the
 * client is notified when a record is added or its status changes.
 */
export default function ProjectApprovals() {
  const { activeProject } = useProject() || {};
  const projectId = activeProject?.id;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/project-approvals/project/${projectId}`);
      setRows(res.data.approvals || []);
    } catch (e) {
      setError(msg(e, "Could not load approvals."));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    setEditingId(null);
    setForm(EMPTY);
    load();
  }, [load]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const edit = (r) => {
    setEditingId(r.id);
    setNotice("");
    setForm({
      title: r.title || "", category: r.category || "statutory", issued_by: r.issued_by || "",
      reference_no: r.reference_no || "", status: r.status, issued_date: r.issued_date || "",
      valid_until: r.valid_until || "", validity_note: r.validity_note || "",
      description: r.description || "", document_url: r.document_url || "",
      visible_to_client: !!r.visible_to_client,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reset = () => {
    setEditingId(null);
    setForm(EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.title.trim()) return setError("Title is required.");
    setSaving(true);
    try {
      if (editingId) await API.put(`/project-approvals/${editingId}`, form);
      else await API.post(`/project-approvals/project/${projectId}`, form);
      setNotice(editingId ? "Approval updated." : "Approval added.");
      reset();
      await load();
    } catch (err) {
      setError(msg(err, "Could not save the approval."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete "${r.title}"? The client will no longer see it.`)) return;
    setError("");
    try {
      await API.delete(`/project-approvals/${r.id}`);
      if (editingId === r.id) reset();
      await load();
    } catch (err) {
      setError(msg(err, "Could not delete the approval."));
    }
  };

  if (!projectId) {
    return (
      <div className="pa-page">
        <div className="pa-empty">Select a project from the top bar to manage its approvals.</div>
      </div>
    );
  }

  return (
    <div className="pa-page">
      <div className="pa-header">
        <div>
          <h1>Approvals &amp; clearances</h1>
          <p>{activeProject.name} · records marked “Visible to client” appear on the client's Approvals page.</p>
        </div>
      </div>

      {error && <div className="pa-alert pa-alert--error">{error}</div>}
      {notice && <div className="pa-alert pa-alert--ok">{notice}</div>}

      <form className="pa-card pa-form" onSubmit={save}>
        <h2>{editingId ? "Edit approval" : "Add approval"}</h2>
        <div className="pa-grid">
          <label className="pa-wide"><span>Title *</span>
            <input value={form.title} onChange={set("title")} maxLength={255} placeholder="e.g. Fire NOC" /></label>
          <label><span>Category</span>
            <select value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select></label>
          <label><span>Status</span>
            <select value={form.status} onChange={set("status")}>
              {STATUSES.map((c) => <option key={c} value={c}>{cap(c)}</option>)}
            </select></label>
          <label><span>Issuing authority</span>
            <input value={form.issued_by} onChange={set("issued_by")} maxLength={255} /></label>
          <label><span>Reference no.</span>
            <input value={form.reference_no} onChange={set("reference_no")} maxLength={120} /></label>
          <label><span>Issued on</span>
            <input type="date" value={form.issued_date} onChange={set("issued_date")} /></label>
          <label><span>Valid until</span>
            <input type="date" value={form.valid_until} onChange={set("valid_until")} /></label>
          <label><span>Validity note (if no date)</span>
            <input value={form.validity_note} onChange={set("validity_note")} maxLength={120} placeholder="e.g. Valid for project duration" /></label>
          <label><span>Certificate link</span>
            <input value={form.document_url} onChange={set("document_url")} placeholder="/uploads/… or https://…" /></label>
          <label className="pa-wide"><span>Notes for the client</span>
            <textarea rows={2} value={form.description} onChange={set("description")} maxLength={4000} /></label>
          <label className="pa-check pa-wide">
            <input type="checkbox" checked={form.visible_to_client} onChange={set("visible_to_client")} />
            <span>Visible to client (the client is notified when this is added or its status changes)</span>
          </label>
        </div>
        <div className="pa-actions">
          {editingId && <button type="button" className="pa-btn pa-btn--ghost" onClick={reset}>Cancel edit</button>}
          <button type="submit" className="pa-btn pa-btn--primary" disabled={saving}>
            {saving ? "Saving…" : editingId ? "Save changes" : "Add approval"}
          </button>
        </div>
      </form>

      <div className="pa-card">
        <div className="pa-table-wrap">
          <table className="pa-table">
            <thead>
              <tr><th>Approval</th><th>Authority / Ref</th><th>Status</th><th>Dates</th><th>Client</th><th /></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="pa-empty">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="pa-empty">No approvals recorded for this project yet.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.title}</strong><div className="pa-sub">{cap(r.category || "")}</div></td>
                  <td>{r.issued_by || "—"}<div className="pa-sub">{r.reference_no || ""}</div></td>
                  <td><span className={`pa-pill pa-pill--${r.status}`}>{cap(r.status)}</span></td>
                  <td>{r.issued_date || "—"}<div className="pa-sub">{r.valid_until ? `until ${r.valid_until}` : r.validity_note || ""}</div></td>
                  <td>{r.visible_to_client ? "Visible" : <span className="pa-sub">Hidden</span>}</td>
                  <td className="pa-row-actions">
                    <button className="pa-btn pa-btn--ghost" onClick={() => edit(r)}>Edit</button>
                    <button className="pa-btn pa-btn--danger" onClick={() => remove(r)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
