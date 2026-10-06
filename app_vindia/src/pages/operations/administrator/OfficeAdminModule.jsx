import { useEffect, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, X } from "lucide-react";
import { Link } from "react-router-dom";
import officeAdminService from "../../../services/officeAdminService";
import "./OfficeAdminModule.css";

const CONFIG = {
  requests: { title: "Office Requests", subtitle: "Review and manage administrative requests.", columns: ["request_code","requester_name","request_type","title","priority","status"], get: () => officeAdminService.getRequests(), create: officeAdminService.createRequest },
  facilities: { title: "Facilities", subtitle: "Track office maintenance and facility issues.", columns: ["request_code","location","issue_type","priority","status","assigned_vendor"], get: () => officeAdminService.getFacilities(), create: officeAdminService.createFacility },
  supplies: { title: "Office Supplies", subtitle: "Maintain office consumables and stock levels.", columns: ["item_code","item_name","category","unit","current_qty","minimum_qty","location"], get: () => officeAdminService.getSupplies(), create: officeAdminService.createSupply },
  visitors: { title: "Visitors", subtitle: "Manage expected visitors and check-in/check-out status.", columns: ["visitor_name","company","purpose","host_name","expected_at","status"], get: () => officeAdminService.getVisitors(), create: officeAdminService.createVisitor },
  assets: { title: "Administrative Assets", subtitle: "Track company assets assigned to office users and locations.", columns: ["asset_code","asset_name","category","serial_number","assigned_name","condition","status"], get: () => officeAdminService.getAssets(), create: officeAdminService.createAsset },
};

const emptyForm = {
  requests: { request_type: "administrative", title: "", description: "", priority: "normal", due_date: "" },
  facilities: { location: "", issue_type: "maintenance", description: "", priority: "normal", due_date: "" },
  supplies: { item_code: "", item_name: "", category: "", unit: "pcs", current_qty: 0, minimum_qty: 0, location: "" },
  visitors: { visitor_name: "", company: "", contact: "", purpose: "", expected_at: "", notes: "" },
  assets: { asset_code: "", asset_name: "", category: "", serial_number: "", location: "", purchase_date: "", condition: "good", status: "available", notes: "" },
};

const fmt = (v, k) => {
  if (v == null || v === "") return "—";
  if (["expected_at", "created_at", "due_date"].includes(k)) return new Date(v).toLocaleString("en-IN", { dateStyle: "medium", ...(k === "expected_at" ? { timeStyle: "short" } : {}) });
  return String(v).replaceAll("_", " ");
};

