import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, ClipboardList, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import StatusBadge from "../shared/StatusBadge";
import OpsModal from "../shared/OpsModal";
import ReasonModal from "../shared/ReasonModal";
import { fmtDate, parseItems, isOverdue, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const TABS = ["all", "requested", "approved", "delivered", "rejected"];

export default function MaterialRequestsOverview() {
  const [rows, setRows] = useState([]);
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(null);
  const [reject, setReject] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const r = await operationsService.getMaterialRequests(); setRows(Array.isArray(r.data) ? r.data : []); }
    catch (e) { setError(errorText(e, "Failed to load material requests")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((r) =>
    (tab === "all" || r.status === tab) &&
    (!q || `${r.project} ${r.zone} ${r.purpose} ${r.requested_by_name}`.toLowerCase().includes(q.toLowerCase()))), [rows, tab, q]);

  const approve = async (r) => {
    try { await operationsService.decideMaterialRequest(r.id, "approved"); setOpen(null); await load(); }
    catch (e) { setError(errorText(e, "Approval failed")); }
  };

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div><h1 className="ops-title">Material Requests</h1><p className="ops-subtitle">Every site request, from request to delivery</p></div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}

      <div className="ops-card">
        <div className="ops-card-header hub-toolbar">
          <div className="ops-tabs">
            {TABS.map((t) => (
              <button key={t} className={`ops-tab ${tab === t ? "ops-tab-active" : ""}`} onClick={() => setTab(t)} style={{ textTransform: "capitalize" }}>
                {t} <span className="ops-tab-count">{t === "all" ? rows.length : rows.filter((r) => r.status === t).length}</span>
              </button>
            ))}
          </div>
          <div className="hub-search"><Search size={15} />
            <input className="ops-input" placeholder="Search project, purpose, engineer" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        </div>
        {loading ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 160 }} /></div>
        : filtered.length === 0 ? <div className="ops-empty"><ClipboardList size={28} />No requests match.</div>
        : (<div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Project</th><th>Purpose</th><th>Requested by</th><th>Required by</th><th>Delivered</th><th>Status</th></tr></thead>
          <tbody>{filtered.map((r) => {
            const total = Number(r.total_qty || 0), done = Number(r.delivered_qty || 0);
            const late = ["requested", "approved"].includes(r.status) && isOverdue(r.required_by);
            return (<tr key={r.id} className="hub-clickable" onClick={() => setOpen(r)}>
              <td className="hub-strong">{r.project || "—"}{r.zone ? <><br /><span className="ops-muted">{r.zone}</span></> : null}</td>
              <td>{r.purpose || "—"}</td><td>{r.requested_by_name || "—"}</td>
              <td className={late ? "hub-late" : ""}>{fmtDate(r.required_by)}{late ? " · overdue" : ""}</td>
              <td style={{ minWidth: 110 }}>{done}/{total}<div className="ops-progress-track" style={{ height: 5, marginTop: 4 }}>
                <div className="hub-bar-fill" style={{ width: `${total ? Math.min(100, (done / total) * 100) : 0}%` }} /></div></td>
              <td><StatusBadge status={r.status} /></td></tr>);
          })}</tbody></table></div>)}
      </div>

      {open && !reject && (
        <OpsModal wide title={`Request — ${open.project || ""}`} onClose={() => setOpen(null)}
          footer={<>
            {open.status === "requested" && <>
              <button className="ops-btn ops-btn-danger" onClick={() => setReject(open)}>Reject</button>
              <button className="ops-btn ops-btn-primary" onClick={() => approve(open)}>Approve</button></>}
            {open.status !== "requested" && <button className="ops-btn ops-btn-outline" onClick={() => setOpen(null)}>Close</button>}
          </>}>
          <dl className="hub-detail">
            <dt>Status</dt><dd><StatusBadge status={open.status} /></dd>
            <dt>Zone</dt><dd>{open.zone || "—"}</dd><dt>Purpose</dt><dd>{open.purpose || "—"}</dd>
            <dt>Requested by</dt><dd>{open.requested_by_name || "—"} on {fmtDate(open.created_at)}</dd>
            <dt>Required by</dt><dd>{fmtDate(open.required_by)}</dd>
            {open.notes && <><dt>Notes</dt><dd>{open.notes}</dd></>}
            {open.rejection_reason && <><dt>Rejection reason</dt><dd className="hub-late">{open.rejection_reason}</dd></>}
          </dl>
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>Item</th><th>Quantity</th><th>Unit</th></tr></thead>
            <tbody>{parseItems(open.items).map((i, k) => (<tr key={k}><td className="hub-strong">{i.name || i.item_name}</td><td>{i.qty}</td><td>{i.unit || "—"}</td></tr>))}</tbody>
          </table></div>
        </OpsModal>)}
      {reject && <ReasonModal title="Reject request" confirmText="Reject"
        onConfirm={async (reason) => { await operationsService.decideMaterialRequest(reject.id, "rejected", reason); setReject(null); setOpen(null); await load(); }}
        onClose={() => setReject(null)} />}
    </div>
  );
}
