import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Printer } from "lucide-react";
import operationsService from "../../../services/operationsService";
import { inr, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const PRESETS = [
  { label: "Last 7 days", days: 6 }, { label: "Last 30 days", days: 29 }, { label: "Last 90 days", days: 89 },
];
const Bars = ({ rows, label, value, format = (v) => v, color }) => {
  const max = Math.max(1, ...rows.map((r) => Number(r[value]) || 0));
  return rows.length === 0 ? <div className="ops-empty">No data in this period.</div> : (
    <div style={{ padding: "8px 0 12px" }}>
      {rows.map((r, i) => (
        <div className="hub-bar-row" key={i}>
          <span style={{ textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r[label]).replace(/_/g, " ")}</span>
          <div className="ops-progress-track"><div className="hub-bar-fill" style={{ width: `${(Number(r[value]) / max) * 100}%`, background: color }} /></div>
          <span className="hub-bar-val">{format(r[value])}</span>
        </div>))}
    </div>);
};

export default function OperationsReports() {
  const [to, setTo] = useState(() => daysAgo(0));
  const [from, setFrom] = useState(() => daysAgo(29));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try { setData((await operationsService.getReports({ from, to })).data); }
    catch (e) { setError(errorText(e, "Failed to load reports")); }
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const preset = (days) => { setTo(daysAgo(0)); setFrom(daysAgo(days)); };
  const dp = data?.delivery_performance;
  const funnelTotal = (data?.request_funnel || []).reduce((s, r) => s + r.count, 0);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Operations Reports</h1><p className="ops-subtitle">Procurement, delivery and stock performance for the selected period</p></div>
        <div className="ops-flex-center">
          <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
          <button className="ops-btn ops-btn-outline" onClick={() => window.print()}><Printer size={15} /> Print</button>
        </div>
      </div>

      <div className="ops-card"><div className="ops-card-header hub-toolbar">
        <div className="ops-tabs">{PRESETS.map((p) => <button key={p.label} className="ops-tab" onClick={() => preset(p.days)}>{p.label}</button>)}</div>
        <div className="ops-flex-center">
          <input type="date" className="ops-input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <span className="ops-muted">to</span>
          <input type="date" className="ops-input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div></div></div>

      {error && <div className="ops-alert ops-alert-error">{error}</div>}
      {!data && !error && <div className="ops-skeleton" style={{ height: 300 }} />}

      {data && (<>
        {data.warnings?.length > 0 && <div className="ops-alert ops-alert-warning">Some sections could not be loaded: {data.warnings.map((w) => w.section).join(", ")}.</div>}

        <div className="ops-kpi-grid hub-kpi-4">
          <div className="ops-kpi-card"><div><p className="ops-kpi-label">Deliveries on time</p>
            <p className="ops-kpi-value">{dp.on_time_rate == null ? "—" : `${dp.on_time_rate}%`}</p>
            <p className="hub-kpi-sub">{dp.on_time} on time · {dp.late} late</p></div></div>
          <div className="ops-kpi-card"><div><p className="ops-kpi-label">Avg. delay (late ones)</p>
            <p className="ops-kpi-value">{dp.avg_days_late} d</p><p className="hub-kpi-sub">{dp.cancelled} cancelled</p></div></div>
          <div className="ops-kpi-card"><div><p className="ops-kpi-label">Request → PO</p>
            <p className="ops-kpi-value">{data.request_cycle_time.avg_days_request_to_po} d</p>
            <p className="hub-kpi-sub">avg over {data.request_cycle_time.samples} PO(s)</p></div></div>
          <div className="ops-kpi-card"><div><p className="ops-kpi-label">Material requests</p>
            <p className="ops-kpi-value">{funnelTotal}</p><p className="hub-kpi-sub">raised in period</p></div></div>
        </div>

        <div className="hub-grid-eq">
          <div className="ops-card"><div className="ops-card-header"><h2>Spend by vendor</h2></div>
            <Bars rows={data.procurement_by_vendor} label="vendor" value="total_value" format={inr} /></div>
          <div className="ops-card"><div className="ops-card-header"><h2>Material request outcomes</h2></div>
            <Bars rows={data.request_funnel} label="status" value="count" color="#0ea5e9" /></div>
        </div>
        <div className="ops-card"><div className="ops-card-header"><h2>Stock movements</h2></div>
          <Bars rows={data.stock_movements} label="transaction_type" value="transactions" color="#10b981"
            format={(v) => `${v} txn`} /></div>
      </>)}
    </div>
  );
}