export default function OfficeAdminModule({ module }) {
  const cfg = CONFIG[module] || CONFIG.requests;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm[module] || {});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true); setError("");
    try { const r = await cfg.get(); setRows(r.data?.data || []); }
    catch (e) { setError(e.response?.data?.error || "Unable to load this module."); }
    finally { setLoading(false); }
  };

  useEffect(() => { setForm(emptyForm[module] || {}); setShowForm(false); load(); }, [module]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setError("");
    try { await cfg.create(form); setShowForm(false); setForm(emptyForm[module] || {}); await load(); }
    catch (e) { setError(e.response?.data?.error || "Unable to save the record."); }
    finally { setSaving(false); }
  };

  const updateStatus = async (row, status) => {
    try {
      if (module === "requests") await officeAdminService.updateRequestStatus(row.id, { status });
      if (module === "facilities") await officeAdminService.updateFacilityStatus(row.id, { status });
      if (module === "visitors") await officeAdminService.updateVisitorStatus(row.id, { status });
      await load();
    } catch (e) { setError(e.response?.data?.error || "Unable to update status."); }
  };

  return (
    <div className="oam-page">
      <header className="oam-header">
        <div><span>Office Administration</span><h1>{cfg.title}</h1><p>{cfg.subtitle}</p></div>
        <div className="oam-actions"><Link to="/office-administrator/dashboard"><ArrowLeft size={15}/> Dashboard</Link><button onClick={load}><RefreshCw size={15}/> Refresh</button></div>
      </header>

      <section className="oam-card">
        <div className="oam-card-head"><h2>{rows.length} record{rows.length === 1 ? "" : "s"}</h2><button className="oam-primary" onClick={() => setShowForm(true)}><Plus size={15}/> New {cfg.title.replace(/s$/i, "")}</button></div>
        {error && <div className="oam-inline-error">{error}</div>}
        {loading ? <div className="oam-state">Loading…</div> : rows.length === 0 ? <div className="oam-empty">No records have been created yet.</div> : (
          <div className="oam-table-wrap"><table className="oam-table"><thead><tr>{cfg.columns.map(c => <th key={c}>{c.replaceAll("_", " ")}</th>)}{["requests","facilities","visitors"].includes(module) && <th>Action</th>}</tr></thead><tbody>
            {rows.map((row, i) => <tr key={row.id ?? i}>{cfg.columns.map(c => <td key={c}>{fmt(row[c], c)}</td>)}{["requests","facilities","visitors"].includes(module) && <td><StatusAction module={module} row={row} onChange={updateStatus}/></td>}</tr>)}
          </tbody></table></div>
        )}
      </section>

      {showForm && <div className="oam-modal-backdrop" onMouseDown={() => setShowForm(false)}><div className="oam-modal" onMouseDown={e => e.stopPropagation()}><div className="oam-modal-head"><div><h2>Create {cfg.title.replace(/s$/i, "")}</h2><p>Enter the minimum information required to create the record.</p></div><button onClick={() => setShowForm(false)}><X size={18}/></button></div><form onSubmit={save}><Fields module={module} form={form} setForm={setForm}/><div className="oam-form-actions"><button type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="oam-primary" disabled={saving}>{saving ? "Saving…" : "Create"}</button></div></form></div></div>}
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", required = false, children }) { return <label className="oam-field"><span>{label}</span>{children || <input type={type} value={value ?? ""} required={required} onChange={e => onChange(e.target.value)} />}</label>; }
function Fields({ module, form, setForm }) { const set = (name, value) => setForm(v => ({ ...v, [name]: value }));
  if (module === "requests") return <div className="oam-form-grid"><Field label="Request Type" name="request_type" value={form.request_type} onChange={v=>set("request_type",v)} required/><Field label="Title" name="title" value={form.title} onChange={v=>set("title",v)} required/><Field label="Priority" name="priority" value={form.priority} onChange={v=>set("priority",v)}><select value={form.priority} onChange={e=>set("priority",e.target.value)}><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></Field><Field label="Due Date" name="due_date" type="date" value={form.due_date} onChange={v=>set("due_date",v)}/><Field label="Description" name="description" value={form.description} onChange={v=>set("description",v)}><textarea value={form.description} onChange={e=>set("description",e.target.value)} rows="4"/></Field></div>;
  if (module === "facilities") return <div className="oam-form-grid"><Field label="Location" name="location" value={form.location} onChange={v=>set("location",v)} required/><Field label="Issue Type" name="issue_type" value={form.issue_type} onChange={v=>set("issue_type",v)} required/><Field label="Priority" name="priority" value={form.priority} onChange={v=>set("priority",v)}><select value={form.priority} onChange={e=>set("priority",e.target.value)}><option>low</option><option>normal</option><option>high</option><option>urgent</option></select></Field><Field label="Due Date" name="due_date" type="date" value={form.due_date} onChange={v=>set("due_date",v)}/><Field label="Description" name="description" value={form.description} onChange={v=>set("description",v)} required><textarea value={form.description} onChange={e=>set("description",e.target.value)} rows="4"/></Field></div>;
  if (module === "supplies") return <div className="oam-form-grid"><Field label="Item Name" name="item_name" value={form.item_name} onChange={v=>set("item_name",v)} required/><Field label="Item Code" name="item_code" value={form.item_code} onChange={v=>set("item_code",v)}/><Field label="Category" name="category" value={form.category} onChange={v=>set("category",v)}/><Field label="Unit" name="unit" value={form.unit} onChange={v=>set("unit",v)} required/><Field label="Current Qty" name="current_qty" type="number" value={form.current_qty} onChange={v=>set("current_qty",v)}/><Field label="Minimum Qty" name="minimum_qty" type="number" value={form.minimum_qty} onChange={v=>set("minimum_qty",v)}/><Field label="Location" name="location" value={form.location} onChange={v=>set("location",v)}/></div>;
  if (module === "visitors") return <div className="oam-form-grid"><Field label="Visitor Name" name="visitor_name" value={form.visitor_name} onChange={v=>set("visitor_name",v)} required/><Field label="Company" name="company" value={form.company} onChange={v=>set("company",v)}/><Field label="Contact" name="contact" value={form.contact} onChange={v=>set("contact",v)}/><Field label="Purpose" name="purpose" value={form.purpose} onChange={v=>set("purpose",v)}/><Field label="Expected At" name="expected_at" type="datetime-local" value={form.expected_at} onChange={v=>set("expected_at",v)}/><Field label="Notes" name="notes" value={form.notes} onChange={v=>set("notes",v)}><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows="3"/></Field></div>;
  return <div className="oam-form-grid"><Field label="Asset Name" name="asset_name" value={form.asset_name} onChange={v=>set("asset_name",v)} required/><Field label="Asset Code" name="asset_code" value={form.asset_code} onChange={v=>set("asset_code",v)}/><Field label="Category" name="category" value={form.category} onChange={v=>set("category",v)}/><Field label="Serial Number" name="serial_number" value={form.serial_number} onChange={v=>set("serial_number",v)}/><Field label="Location" name="location" value={form.location} onChange={v=>set("location",v)}/><Field label="Purchase Date" name="purchase_date" type="date" value={form.purchase_date} onChange={v=>set("purchase_date",v)}/><Field label="Condition" name="condition" value={form.condition} onChange={v=>set("condition",v)}><select value={form.condition} onChange={e=>set("condition",e.target.value)}><option>new</option><option>good</option><option>fair</option><option>damaged</option><option>retired</option></select></Field></div>;
}
function StatusAction({ module, row, onChange }) { const options = module === "requests" ? ["approved","rejected","in_progress","completed"] : module === "facilities" ? ["assigned","in_progress","resolved","cancelled"] : ["checked_in","checked_out","cancelled"]; return <select className="oam-status-select" value="" onChange={e => e.target.value && onChange(row,e.target.value)}><option value="">Update…</option>{options.map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select>; }
