import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Warehouse, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import { fmtDateTime, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const TYPE_TONE = { RECEIPT: "emerald", RETURN: "emerald", TRANSFER_IN: "sky", TRANSFER_OUT: "indigo", ISSUE: "amber", ADJUSTMENT: "gray" };

export default function InventoryOverview() {
  const [stock, setStock] = useState([]);
  const [txns, setTxns] = useState([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [s, t] = await Promise.all([operationsService.getStockRegister(), operationsService.getTransactions({ limit: 12 })]);
      setStock(Array.isArray(s.data) ? s.data : []);
      setTxns(Array.isArray(t.data) ? t.data.slice(0, 12) : []);
    } catch (e) { setError(errorText(e, "Failed to load inventory")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const low = (r) => Number(r.available_qty) <= Number(r.minimum_stock || 0);
  const filtered = useMemo(() => stock.filter((r) =>
    (!lowOnly || low(r)) && (!q || `${r.item_name} ${r.item_code} ${r.project_name || ""}`.toLowerCase().includes(q.toLowerCase()))), [stock, q, lowOnly]);

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Inventory</h1><p className="ops-subtitle">Live stock by item and site (read-only — the Inventory Controller owns the transactions)</p></div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs">
            <button className={`ops-tab ${!lowOnly ? "ops-tab-active" : ""}`} onClick={() => setLowOnly(false)}>All stock <span className="ops-tab-count">{stock.length}</span></button>
            <button className={`ops-tab ${lowOnly ? "ops-tab-active" : ""}`} onClick={() => setLowOnly(true)}>Low / out <span className="ops-tab-count">{stock.filter(low).length}</span></button>
          </div>
          <div className="hub-search"><Search size={15} />
            <input className="ops-input" placeholder="Search item or code" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : filtered.length === 0 ? <div className="ops-empty"><Warehouse size={28} />No stock rows.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Item</th><th>Site</th><th>Available</th><th>Minimum</th><th>Level</th></tr></thead>
          <tbody>{filtered.map((r, i) => {
            const avail = Number(r.available_qty), min = Number(r.minimum_stock || 0);
            const tone = avail <= 0 ? "red" : avail <= min ? "amber" : "emerald";
            return (<tr key={`${r.item_id}-${r.project_id}-${i}`}>
              <td><span className="hub-strong">{r.item_name}</span><br /><span className="ops-muted">{r.item_code}</span></td>
              <td>{r.project_name || (r.project_id ? `Project #${r.project_id}` : "—")}</td>
              <td className="hub-strong">{avail} {r.unit}</td><td>{min} {r.unit}</td>
              <td><span className={`ops-badge ops-badge-${tone}`}><span className="ops-badge-dot" />{avail <= 0 ? "out of stock" : avail <= min ? "low" : "ok"}</span></td></tr>);
          })}</tbody></table></div>)}
      </div>

      <div className="ops-card">
        <div className="ops-card-header"><h2>Latest stock movements</h2></div>
        {txns.length === 0 ? <div className="ops-empty">No movements yet.</div> : (
          <ul className="hub-feed">{txns.map((t) => (
            <li key={t.id}><span className={`ops-badge ops-badge-${TYPE_TONE[t.transaction_type] || "gray"}`}>{String(t.transaction_type).replace("_", " ")}</span>
              <div className="hub-feed-main"><p><b>{t.item_name || `Item #${t.item_id}`}</b> · {Number(t.quantity) > 0 ? "+" : ""}{Number(t.quantity)} {t.unit || ""}</p>
                <small>{fmtDateTime(t.created_at)}{t.remarks ? ` · ${t.remarks}` : ""}</small></div></li>))}</ul>)}
      </div>
    </div>
  );
}
