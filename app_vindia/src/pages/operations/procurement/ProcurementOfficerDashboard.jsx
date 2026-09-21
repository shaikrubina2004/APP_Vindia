// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/procurement/ProcurementOfficerDashboard.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import CheckInButton from "../../../SharedResourse/CheckInButton";
import "./ProcurementOfficerDashboard.css";

const ProcurementOfficerDashboard = () => {
  const navigate = useNavigate();

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const employeeId = user?.employee_id || user?.employeeId || user?.id || null;
  const designation = user?.designation || user?.role || null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // procurementController returns raw arrays (res.status(200).json(rows)),
      // not the { data: [...] } wrapper financeService's endpoints use —
      // so this reads res.data directly.
      const [reqRes, poRes] = await Promise.all([
        procurementService.getApprovedRequests(),
        procurementService.getAllPurchaseOrders(),
      ]);
      setApprovedRequests(reqRes.data);
      setPurchaseOrders(poRes.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load procurement dashboard"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const pendingCount = approvedRequests.length;
  const issuedCount = purchaseOrders.filter((po) => po.status === "issued").length;
  const partialCount = purchaseOrders.filter((po) => po.status === "partially_fulfilled").length;
  const fulfilledCount = purchaseOrders.filter((po) => po.status === "fulfilled").length;

  const recentPOs = purchaseOrders.slice(0, 5);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const statusClass = (status) => `po-badge po-badge--${status}`;

  if (loading) {
    return <div className="proc-dash-state">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="proc-dash-state proc-dash-state--error">
        {error}
        <button onClick={loadAll}>Retry</button>
      </div>
    );
  }

  return (
    <div className="proc-dash">
      <div className="proc-dash-header">
        <div>
          <h1>Procurement Dashboard</h1>
          <p>Overview of material requests waiting on a PO and current purchase orders.</p>
        </div>
        {employeeId && (
          <CheckInButton employeeId={employeeId} designation={designation} />
        )}
      </div>

      <div className="proc-dash-metrics">
        <div
          className="proc-metric-card proc-metric-card--clickable"
          onClick={() => navigate("/operations/procurement/purchase-requests")}
        >
          <span className="proc-metric-label">Approved Requests Awaiting PO</span>
          <span className="proc-metric-value">{pendingCount}</span>
        </div>

        <div
          className="proc-metric-card proc-metric-card--clickable"
          onClick={() => navigate("/operations/procurement/purchase-orders")}
        >
          <span className="proc-metric-label">Issued POs</span>
          <span className="proc-metric-value">{issuedCount}</span>
        </div>

        <div className="proc-metric-card">
          <span className="proc-metric-label">Partially Fulfilled</span>
          <span className="proc-metric-value">{partialCount}</span>
        </div>

        <div className="proc-metric-card">
          <span className="proc-metric-label">Fulfilled</span>
          <span className="proc-metric-value">{fulfilledCount}</span>
        </div>
      </div>

      <div className="proc-dash-section">
        <div className="proc-dash-section-header">
          <h2>Recent Purchase Orders</h2>
          <button
            className="proc-link-btn"
            onClick={() => navigate("/operations/procurement/purchase-orders")}
          >
            View all
          </button>
        </div>

        {recentPOs.length === 0 ? (
          <p className="proc-empty">No purchase orders yet.</p>
        ) : (
          <table className="proc-table">
            <thead>
              <tr>
                <th>PO Code</th>
                <th>Vendor</th>
                <th>Project</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {recentPOs.map((po) => (
                <tr
                  key={po.id}
                  onClick={() => navigate(`/operations/procurement/purchase-orders/${po.id}`)}
                >
                  <td>{po.po_code}</td>
                  <td>{po.vendor_name || "—"}</td>
                  <td>{po.project_name || "—"}</td>
                  <td>
                    <span className={statusClass(po.status)}>{po.status}</span>
                  </td>
                  <td>{formatDate(po.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProcurementOfficerDashboard;