import { useEffect, useState } from "react";
import operationsService from "../../../services/operationsService";
import OpsModal from "./OpsModal";
import ReasonModal from "./ReasonModal";
import StatusBadge from "./StatusBadge";
import { inr, fmtDate, errorText } from "./opsFormat";

/* Read/decide view of one purchase order.
   canDecide: Operations Manager (approve / reject / cancel)
   onChanged: refresh the parent list after a decision */
export default function PurchaseOrderModal({ poId, canDecide = false, onClose, onChanged }) {
  const [po, setPo] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasonFor, setReasonFor] = useState(null); // "reject" | "cancel"

  useEffect(() => {
    let alive = true;
    operationsService.getPurchaseOrder(poId)
      .then((r) => alive && setPo(r.data))
      .catch((e) => alive && setError(errorText(e, "Failed to load purchase order")));
    return () => { alive = false; };
  }, [poId]);

  const approve = async () => {
    setBusy(true); setError("");
    try {
      await operationsService.approvePurchaseOrder(poId);
      onChanged?.(); onClose();
    } catch (e) { setError(errorText(e, "Approval failed")); setBusy(false); }
  };

  const confirmReason = async (reason) => {
    if (reasonFor === "reject") await operationsService.rejectPurchaseOrder(poId, reason);
    else await operationsService.cancelPurchaseOrder(poId, reason);
    onChanged?.(); onClose();
  };

  if (reasonFor) {
    return (
      <ReasonModal
        title={reasonFor === "reject" ? `Reject ${po?.po_code}` : `Cancel ${po?.po_code}`}
        description={reasonFor === "reject"
          ? "Procurement will see this reason and can raise a corrected PO."
          : "The linked material request becomes available for a new PO."}
        confirmText={reasonFor === "reject" ? "Reject PO" : "Cancel PO"}
        onConfirm={confirmReason} onClose={() => setReasonFor(null)}
      />
    );
  }

  const canCancel = canDecide && po && ["pending_approval", "issued"].includes(po.status);

  return (
    <OpsModal wide title={po ? `Purchase order ${po.po_code}` : "Purchase order"} onClose={onClose}
      footer={po && (
        <>
          {canCancel && <button className="ops-btn ops-btn-outline" disabled={busy} onClick={() => setReasonFor("cancel")}>Cancel PO</button>}
          {canDecide && po.status === "pending_approval" && (
            <>
              <button className="ops-btn ops-btn-danger" disabled={busy} onClick={() => setReasonFor("reject")}>Reject</button>
              <button className="ops-btn ops-btn-primary" disabled={busy} onClick={approve}>{busy ? "Approving…" : "Approve & issue"}</button>
            </>
          )}
          {!(canDecide && po.status === "pending_approval") && <button className="ops-btn ops-btn-outline" onClick={onClose}>Close</button>}
        </>
      )}>
      {error && <div className="ops-alert ops-alert-error">{error}</div>}
      {!po && !error && <div className="ops-skeleton" style={{ height: 160 }} />}
      {po && (
        <>
          <dl className="hub-detail">
            <dt>Status</dt><dd><StatusBadge status={po.status} /></dd>
            <dt>Vendor</dt><dd>{po.vendor_name || "—"}</dd>
            <dt>Project</dt><dd>{po.project_name || "—"}</dd>
            <dt>Raised by</dt><dd>{po.created_by_name || "—"} on {fmtDate(po.created_at)}</dd>
            <dt>Expected delivery</dt><dd>{fmtDate(po.expected_delivery_date)}</dd>
            <dt>Payment terms</dt><dd>{po.payment_terms || "—"}</dd>
            <dt>Total</dt><dd className="hub-strong">{inr(po.total_amount)}</dd>
            {po.approved_by_name && (<><dt>Decided by</dt><dd>{po.approved_by_name} on {fmtDate(po.approved_at)}</dd></>)}
            {po.rejection_reason && (<><dt>Rejection reason</dt><dd className="hub-late">{po.rejection_reason}</dd></>)}
            {po.cancelled_reason && (<><dt>Cancel reason</dt><dd>{po.cancelled_reason}</dd></>)}
            {po.remarks && (<><dt>Remarks</dt><dd>{po.remarks}</dd></>)}
          </dl>

          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead><tr><th>Item</th><th>Ordered</th><th>Received</th><th>Unit price</th><th>Line total</th></tr></thead>
              <tbody>
                {po.items.map((it) => {
                  const ordered = Number(it.ordered_qty);
                  const received = Number(it.received_qty || 0);
                  const pct = ordered > 0 ? Math.min(100, Math.round((received / ordered) * 100)) : 0;
                  return (
                    <tr key={it.id}>
                      <td className="hub-strong">{it.item_name}</td>
                      <td>{ordered} {it.unit}</td>
                      <td style={{ minWidth: 120 }}>
                        {received} <span className="ops-muted">({pct}%)</span>
                        <div className="ops-progress-track" style={{ height: 5, marginTop: 4 }}>
                          <div className="hub-bar-fill" style={{ width: `${pct}%`, background: pct >= 100 ? "#10b981" : "#6366f1" }} />
                        </div>
                      </td>
                      <td>{it.unit_price != null ? inr(it.unit_price) : "—"}</td>
                      <td>{it.unit_price != null ? inr(ordered * Number(it.unit_price)) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {po.deliveries?.length > 0 && (
            <>
              <h3 style={{ margin: "4px 0 0", fontSize: 14, color: "#334155" }}>Deliveries</h3>
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead><tr><th>Code</th><th>Status</th><th>Expected</th><th>Delivered</th></tr></thead>
                  <tbody>
                    {po.deliveries.map((d) => (
                      <tr key={d.id}><td className="hub-mono">{d.delivery_code}</td><td><StatusBadge status={d.status} /></td>
                        <td>{fmtDate(d.expected_date)}</td><td>{fmtDate(d.delivery_date)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </OpsModal>
  );
}
