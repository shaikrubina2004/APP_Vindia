import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Plus, ClipboardList, RefreshCw } from "lucide-react";
import officeAdminService from "../../../services/officeAdminService";
import StatusBadge from "../shared/StatusBadge";
import OpsModal from "../shared/OpsModal";
import ReasonModal from "../shared/ReasonModal";
import { inr, fmtDate, isOverdue, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const CATEGORIES = [
  { v: "all", label: "All" }, { v: "supplies", label: "Supplies" }, { v: "maintenance", label: "Maintenance" },
  { v: "facility", label: "Facilities" }, { v: "travel_admin", label: "Travel & admin" }, { v: "document", label: "Documents" }, { v: "other", label: "Other" },
];
const EMPTY = { title: "", category: "supplies", priority: "normal", description: "", requested_by_name: "", department: "", location: "", needed_by: "", cost_estimate: "" };
const NEXT = { open: ["in_progress", "resolved"], in_progress: ["resolved", "open"], resolved: ["closed", "in_progress"], closed: [], rejected: [], awaiting_approval: [] };

/* Used by the Office Administrator (their "Office Requests" / "Facilities" /
   "Office Supplies" screens, via `defaultCategory`) and by the Operations
   Manager ("Office Administration", managerMode) who also decides the
   requests that are over the office spend limit. */
export default function OfficeRequests({ defaultCategory = "all", title = "Office Requests", managerMode = false }) {
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState(defaultCategory);
  const [status, setStatus] = useState("active");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reject, setReject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows((await officeAdminService.getRequests({ category, status, search: q || undefined })).data); }
    catch (e) { setError(errorText(e, "Failed to load requests")); }
    finally { setLoading(false); }
  }, [category, status, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);
  useEffect(() => setCategory(defaultCategory), [defaultCategory]);

  const flash = (m) => { setNotice(m); setTimeout(() => setNotice(""), 3000); };
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async () => {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true); setError("");
    try {
      const { data } = await officeAdminService.createRequest(form);
      setForm(null);
      flash(data.status === "awaiting_approval" ? `${data.request_code} sent to the Operations Manager for approval.` : `${data.request_code} created.`);
      await load();
    } catch (e) { setError(errorText(e, "Could not create the request")); }
    finally { setSaving(false); }
  };
  const move = async (r, to) => {
    try { await officeAdminService.updateRequestStatus(r.id, to); await load(); }
    catch (e) { setError(errorText(e, "Update failed")); }
  };

  const shown = useMemo(() => rows, [rows]);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">{title}</h1>
          <p className="ops-subtitle">{managerMode ? "Approve high-value requests and monitor the office team" : "Supplies, maintenance, facilities, travel and document requests"}</p></div>
        <div className="ops-flex-center">
          <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-btn ops-btn-primary" onClick={() => setForm({ ...EMPTY, category: defaultCategory === "all" ? "supplies" : defaultCategory })}><Plus size={16} /> New request</button>
        </div>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}
      {notice && <div className="ops-alert ops-alert-success">{notice}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs" style={{ flexWrap: "wrap" }}>
            {CATEGORIES.map((c) => (<button key={c.v} className={`ops-tab ${category === c.v ? "ops-tab-active" : ""}`} onClick={() => setCategory(c.v)}>{c.label}</button>))}
          </div>
          <div className="ops-flex-center">
            <select className="ops-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option><option value="all">All statuses</option><option value="awaiting_approval">Awaiting approval</option>
              <option value="resolved">Resolved</option><option value="closed">Closed</option><option value="rejected">Rejected</option>
            </select>
            <div className="hub-search"><Search size={15} /><input className="ops-input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
        </div>

        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : shown.length === 0 ? <div className="ops-empty"><ClipboardList size={28} />No requests found.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Request</th><th>Category</th><th>Priority</th><th>Needed by</th><th>Estimate</th><th>Status</th><th /></tr></thead>
          <tbody>{shown.map((r) => {
            const late = isOverdue(r.needed_by) && ["open", "in_progress", "awaiting_approval"].includes(r.status);
            return (<tr key={r.id}>
              <td><span className="hub-strong">{r.title}</span><br /><span className="ops-muted"><span className="hub-mono">{r.request_code}</span>{r.requested_by_name ? ` · ${r.requested_by_name}` : ""}</span></td>
              <td style={{ textTransform: "capitalize" }}>{String(r.category).replace("_", " ")}</td>
              <td><StatusBadge status={r.priority} /></td>
              <td className={late ? "hub-late" : ""}>{fmtDate(r.needed_by)}{late ? " · overdue" : ""}</td>
              <td>{r.cost_estimate != null ? inr(r.cost_estimate) : "—"}</td>
              <td><StatusBadge status={r.status} />{r.status === "rejected" && r.resolution_note && <><br /><span className="ops-muted">{r.resolution_note}</span></>}</td>
              <td><div className="hub-row-actions">
                {r.status === "awaiting_approval" && managerMode && (<>
                  <button className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => setReject(r)}>Reject</button>
                  <button className="ops-btn ops-btn-primary ops-btn-sm" onClick={() => move(r, "in_progress")}>Approve</button></>)}
                {(NEXT[r.status] || []).map((to) => (
                  <button key={to} className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => move(r, to)} style={{ textTransform: "capitalize" }}>{to === "open" ? "Reopen" : `Mark ${to.replace("_", " ")}`}</button>))}
              </div></td></tr>);
          })}</tbody></table></div>)}
      </div>

      {form && (
        <OpsModal wide title="New office request" onClose={() => !saving && setForm(null)}
          footer={<><button className="ops-btn ops-btn-outline" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
            <button className="ops-btn ops-btn-primary" onClick={create} disabled={saving}>{saving ? "Saving…" : "Create request"}</button></>}>
          <div className="ops-form-group"><label className="ops-label">Title *</label><input className="ops-input" value={form.title} onChange={setField("title")} autoFocus /></div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Category</label>
              <select className="ops-select" value={form.category} onChange={setField("category")}>{CATEGORIES.filter((c) => c.v !== "all").map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}</select></div>
            <div className="ops-form-group"><label className="ops-label">Priority</label>
              <select className="ops-select" value={form.priority} onChange={setField("priority")}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
          </div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Requested by</label><input className="ops-input" value={form.requested_by_name} onChange={setField("requested_by_name")} /></div>
            <div className="ops-form-group"><label className="ops-label">Department</label><input className="ops-input" value={form.department} onChange={setField("department")} /></div>
          </div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Needed by</label><input type="date" className="ops-input" value={form.needed_by} onChange={setField("needed_by")} /></div>
            <div className="ops-form-group"><label className="ops-label">Cost estimate (₹)</label><input type="number" min="0" className="ops-input" value={form.cost_estimate} onChange={setField("cost_estimate")} /></div>
          </div>
          <div className="ops-form-group"><label className="ops-label">Location</label><input className="ops-input" value={form.location} onChange={setField("location")} /></div>
          <div className="ops-form-group"><label className="ops-label">Details</label><textarea className="ops-textarea" rows={3} value={form.description} onChange={setField("description")} /></div>
          <div className="hub-warn-note">Requests with an estimate above ₹25,000 are sent to the Operations Manager for approval first.</div>
          {error && <div className="ops-alert ops-alert-error">{error}</div>}
        </OpsModal>)}
      {reject && <ReasonModal title={`Reject ${reject.request_code}`} confirmText="Reject"
        onConfirm={async (note) => { await officeAdminService.updateRequestStatus(reject.id, "rejected", note); setReject(null); flash("Rejected."); await load(); }}
        onClose={() => setReject(null)} />}
    </div>
  );
}
