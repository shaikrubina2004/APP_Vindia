// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/procurement/VendorsView.jsx =====
import { useState, useEffect, useCallback } from "react";
import financeService from "../../../services/financeService";
import "./VendorsView.css";

// Read-only by design: vendors are owned by Finance (vendorController.js /
// vendorModel.js, mounted under /api/finance/vendors). Procurement reuses
// that same data instead of duplicating vendor CRUD — create/edit/delete
// stays on Finance's Vendor Management screen.
const STATUS_OPTIONS = ["all", "active", "inactive"];

const fmtCurrency = (n) =>
  n >= 10000000 ? `₹${(n / 10000000).toFixed(2)}Cr`
  : n >= 100000 ? `₹${(n / 100000).toFixed(1)}L`
  : `₹${Number(n || 0).toLocaleString("en-IN")}`;

const VendorsView = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await financeService.getAllVendors({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setVendors(res.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(loadVendors, 250); // debounce search
    return () => clearTimeout(t);
  }, [loadVendors]);

  if (loading && vendors.length === 0) {
    return <div className="vv-state">Loading vendors…</div>;
  }

  if (error) {
    return (
      <div className="vv-state vv-state--error">
        {error}
        <button onClick={loadVendors}>Retry</button>
      </div>
    );
  }

  return (
    <div className="vv-page">
      <div className="vv-header">
        <div>
          <h1>Vendors</h1>
          <p>Read-only view of the vendor list managed by Finance.</p>
        </div>
        <input
          className="vv-search"
          type="text"
          placeholder="Search by name or category…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="vv-filters">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            className={`vv-filter-btn ${statusFilter === s ? "vv-filter-btn--active" : ""}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {vendors.length === 0 ? (
        <p className="vv-empty">No vendors match this view.</p>
      ) : (
        <table className="vv-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Payment Terms</th>
              <th>Rating</th>
              <th>Total Spent</th>
              <th>Status</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.category || "—"}</td>
                <td>{v.payment_terms || "—"}</td>
                <td>{v.rating != null ? `${v.rating} ★` : "—"}</td>
                <td>{fmtCurrency(v.totalSpent)}</td>
                <td>
                  <span className={`vv-badge vv-badge--${v.status}`}>{v.status}</span>
                </td>
                <td>{v.contact_email || v.contact_phone || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default VendorsView;