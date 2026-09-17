// ===== FILE: APP_Vindia/app_vindia/src/pages/Operations/PurchaseOrders/PurchaseOrderDetail.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import "./PurchaseOrderDetail.css";

const PurchaseOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [po, setPo] = useState(null);

  const loadPO = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await procurementService.getPurchaseOrderById(id);
      setPo(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load this purchase order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPO();
  }, [loadPO]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const statusClass = (status) => `pod-badge pod-badge--${status}`;

  if (loading) return <div className="pod-state">Loading…</div>;

  if (error) {
    return (
      <div className="pod-state pod-state--error">
        {error}
        <button onClick={() => navigate("/operations/procurement/purchase-orders")}>
          Back to Purchase Orders
        </button>
      </div>
    );
  }

  return (
    <div className="pod-page">
      <button className="pod-back-btn" onClick={() => navigate("/operations/procurement/purchase-orders")}>
        ← Back to Purchase Orders
      </button>

      <div className="pod-header">
        <div>
          <h1>{po.po_code}</h1>
          <span className={statusClass(po.status)}>{po.status.replace("_", " ")}</span>
        </div>
        <span className="pod-created">Created {formatDate(po.created_at)}</span>
      </div>

      <div className="pod-meta">
        <div className="pod-meta-item">
          <span className="pod-meta-label">Vendor</span>
          <span className="pod-meta-value">{po.vendor_name || "—"}</span>
        </div>
        <div className="pod-meta-item">
          <span className="pod-meta-label">Project</span>
          <span className="pod-meta-value">{po.project_name || "—"}</span>
        </div>
        <div className="pod-meta-item">
          <span className="pod-meta-label">Linked Material Request</span>
          <span className="pod-meta-value">
            {po.material_request_id ? `#${po.material_request_id}` : "—"}
          </span>
        </div>
      </div>

      <div className="pod-items-section">
        <h2>Line Items</h2>
        {!po.items || po.items.length === 0 ? (
          <p className="pod-empty">No line items on this PO.</p>
        ) : (
          <table className="pod-items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Unit</th>
                <th>Ordered Qty</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it, i) => (
                <tr key={it.id || i}>
                  <td>{it.item_name}</td>
                  <td>{it.unit || "—"}</td>
                  <td>{it.ordered_qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetail;