import { useEffect, useState, useCallback } from "react";
import { UserPlus, LogIn, LogOut, RefreshCw, Users } from "lucide-react";
import officeAdminService from "../../../services/officeAdminService";
import StatusBadge from "../shared/StatusBadge";
import OpsModal from "../shared/OpsModal";
import { fmtDateTime, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const EMPTY = { visitor_name: "", company: "", phone: "", purpose: "", host_name: "", badge_no: "", expected_at: "", notes: "" };

export default function Visitors() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows((await officeAdminService.getVisitors({ status })).data); }
    catch (e) { setError(errorText(e, "Failed to load visitors")); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn) => { try { await fn(); await load(); } catch (e) { setError(errorText(e, "Update failed")); } };
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const save = async () => {
    if (!form.visitor_name.trim()) { setError("Visitor name is required"); return; }
    setSaving(true); setError("");
    try { await officeAdminService.createVisitor(form); setForm(null); await load(); }
    catch (e) { setError(errorText(e, "Could not register visitor")); }
    finally { setSaving(false); }
  };

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Visitors</h1><p className="ops-subtitle">Check visitors in and out, or pre-register expected guests</p></div>
        <div className="ops-flex-center">
          <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-btn ops-btn-primary" onClick={() => setForm(EMPTY)}><UserPlus size={16} /> Register visitor</button>
        </div>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}
      <div className="ops-card">
        <div className="ops-card-header"><div className="ops-tabs">
          {[["all", "All"], ["checked_in", "In office"], ["expected", "Expected"], ["checked_out", "Left"]].map(([v, l]) => (
            <button key={v} className={`ops-tab ${status === v ? "ops-tab-active" : ""}`} onClick={() => setStatus(v)}>{l}</button>))}</div></div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : rows.length === 0 ? <div className="ops-empty"><Users size={28} />No visitors.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Visitor</th><th>Meeting</th><th>Purpose</th><th>Badge</th><th>In</th><th>Out</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((v) => (
            <tr key={v.id}>
              <td><span className="hub-strong">{v.visitor_name}</span><br /><span className="ops-muted">{[v.company, v.phone].filter(Boolean).join(" · ")}</span></td>
              <td>{v.host_name || "—"}</td><td>{v.purpose || "—"}</td><td className="hub-mono">{v.badge_no || "—"}</td>
              <td>{v.status === "expected" ? <span className="ops-muted">due {fmtDateTime(v.expected_at)}</span> : fmtDateTime(v.check_in)}</td>
              <td>{fmtDateTime(v.check_out)}</td><td><StatusBadge status={v.status} /></td>
              <td><div className="hub-row-actions">
                {v.status === "expected" && <button className="ops-btn ops-btn-primary ops-btn-sm" onClick={() => act(() => officeAdminService.checkInVisitor(v.id))}><LogIn size={13} /> Check in</button>}
                {v.status === "checked_in" && <button className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => act(() => officeAdminService.checkOutVisitor(v.id))}><LogOut size={13} /> Check out</button>}
              </div></td></tr>))}</tbody></table></div>)}
      </div>

      {form && (
        <OpsModal title="Register visitor" onClose={() => !saving && setForm(null)}
          footer={<><button className="ops-btn ops-btn-outline" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
            <button className="ops-btn ops-btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : form.expected_at ? "Pre-register" : "Check in now"}</button></>}>
          <div className="ops-form-group"><label className="ops-label">Visitor name *</label><input className="ops-input" value={form.visitor_name} onChange={setField("visitor_name")} autoFocus /></div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Company</label><input className="ops-input" value={form.company} onChange={setField("company")} /></div>
            <div className="ops-form-group"><label className="ops-label">Phone</label><input className="ops-input" value={form.phone} onChange={setField("phone")} /></div>
          </div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Meeting (host)</label><input className="ops-input" value={form.host_name} onChange={setField("host_name")} /></div>
            <div className="ops-form-group"><label className="ops-label">Badge no.</label><input className="ops-input" value={form.badge_no} onChange={setField("badge_no")} /></div>
          </div>
          <div className="ops-form-group"><label className="ops-label">Purpose</label><input className="ops-input" value={form.purpose} onChange={setField("purpose")} /></div>
          <div className="ops-form-group"><label className="ops-label">Expected at (leave empty for a walk-in)</label><input type="datetime-local" className="ops-input" value={form.expected_at} onChange={setField("expected_at")} /></div>
          {error && <div className="ops-alert ops-alert-error">{error}</div>}
        </OpsModal>)}
    </div>
  );
}
