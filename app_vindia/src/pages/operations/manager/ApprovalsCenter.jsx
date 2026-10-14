import { useEffect, useState, useCallback } from "react";
import { FileText, Building2, CheckCircle2, RefreshCw } from "lucide-react";
import operationsService from "../../../services/operationsService";
import officeAdminService from "../../../services/officeAdminService";
import PurchaseOrderModal from "../shared/PurchaseOrderModal";
import ReasonModal from "../shared/ReasonModal";
import StatusBadge from "../shared/StatusBadge";
import { inr, fmtDate, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

export default function ApprovalsCenter() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("purchase_orders");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [poOpen, setPoOpen] = useState(null);
  const [reject, setReject] = useState(null); // { kind, row }
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try { setData((await operationsService.getApprovals()).data); }
    catch (e) { setError(errorText(e, "Failed to load approvals")); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(""), 3500); };

  const approveOffice = async (row) => {
    setBusyId(`or-${row.id}`);
    try { await officeAdminService.updateRequestStatus(row.id, "in_progress"); flash(`${row.request_code} approved.`); await load(); }
    catch (e) { setError(errorText(e, "Approval failed")); }
    finally { setBusyId(null); }
  };

  const confirmReject = async (reason) => {
    await officeAdminService.updateRequestStatus(reject.row.id, "rejected", reason);
    flash("Rejected."); setReject(null); await load();
  };

  const tabs = [
    { v: "purchase_orders", label: "Purchase orders", icon: FileText, n: data?.counts.purchase_orders },
    { v: "office_requests", label: "Office requests", icon: Building2, n: data?.counts.office_requests },
  ];

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <h1 className="ops-title">Approvals</h1>
          <p className="ops-subtitle">{data ? `${data.counts.total} item(s) waiting for a decision` : "Loading…"} · Material requests are approved by the Project Coordinator</p>
        </div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}
      {notice && <div className="ops-alert ops-alert-success">{notice}</div>}

      <div className="ops-card">
        <div className="ops-card-header">
          <div className="ops-tabs">
            {tabs.map((t) => (
              <button key={t.v} className={`ops-tab ${tab === t.v ? "ops-tab-active" : ""}`} onClick={() => setTab(t.v)}>
                <t.icon size={14} /> {t.label} <span className="ops-tab-count">{t.n ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        {!data ? <div style={{ padding: 20 }}><div className="ops-skeleton" style={{ height: 140 }} /></div>
        : data.counts[tab] === 0 ? (
          <div className="ops-empty"><CheckCircle2 size={28} color="#10b981" />All caught up — nothing waiting here.</div>
        ) : tab === "purchase_orders" ? (
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>PO</th><th>Vendor</th><th>Project</th><th>Total</th><th>Raised by</th><th>Raised</th><th /></tr></thead>
            <tbody>{data.purchase_orders.map((p) => (
              <tr key={p.id}>
                <td className="hub-mono hub-strong">{p.po_code}</td><td>{p.vendor_name || "—"}</td><td>{p.project_name || "—"}</td>
                <td className="hub-strong">{inr(p.total_amount)}</td><td>{p.created_by_name || "—"}</td><td>{fmtDate(p.created_at)}</td>
                <td><div className="hub-row-actions"><button className="ops-btn ops-btn-primary ops-btn-sm" onClick={() => setPoOpen(p.id)}>Review</button></div></td>
              </tr>))}</tbody>
          </table></div>
        ) : (
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>Request</th><th>Title</th><th>Category</th><th>Priority</th><th>Estimate</th><th>Requested by</th><th /></tr></thead>
            <tbody>{data.office_requests.map((o) => (
              <tr key={o.id}>
                <td className="hub-mono hub-strong">{o.request_code}</td><td>{o.title}</td>
                <td style={{ textTransform: "capitalize" }}>{String(o.category).replace("_", " ")}</td>
                <td><StatusBadge status={o.priority} /></td><td className="hub-strong">{inr(o.cost_estimate)}</td><td>{o.requested_by_name || "—"}</td>
                <td><div className="hub-row-actions">
                  <button className="ops-btn ops-btn-outline ops-btn-sm" disabled={busyId === `or-${o.id}`} onClick={() => setReject({ row: o })}>Reject</button>
                  <button className="ops-btn ops-btn-primary ops-btn-sm" disabled={busyId === `or-${o.id}`} onClick={() => approveOffice(o)}>Approve</button>
                </div></td></tr>))}</tbody>
          </table></div>
        )}
      </div>

      {poOpen && <PurchaseOrderModal poId={poOpen} canDecide onClose={() => setPoOpen(null)} onChanged={() => { flash("Purchase order updated."); load(); }} />}
      {reject && <ReasonModal title="Reject request" description="The requester is told why, so they can resubmit correctly."
        confirmText="Reject" onConfirm={confirmReject} onClose={() => setReject(null)} />}
    </div>
  );
}
