// ===== FILE: APP_Vindia/app_vindia/src/pages/Operations/MaterialRequests/ApprovedRequests.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import "./ApprovedRequests.css";

const ApprovedRequests = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requests, setRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await procurementService.getApprovedRequests();
      setRequests(res.data);
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load approved material requests"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "—";

  const itemCount = (items) => {
    if (!items) return 0;
    const parsed = typeof items === "string" ? JSON.parse(items) : items;
    return Array.isArray(parsed) ? parsed.length : 0;
  };

  const filteredRequests = requests.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      (r.project || "").toLowerCase().includes(term) ||
      (r.zone || "").toLowerCase().includes(term) ||
      (r.purpose || "").toLowerCase().includes(term)
    );
  });

  if (loading) {
    return <div className="ar-state">Loading approved requests…</div>;
  }

  if (error) {
    return (
      <div className="ar-state ar-state--error">
        {error}
        <button onClick={loadRequests}>Retry</button>
      </div>
    );
  }

  return (
    <div className="ar-page">
      <div className="ar-header">
        <div>
          <h1>Approved Material Requests</h1>
          <p>Requests approved by the Project Manager, waiting on a Purchase Order.</p>
        </div>
        <input
          className="ar-search"
          type="text"
          placeholder="Search by project, zone, or purpose…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredRequests.length === 0 ? (
        <p className="ar-empty">
          {requests.length === 0
            ? "No approved requests are waiting on a PO right now."
            : "No requests match your search."}
        </p>
      ) : (
        <table className="ar-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Zone</th>
              <th>Purpose</th>
              <th>Items</th>
              <th>Required By</th>
              <th>Requested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((r) => (
              <tr key={r.id}>
                <td>{r.project || "—"}</td>
                <td>{r.zone || "—"}</td>
                <td>{r.purpose || "—"}</td>
                <td>{itemCount(r.items)}</td>
                <td>{formatDate(r.required_by)}</td>
                <td>{formatDate(r.created_at)}</td>
                <td>
                  <button
                    className="ar-create-po-btn"
                    onClick={() =>
                      navigate(`/operations/procurement/purchase-orders/create/${r.id}`)
                    }
                  >
                    Create PO
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ApprovedRequests;