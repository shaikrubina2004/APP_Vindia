import { useEffect, useState } from "react";
import { ArrowUpCircle, ArrowLeftRight, RotateCcw, SlidersHorizontal, Search } from "lucide-react";
import { getItems, getStockRegister, issueStock, returnStock, transferStock, adjustStock } from "../../../services/inventoryService";
import { getProjects } from "../../../services/projectService";
import Toast from "../../../components/Toast";
import "./StockOut.css";

const TABS = [
  { key: "issue", label: "Material Issue", icon: ArrowUpCircle },
  { key: "return", label: "Material Return", icon: RotateCcw },
  { key: "transfer", label: "Stock Transfer", icon: ArrowLeftRight },
  { key: "adjustment", label: "Stock Adjustment", icon: SlidersHorizontal },
];

const StockOut = () => {
  const [tab, setTab] = useState("issue");
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
  const [register, setRegister] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [registerSearch, setRegisterSearch] = useState("");
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadRegister = () => {
    setRegisterLoading(true);
    getStockRegister().then((res) => setRegister(res.data)).finally(() => setRegisterLoading(false));
  };

  useEffect(() => {
    getItems({ status: "active" }).then((res) => setItems(res.data));
    getProjects().then((res) => setProjects(res.data)).catch(() => setProjects([]));
    loadRegister();
  }, []);

  useEffect(() => { setForm({}); setError(""); }, [tab]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (tab === "issue") await issueStock({ item_id: form.item_id, project_id: form.project_id, quantity: form.quantity, remarks: form.remarks });
      else if (tab === "return") await returnStock({ item_id: form.item_id, project_id: form.project_id, quantity: form.quantity, condition: form.condition, remarks: form.remarks });
      else if (tab === "transfer") await transferStock({ item_id: form.item_id, from_project_id: form.from_project_id, to_project_id: form.to_project_id, quantity: form.quantity, remarks: form.remarks });
      else if (tab === "adjustment") await adjustStock({ item_id: form.item_id, project_id: form.project_id, quantity_change: form.quantity_change, reason: form.reason });

      setToast({ type: "success", text: "Saved successfully" });
      setForm({});
      loadRegister();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const ItemSelect = ({ value, onChange }) => (
    <select required className="ops-select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select item…</option>
      {items.map((it) => <option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>)}
    </select>
  );

  const ProjectSelect = ({ value, onChange, placeholder = "Select project…" }) => (
    <select required className="ops-select" value={value || ""} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );

  const filteredRegister = register.filter((r) =>
    !registerSearch || r.item_name?.toLowerCase().includes(registerSearch.toLowerCase()) || r.project_name?.toLowerCase().includes(registerSearch.toLowerCase())
  );

  return (
    <div className="ops-page">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <h1 className="ops-title">Stock Out</h1>

      <div className="ops-tabs">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`ops-tab ${tab === t.key ? "ops-tab-active" : ""}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      <div className="ops-card sout-form-card">
        {error && <p className="ops-alert ops-alert-error" style={{ marginBottom: 12 }}>{error}</p>}

        <form onSubmit={submit} className="sout-form">
          <div className="ops-form-group">
            <label className="ops-label">Item *</label>
            <ItemSelect value={form.item_id} onChange={(v) => set("item_id", v)} />
          </div>

          {tab === "transfer" ? (
            <div className="ops-form-row">
              <div className="ops-form-group"><label className="ops-label">From Site *</label><ProjectSelect value={form.from_project_id} onChange={(v) => set("from_project_id", v)} /></div>
              <div className="ops-form-group"><label className="ops-label">To Site *</label><ProjectSelect value={form.to_project_id} onChange={(v) => set("to_project_id", v)} /></div>
            </div>
          ) : (
            <div className="ops-form-group">
              <label className="ops-label">Site / Project *</label>
              <ProjectSelect value={form.project_id} onChange={(v) => set("project_id", v)} />
            </div>
          )}

          <div className="ops-form-group">
            <label className="ops-label">{tab === "adjustment" ? "Quantity Change (+ / −) *" : "Quantity *"}</label>
            <input required type="number" step="any" className="ops-input"
              value={tab === "adjustment" ? (form.quantity_change ?? "") : (form.quantity ?? "")}
              onChange={(e) => set(tab === "adjustment" ? "quantity_change" : "quantity", e.target.value)} />
          </div>

          {tab === "return" && (
            <div className="ops-form-group">
              <label className="ops-label">Condition</label>
              <select className="ops-select" value={form.condition || ""} onChange={(e) => set("condition", e.target.value)}>
                <option value="">Select…</option>
                <option value="Good">Good</option>
                <option value="Damaged">Damaged</option>
                <option value="Unusable">Unusable</option>
              </select>
            </div>
          )}

          {tab === "adjustment" ? (
            <div className="ops-form-group">
              <label className="ops-label">Reason *</label>
              <input required className="ops-input" placeholder="e.g. Physical stock discrepancy" value={form.reason || ""} onChange={(e) => set("reason", e.target.value)} />
            </div>
          ) : (
            <div className="ops-form-group">
              <label className="ops-label">Remarks</label>
              <input className="ops-input" value={form.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
            </div>
          )}

          <button disabled={saving} className="ops-btn ops-btn-primary sout-submit">{saving ? "Saving…" : "Submit"}</button>
        </form>
      </div>

      <div className="ops-card ops-table-wrap">
        <div className="ops-card-header">
          <h2>Stock Register</h2>
          <div className="sout-register-search">
            <Search size={14} className="sout-register-search-icon" />
            <input value={registerSearch} onChange={(e) => setRegisterSearch(e.target.value)} placeholder="Filter…" className="ops-input" />
          </div>
        </div>
        <table className="ops-table">
          <thead><tr><th>Item</th><th>Site / Project</th><th>Available</th></tr></thead>
          <tbody>
            {registerLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{Array.from({ length: 3 }).map((__, j) => <td key={j} style={{ padding: "10px 20px" }}><div className="ops-skeleton" style={{ height: 14 }} /></td>)}</tr>
              ))
            ) : filteredRegister.length === 0 ? (
              <tr><td colSpan={3} className="ops-table-empty">No stock movements recorded yet.</td></tr>
            ) : (
              filteredRegister.map((r, i) => (
                <tr key={i}>
                  <td>{r.item_name} <span className="sout-item-code">({r.item_code})</span></td>
                  <td>{r.project_name || "Unassigned"}</td>
                  <td className={r.available_qty <= r.minimum_stock ? "sout-qty-low" : "sout-qty-ok"}>{r.available_qty} {r.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockOut;