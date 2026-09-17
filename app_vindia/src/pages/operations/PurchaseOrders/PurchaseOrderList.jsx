// ===== FILE: APP_Vindia/app_vindia/src/pages/Operations/PurchaseOrders/PurchaseOrderList.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import "./PurchaseOrderList.css";

const STATUS_OPTIONS = ["all", "issued", "partially_fulfilled", "fulfilled", "cancelled"];

const PurchaseOrderList = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadPOs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await procurementService.getAllPurchaseOrders(
        statusFilter === "all" ? {} : { status: statusFilter }
      );
      setPurchaseOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPOs();
  }, [loadPOs]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const statusClass = (status) => `pol-badge pol-badge--${status}`;

  const filteredPOs = purchaseOrders.filter((po) => {
    const term = searchTerm.toLowerCase();
    return (
      (po.po_code || "").toLowerCase().includes(term) ||
      (po.vendor_name || "").toLowerCase().includes(term) ||
      (po.project_name || "").toLowerCase().includes(term)
    );
  });

  if (loading) return <div className="pol-state">Loading purchase orders…</div>;

  if (error) {
    return (
      <div className="pol-state pol-state--error">
        {error}
        <button onClick={loadPOs}>Retry</button>
      </div>
    );
  }

  return (
    <div className="pol-page">
      <div className="pol-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>All POs issued to vendors, with fulfillment status.</p>
        </div>
        <input
          className="pol-search"
          type="text"
          placeholder="Search by PO code, vendor, or project…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="pol-filters">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`pol-filter-btn ${statusFilter === s ? "pol-filter-btn--active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {filteredPOs.length === 0 ? (
        <p className="pol-empty">No purchase orders match this view.</p>
      ) : (
        <table className="pol-table">
          <thead>
            <tr>
              <th>PO Code</th>
              <th>Vendor</th>
              <th>Project</th>
              <th>Items</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filteredPOs.map((po) => (
              <tr
                key={po.id}
                onClick={() => navigate(`/operations/procurement/purchase-orders/${po.id}`)}
              >
                <td>{po.po_code}</td>
                <td>{po.vendor_name || "—"}</td>
                <td>{po.project_name || "—"}</td>
                <td>{Array.isArray(po.items) ? po.items.length : 0}</td>
                <td>
                  <span className={statusClass(po.status)}>
                    {po.status.replace("_", " ")}
                  </span>
                </td>
                <td>{formatDate(po.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default PurchaseOrderList;