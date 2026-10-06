import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Laptop, RefreshCw } from "lucide-react";
import officeAdminService from "../../../services/officeAdminService";
import StatusBadge from "../shared/StatusBadge";
import OpsModal from "../shared/OpsModal";
import { inr, fmtDate, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const CATS = ["laptop", "furniture", "vehicle", "equipment", "software", "other"];
const EMPTY = { name: "", category: "laptop", serial_no: "", purchase_date: "", purchase_cost: "", location: "", assigned_to_name: "", notes: "" };

export default function Assets() {
  const [rows, setRows] = useState([]);
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(null);
  const [assign, setAssign] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows((await officeAdminService.getAssets({ category, status, search: q || undefined })).data); }
    catch (e) { setError(errorText(e, "Failed to load assets")); }
    finally { setLoading(false); }
  }, [category, status, q]);
  useEffect(() => { const t = setTimeout(load, q ? 300 : 0); return () => clearTimeout(t); }, [load, q]);

  const run = async (fn) => { setSaving(true); setError(""); try { await fn(); await load(); return true; } catch (e) { setError(errorText(e, "Update failed")); return false; } finally { setSaving(false); } };
  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Company Assets</h1><p className="ops-subtitle">Who has what, and what is being serviced</p></div>
        <div className="ops-flex-center">
          <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-btn ops-btn-primary" onClick={() => setForm(EMPTY)}><Plus size={16} /> Add asset</button>
        </div>
      </div>
      {error && !form && !assign && <div className="ops-alert ops-alert-error">{error}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-flex-center">
            <select className="ops-select" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{CATS.map((c) => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>)}</select>
            <select className="ops-select" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{["available", "assigned", "maintenance", "retired", "lost"].map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </div>
          <div className="hub-search"><Search size={15} /><input className="ops-input" placeholder="Search name, code, serial, person" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : rows.length === 0 ? <div className="ops-empty"><Laptop size={28} />No assets found.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Asset</th><th>Category</th><th>Assigned to</th><th>Location</th><th>Cost</th><th>Status</th><th /></tr></thead>
          <tbody>{rows.map((a) => (
            <tr key={a.id}>
              <td><span className="hub-strong">{a.name}</span><br /><span className="ops-muted"><span className="hub-mono">{a.asset_code}</span>{a.serial_no ? ` · S/N ${a.serial_no}` : ""}</span></td>
              <td style={{ textTransform: "capitalize" }}>{a.category}</td>
              <td>{a.assigned_to_name || "—"}{a.assigned_at ? <><br /><span className="ops-muted">since {fmtDate(a.assigned_at)}</span></> : null}</td>
              <td>{a.location || "—"}</td><td>{a.purchase_cost != null ? inr(a.purchase_cost) : "—"}</td><td><StatusBadge status={a.status} /></td>
              <td><div className="hub-row-actions">
                {["available", "assigned"].includes(a.status) && <button className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => setAssign({ asset: a, who: a.assigned_to_name || "" })}>{a.status === "assigned" ? "Reassign" : "Assign"}</button>}
                {a.status === "maintenance" && <button className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => run(() => officeAdminService.updateAssetStatus(a.id, "available"))}>Back in service</button>}
                {["available", "assigned"].includes(a.status) && <button className="ops-btn ops-btn-outline ops-btn-sm" onClick={() => run(() => officeAdminService.updateAssetStatus(a.id, "maintenance"))}>Send to maintenance</button>}
              </div></td></tr>))}</tbody></table></div>)}
      </div>

      {form && (
        <OpsModal wide title="Add asset" onClose={() => !saving && setForm(null)}
          footer={<><button className="ops-btn ops-btn-outline" onClick={() => setForm(null)} disabled={saving}>Cancel</button>
            <button className="ops-btn ops-btn-primary" disabled={saving} onClick={async () => { if (!form.name.trim()) { setError("Name is required"); return; } if (await run(() => officeAdminService.createAsset(form))) setForm(null); }}>{saving ? "Saving…" : "Add asset"}</button></>}>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Name *</label><input className="ops-input" value={form.name} onChange={setField("name")} autoFocus /></div>
            <div className="ops-form-group"><label className="ops-label">Category</label><select className="ops-select" value={form.category} onChange={setField("category")}>{CATS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Serial no.</label><input className="ops-input" value={form.serial_no} onChange={setField("serial_no")} /></div>
            <div className="ops-form-group"><label className="ops-label">Location</label><input className="ops-input" value={form.location} onChange={setField("location")} /></div>
          </div>
          <div className="ops-form-row">
            <div className="ops-form-group"><label className="ops-label">Purchase date</label><input type="date" className="ops-input" value={form.purchase_date} onChange={setField("purchase_date")} /></div>
            <div className="ops-form-group"><label className="ops-label">Purchase cost (₹)</label><input type="number" min="0" className="ops-input" value={form.purchase_cost} onChange={setField("purchase_cost")} /></div>
          </div>
          <div className="ops-form-group"><label className="ops-label">Assign to (optional)</label><input className="ops-input" value={form.assigned_to_name} onChange={setField("assigned_to_name")} /></div>
          {error && <div className="ops-alert ops-alert-error">{error}</div>}
        </OpsModal>)}

      {assign && (
        <OpsModal title={`${assign.asset.status === "assigned" ? "Reassign" : "Assign"} ${assign.asset.asset_code}`} onClose={() => !saving && setAssign(null)}
          footer={<><button className="ops-btn ops-btn-outline" onClick={() => setAssign(null)} disabled={saving}>Cancel</button>
            <button className="ops-btn ops-btn-primary" disabled={saving} onClick={async () => { if (await run(() => officeAdminService.assignAsset(assign.asset.id, assign.who))) setAssign(null); }}>{assign.who.trim() ? "Assign" : "Return to pool"}</button></>}>
          <div className="ops-form-group"><label className="ops-label">Person (leave empty to return to the pool)</label>
            <input className="ops-input" value={assign.who} autoFocus onChange={(e) => setAssign((s) => ({ ...s, who: e.target.value }))} /></div>
          {error && <div className="ops-alert ops-alert-error">{error}</div>}
        </OpsModal>)}
    </div>
  );
}
