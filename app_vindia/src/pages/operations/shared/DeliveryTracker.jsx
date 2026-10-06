import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Truck, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import StatusBadge from "./StatusBadge";
import OpsModal from "./OpsModal";
import { fmtDate, isOverdue, errorText } from "./opsFormat";
import "./operationsHub.css";

const TABS = [
  { v: "all", label: "All" },
  { v: "active", label: "In progress" },
  { v: "delayed", label: "Delayed" },
  { v: "delivered", label: "Delivered" },
];

/* Read-only delivery board — used by the Operations Manager ("Logistics")
   and the Procurement Officer ("Delivery Follow-up"). Logistics itself keeps
   its own editable Deliveries screen. */
export default function DeliveryTracker({ title, subtitle }) {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await operationsService.getDeliveries();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setError(errorText(e, "Failed to load deliveries")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const late = (d) => !["delivered", "cancelled"].includes(d.status) && isOverdue(d.expected_date);

  const filtered = useMemo(() => rows.filter((d) => {
    if (tab === "active" && !["scheduled", "dispatched", "in_transit"].includes(d.status)) return false;
    if (tab === "delayed" && !(d.status === "delayed" || late(d))) return false;
    if (tab === "delivered" && d.status !== "delivered") return false;
    if (q) {
      const hay = `${d.delivery_code} ${d.po_code || ""} ${d.project_name || ""} ${d.vendor_name || ""}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  }), [rows, tab, q]);

  const count = (v) => rows.filter((d) =>
    v === "all" ? true : v === "active" ? ["scheduled", "dispatched", "in_transit"].includes(d.status)
    : v === "delayed" ? (d.status === "delayed" || late(d)) : d.status === v).length;

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">{title}</h1><p className="ops-subtitle">{subtitle}</p></div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {error && <div className="ops-alert ops-alert-error">{error}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs">
            {TABS.map((t) => (
              <button key={t.v} className={`ops-tab ${tab === t.v ? "ops-tab-active" : ""}`} onClick={() => setTab(t.v)}>
                {t.label} <span className="ops-tab-count">{count(t.v)}</span>
              </button>
            ))}
          </div>
          <div className="hub-search">
            <Search size={15} />
            <input className="ops-input" placeholder="Search code, PO, project, vendor" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        ) : filtered.length === 0 ? (
          <div className="ops-empty"><Truck size={28} />No deliveries match.</div>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Delivery</th><th>PO</th><th>Project</th><th>Vendor</th><th>Status</th><th>Expected</th><th>Delivered</th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="hub-clickable" onClick={() => setOpen(d)}>
                    <td className="hub-mono hub-strong">{d.delivery_code}</td>
                    <td className="hub-mono">{d.po_code || "—"}</td>
                    <td>{d.project_name || "—"}</td>
                    <td>{d.vendor_name || "—"}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className={late(d) ? "hub-late" : ""}>{fmtDate(d.expected_date)}{late(d) ? " · overdue" : ""}</td>
                    <td>{fmtDate(d.delivery_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <OpsModal title={`Delivery ${open.delivery_code}`} onClose={() => setOpen(null)}
          footer={<button className="ops-btn ops-btn-outline" onClick={() => setOpen(null)}>Close</button>}>
          <dl className="hub-detail">
            <dt>Status</dt><dd><StatusBadge status={open.status} /></dd>
            <dt>Purchase order</dt><dd>{open.po_code || "—"}</dd>
            <dt>Project</dt><dd>{open.project_name || "—"}</dd>
            <dt>Vendor</dt><dd>{open.vendor_name || "—"}</dd>
            <dt>Transporter</dt><dd>{open.transporter || "—"}</dd>
            <dt>Vehicle / driver</dt><dd>{[open.vehicle_number, open.driver_name].filter(Boolean).join(" · ") || "—"}</dd>
            <dt>Expected</dt><dd>{fmtDate(open.expected_date)}</dd>
            <dt>Dispatched</dt><dd>{fmtDate(open.dispatch_date)}</dd>
            <dt>Delivered</dt><dd>{fmtDate(open.delivery_date)}</dd>
            <dt>Stock receipt</dt><dd>{String(open.receipt_status || "—").replace(/_/g, " ")}</dd>
            {open.delay_reason && (<><dt>Delay reason</dt><dd className="hub-late">{open.delay_reason}</dd></>)}
            {open.remarks && (<><dt>Remarks</dt><dd>{open.remarks}</dd></>)}
          </dl>
        </OpsModal>
      )}
    </div>
  );
}
