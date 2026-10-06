import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, FileText, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import PurchaseOrderModal from "../shared/PurchaseOrderModal";
import StatusBadge from "../shared/StatusBadge";
import { inr, fmtDate, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const TABS = ["all", "pending_approval", "issued", "partially_fulfilled", "fulfilled", "cancelled"];

export default function ProcurementOverview() {
  const [rows, setRows] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const r = await operationsService.getPurchaseOrders();
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) { setError(errorText(e, "Failed to load purchase orders")); }
    finally { setLoading(false); }
    // Procurement officers' daily reports — optional panel, never blocks the page
    try {
      const r = await operationsService.getProcurementDailyReports();
      setReports(Array.isArray(r.data) ? r.data.slice(0, 5) : []);
    } catch { setReports([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((p) =>
    (tab === "all" || p.status === tab) &&
    (!q || `${p.po_code} ${p.vendor_name} ${p.project_name}`.toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);

  const total = filtered.reduce((s, p) => s + (["cancelled", "rejected"].includes(p.status) ? 0 : Number(p.total_amount || 0)), 0);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Procurement</h1><p className="ops-subtitle">Purchase orders raised by the Procurement team</p></div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs" style={{ flexWrap: "wrap" }}>
            {TABS.map((t) => (
              <button key={t} className={`ops-tab ${tab === t ? "ops-tab-active" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
                {t.replace(/_/g, " ")} <span className="ops-tab-count">{t === "all" ? rows.length : rows.filter((p) => p.status === t).length}</span>
              </button>))}
          </div>
          <div className="hub-search"><Search size={15} />
            <input className="ops-input" placeholder="Search PO, vendor, project" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : filtered.length === 0 ? <div className="ops-empty"><FileText size={28} />No purchase orders match.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>PO</th><th>Vendor</th><th>Project</th><th>Items</th><th>Value</th><th>Expected</th><th>Status</th></tr></thead>
          <tbody>{filtered.map((p) => (
            <tr key={p.id} className="hub-clickable" onClick={() => setOpen(p.id)}>
              <td className="hub-mono hub-strong">{p.po_code}</td><td>{p.vendor_name || "—"}</td><td>{p.project_name || "—"}</td>
              <td>{(p.items || []).length}</td><td className="hub-strong">{Number(p.total_amount) > 0 ? inr(p.total_amount) : "—"}</td>
              <td>{fmtDate(p.expected_delivery_date)}</td><td><StatusBadge status={p.status} /></td></tr>))}</tbody>
        </table></div>)}
        {!loading && filtered.length > 0 && <div className="ops-card-header" style={{ justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
          <span className="ops-muted">Total of listed (excl. cancelled/rejected):&nbsp;</span><b className="hub-strong">{inr(total)}</b></div>}
      </div>

      {reports.length > 0 && (
        <div className="ops-card">
          <div className="ops-card-header"><h2>Latest procurement daily reports</h2></div>
          <ul className="hub-feed">{reports.map((r, i) => (
            <li key={r.id || i}><span className="hub-feed-ico"><FileText size={15} /></span>
              <div className="hub-feed-main"><p><b>{r.officer_name || r.name || "Procurement Officer"}</b> · {fmtDate(r.report_date || r.date)}</p>
                <small>{r.summary || r.work_done || r.notes || ""}</small></div></li>))}</ul>
        </div>)}

      {open && <PurchaseOrderModal poId={open} canDecide onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
