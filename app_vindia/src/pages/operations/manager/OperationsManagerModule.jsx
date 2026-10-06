import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import "./OperationsManagerModule.css";

const CONFIG = {
  "material-requests": { title: "Material Requests", subtitle: "Department-wide material request visibility.", key: "requests", columns: ["id", "requester_name", "project", "status", "required_by"] },
  procurement: { title: "Procurement Overview", subtitle: "Read-only procurement control view.", key: "purchaseOrders", columns: ["po_code", "vendor_name", "project_name", "status", "created_at"] },
  "purchase-orders": { title: "Purchase Orders", subtitle: "Monitor purchase orders created by Procurement.", key: "purchaseOrders", columns: ["po_code", "vendor_name", "project_name", "status", "created_at"] },
  logistics: { title: "Logistics Overview", subtitle: "Monitor deliveries and movement across operations.", key: "recentDeliveries", columns: ["delivery_code", "vendor_name", "project_name", "status", "expected_date"] },
  inventory: { title: "Inventory Overview", subtitle: "Monitor stock health and goods receipt activity.", key: "inventory", columns: [] },
  vendors: { title: "Vendor Overview", subtitle: "Supplier visibility derived from current procurement records.", key: "purchaseOrders", columns: ["vendor_name", "po_code", "project_name", "status", "created_at"] },
  administration: { title: "Office Administration", subtitle: "Open the Office Administrator workspace and review office operations.", key: "administration", columns: [] },
  approvals: { title: "Operational Approvals", subtitle: "Daily updates currently awaiting Operations Manager review.", key: "pendingDailyUpdates", columns: ["submitter_name", "role_code", "date", "status", "overall_status"] },
};

const format = (key, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (key.includes("created_at") || key === "date") return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  return String(value).replaceAll("_", " ");
};

export default function OperationsManagerModule({ module }) {
  const cfg = CONFIG[module] || CONFIG.procurement;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setData(await operationsService.getDashboard()); }
    catch (e) { setError(e.response?.data?.message || "Unable to load this operations view."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [module]);

  const rows = useMemo(() => Array.isArray(data?.[cfg.key]) ? data[cfg.key] : [], [data, cfg.key]);

  if (loading) return <div className="omm-page"><div className="omm-state">Loading…</div></div>;
  if (error) return <div className="omm-page"><div className="omm-state omm-error">{error}<button onClick={load}>Retry</button></div></div>;

  if (module === "inventory") {
    const d = data.inventory || {};
    return <div className="omm-page"><Header title={cfg.title} subtitle={cfg.subtitle} />
      <div className="omm-summary-grid">{[["Active Items", d.total_items], ["Low Stock", d.low_stock], ["Out of Stock", d.out_of_stock], ["Pending Receipts", d.pending_receipts], ["Received Today", d.received_today], ["Issued Today", d.issued_today]].map(([l,v])=><div className="omm-summary" key={l}><span>{l}</span><strong>{Number(v||0).toLocaleString("en-IN")}</strong></div>)}</div>
      <section className="omm-card"><h2>Low Stock Items</h2>{(d.low_stock_items||[]).length===0?<p className="omm-empty">No low-stock items reported.</p>:<Table rows={d.low_stock_items} columns={["item_name","total_available_qty","minimum_stock","unit"]}/>}</section>
    </div>;
  }

  if (module === "administration") {
    return <div className="omm-page"><Header title={cfg.title} subtitle={cfg.subtitle} /><div className="omm-admin-callout"><div><h2>Office Administration</h2><p>Administrative transactions are managed by the Office Administrator. Use the dedicated workspace for requests, facilities, supplies, visitors and assets.</p></div><Link to="/office-administrator/dashboard">Open Office Administration <ArrowRight size={16}/></Link></div></div>;
  }

  return <div className="omm-page"><Header title={cfg.title} subtitle={cfg.subtitle} /><section className="omm-card"><div className="omm-card-head"><h2>{rows.length} record{rows.length===1?"":"s"}</h2><button className="omm-refresh" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{rows.length===0?<p className="omm-empty">No records are currently available.</p>:<Table rows={rows.slice(0,100)} columns={cfg.columns}/>}</section></div>;
}

function Header({title,subtitle}){return <header className="omm-header"><div><span>Operations &amp; Administration</span><h1>{title}</h1><p>{subtitle}</p></div><Link to="/operations/manager/dashboard" className="omm-back"><ArrowLeft size={15}/> Dashboard</Link></header>}
function Table({rows,columns}){return <div className="omm-table-wrap"><table className="omm-table"><thead><tr>{columns.map(c=><th key={c}>{c.replaceAll("_"," ")}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={row.id??i}>{columns.map(c=><td key={c}>{format(c,row[c])}</td>)}</tr>)}</tbody></table></div>}
