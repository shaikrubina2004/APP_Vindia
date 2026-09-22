import React, { useState, useEffect, useMemo, useCallback } from "react";
import financeService from "../../services/financeService";
import "./VendorManagement.css";

const EMPTY_VENDOR = {
  name: "",
  category: "",
  payment_terms: "",
  rating: "",
  contact_email: "",
  contact_phone: "",
};

const formatCurrency = (amount) => {
  const value = Number(amount || 0);

  return `₹${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const VendorManagement = () => {
  /* ── Logged-in user ───────────────────────────────────── */

  const [user] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const normalizedRole = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const isAccountant = normalizedRole === "accountant";

  /* ── Vendor data ──────────────────────────────────────── */

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ── Backend metrics ──────────────────────────────────── */

  const [backendMetrics, setBackendMetrics] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalSpent: 0,
    avgRating: 0,
  });

  /* ── Page state ───────────────────────────────────────── */

  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [newVendor, setNewVendor] = useState(EMPTY_VENDOR);

  /* ── Load vendors ─────────────────────────────────────── */

  const loadVendors = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [vendorsRes, metricsRes] = await Promise.all([
        financeService.getAllVendors(),
        financeService.getVendorMetrics(),
      ]);

      const vendorData =
        vendorsRes?.data?.data ||
        vendorsRes?.data ||
        [];

      const metricsData =
        metricsRes?.data?.data ||
        metricsRes?.data ||
        {};

      setVendors(Array.isArray(vendorData) ? vendorData : []);

      setBackendMetrics({
        totalVendors: Number(metricsData.totalVendors || 0),
        activeVendors: Number(metricsData.activeVendors || 0),
        totalSpent: Number(metricsData.totalSpent || 0),
        avgRating: Number(metricsData.avgRating || 0),
      });
    } catch (err) {
      console.error("Failed to load vendors:", err);

      setError(
        err?.response?.data?.message ||
          "Unable to load vendor records."
      );

      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  /* ── Filter + sort ───────────────────────────────────── */

  const filteredVendors = useMemo(() => {
    let filtered = vendors.filter((vendor) => {
      const query = searchQuery.trim().toLowerCase();

      const name = String(vendor.name || "").toLowerCase();
      const category = String(
        vendor.category || ""
      ).toLowerCase();

      const matchesSearch =
        !query ||
        name.includes(query) ||
        category.includes(query);

      const matchesStatus =
        filterStatus === "all" ||
        String(vendor.status || "").toLowerCase() ===
          filterStatus;

      return matchesSearch && matchesStatus;
    });

    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "spent":
          return (
            Number(b.totalSpent || 0) -
            Number(a.totalSpent || 0)
          );

        case "rating":
          return (
            Number(b.rating || 0) -
            Number(a.rating || 0)
          );

        case "invoices":
          return (
            Number(b.invoices || 0) -
            Number(a.invoices || 0)
          );

        default:
          return String(a.name || "").localeCompare(
            String(b.name || "")
          );
      }
    });

    return filtered;
  }, [
    vendors,
    searchQuery,
    filterStatus,
    sortBy,
  ]);

  /* ── Metrics ──────────────────────────────────────────── */

  const metrics = {
    totalVendors:
      backendMetrics.totalVendors ||
      vendors.length,

    activeVendors:
      backendMetrics.activeVendors ||
      vendors.filter(
        (v) => v.status === "active"
      ).length,

    totalSpent:
      backendMetrics.totalSpent ||
      vendors.reduce(
        (sum, v) =>
          sum + Number(v.totalSpent || 0),
        0
      ),

    avgRating:
      backendMetrics.avgRating ||
      (
        vendors.length > 0
          ? vendors.reduce(
              (sum, v) =>
                sum + Number(v.rating || 0),
              0
            ) / vendors.length
          : 0
      ),
  };

  /* ── Form helpers ─────────────────────────────────────── */

  const resetForm = () => {
    setNewVendor(EMPTY_VENDOR);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleVendorChange = (field, value) => {
    setNewVendor((current) => ({
      ...current,
      [field]: value,
    }));
  };

  /* ── Add / Edit vendor ────────────────────────────────── */

  const handleAddVendor = async () => {
    if (!newVendor.name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        name: newVendor.name.trim(),
        category: newVendor.category.trim() || null,
        payment_terms:
          newVendor.payment_terms.trim() || null,
        rating:
          newVendor.rating === ""
            ? undefined
            : Number(newVendor.rating),
        contact_email:
          newVendor.contact_email.trim() || null,
        contact_phone:
          newVendor.contact_phone.trim() || null,
      };

      if (editingId) {
        await financeService.updateVendor(
          editingId,
          payload
        );
      } else {
        await financeService.createVendor(payload);
      }

      resetForm();
      await loadVendors();
    } catch (err) {
      console.error(
        "Failed to save vendor:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to save vendor."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ── Edit vendor ──────────────────────────────────────── */

  const handleEditVendor = (vendor) => {
    setError("");

    setNewVendor({
      name: vendor.name || "",
      category: vendor.category || "",
      payment_terms:
        vendor.payment_terms ||
        vendor.paymentTerms ||
        "",
      rating:
        vendor.rating !== null &&
        vendor.rating !== undefined
          ? String(vendor.rating)
          : "",
      contact_email:
        vendor.contact_email || "",
      contact_phone:
        vendor.contact_phone || "",
    });

    setEditingId(vendor.id);
    setShowAddForm(true);
  };

  /* ── Delete vendor ────────────────────────────────────── */

  const handleDeleteVendor = async (id) => {
    /*
     * Accountant cannot delete vendors.
     * Backend also enforces this permission.
     */
    if (isAccountant) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this vendor? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await financeService.deleteVendor(id);

      await loadVendors();
    } catch (err) {
      console.error(
        "Failed to delete vendor:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to delete vendor."
      );
    }
  };

  /* ── Activate / Deactivate ───────────────────────────── */

  const toggleVendorStatus = async (id) => {
    try {
      setError("");

      await financeService.toggleVendorStatus(id);

      await loadVendors();
    } catch (err) {
      console.error(
        "Failed to toggle vendor status:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to update vendor status."
      );
    }
  };

  /* ── Start new vendor ─────────────────────────────────── */

  const handleStartAdd = () => {
    setError("");

    if (showAddForm && !editingId) {
      resetForm();
      return;
    }

    setEditingId(null);
    setNewVendor(EMPTY_VENDOR);
    setShowAddForm(true);
  };

  /* ── Cancel form ─────────────────────────────────────── */

  const handleCancelForm = () => {
    resetForm();
    setError("");
  };

  /* ── Loading state ────────────────────────────────────── */

  if (loading) {
    return (
      <div className="vendor-management">
        <div className="vendor-container">
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Loading vendor records…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-management">
      <div className="vendor-container">

        {/* ═════════ HEADER ═════════ */}

        <div className="vendor-header">
          <div>
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "12px",
                color: "#6b7280",
                fontWeight: 600,
              }}
            >
              {isAccountant
                ? "Finance Operations"
                : "Finance Manager"}
            </p>

            <h1 className="vendor-title">
              Vendor Management
            </h1>

            <p className="vendor-subtitle">
              {isAccountant
                ? "Maintain vendor records, payment terms and status"
                : "Manage and monitor all vendor relationships and performance"}
            </p>
          </div>
        </div>

        {/* ═════════ ERROR ═════════ */}

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* ═════════ ACCOUNTANT INFO ═════════ */}

        {isAccountant && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1e40af",
              fontSize: "13px",
            }}
          >
            Accountant view: you can create, edit
            and activate/deactivate vendor records.
            Vendor deletion is restricted to Finance
            Manager / CEO.
          </div>
        )}

        {/* ═════════ METRICS ═════════ */}

        <div className="metrics-grid">

          <div className="metric-card">
            <p className="metric-label">
              Total vendors
            </p>

            <p className="metric-value">
              {metrics.totalVendors}
            </p>
          </div>

          <div className="metric-card">
            <p className="metric-label">
              Active vendors
            </p>

            <p className="metric-value metric-success">
              {metrics.activeVendors}
            </p>
          </div>

          <div className="metric-card">
            <p className="metric-label">
              Total spent
            </p>

            <p className="metric-value">
              {formatCurrency(metrics.totalSpent)}
            </p>
          </div>

          <div className="metric-card">
            <p className="metric-label">
              Avg rating
            </p>

            <p className="metric-value">
              <span className="rating-badge">
                {Number(
                  metrics.avgRating || 0
                ).toFixed(1)}
              </span>
            </p>
          </div>

        </div>

        {/* ═════════ CONTROLS ═════════ */}

        <div className="controls-bar">

          <div className="search-container">
            <i className="ti ti-search search-icon"></i>

            <input
              type="text"
              className="search-input"
              placeholder="Search vendors by name or category..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value)
            }
            className="filter-select"
          >
            <option value="all">
              All status
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value)
            }
            className="sort-select"
          >
            <option value="name">
              Sort by name
            </option>

            <option value="spent">
              Sort by spent
            </option>

            <option value="rating">
              Sort by rating
            </option>

            <option value="invoices">
              Sort by invoices
            </option>
          </select>

          <button
            className="add-button"
            onClick={handleStartAdd}
          >
            <i className="ti ti-plus"></i>
            Add vendor
          </button>

        </div>

        {/* ═════════ ADD / EDIT FORM ═════════ */}

        {showAddForm && (
          <div className="add-vendor-form">

            <h3>
              {editingId
                ? "Edit vendor"
                : isAccountant
                ? "Add vendor record"
                : "Add new vendor"}
            </h3>

            <div className="form-grid">

              <input
                type="text"
                className="form-input"
                placeholder="Vendor name *"
                value={newVendor.name}
                onChange={(e) =>
                  handleVendorChange(
                    "name",
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                className="form-input"
                placeholder="Category"
                value={newVendor.category}
                onChange={(e) =>
                  handleVendorChange(
                    "category",
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                className="form-input"
                placeholder="Payment terms"
                value={
                  newVendor.payment_terms
                }
                onChange={(e) =>
                  handleVendorChange(
                    "payment_terms",
                    e.target.value
                  )
                }
              />

              <input
                type="number"
                className="form-input"
                placeholder="Rating (0-5)"
                min="0"
                max="5"
                step="0.1"
                value={newVendor.rating}
                onChange={(e) =>
                  handleVendorChange(
                    "rating",
                    e.target.value
                  )
                }
              />

              <input
                type="email"
                className="form-input"
                placeholder="Contact email"
                value={
                  newVendor.contact_email
                }
                onChange={(e) =>
                  handleVendorChange(
                    "contact_email",
                    e.target.value
                  )
                }
              />

              <input
                type="text"
                className="form-input"
                placeholder="Contact phone"
                value={
                  newVendor.contact_phone
                }
                onChange={(e) =>
                  handleVendorChange(
                    "contact_phone",
                    e.target.value
                  )
                }
              />

            </div>

            <div className="form-actions">

              <button
                className="btn-primary"
                onClick={handleAddVendor}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update vendor"
                  : "Add vendor"}
              </button>

              <button
                className="btn-secondary"
                onClick={handleCancelForm}
                disabled={saving}
              >
                Cancel
              </button>

            </div>

          </div>
        )}

        {/* ═════════ VENDOR TABLE ═════════ */}

        {filteredVendors.length > 0 ? (
          <div className="vendors-table-container">

            <table className="vendors-table">

              <thead>
                <tr>
                  <th>
                    Vendor name
                  </th>

                  <th>
                    Category
                  </th>

                  <th>
                    Payment terms
                  </th>

                  <th>
                    Rating
                  </th>

                  <th>
                    Total spent
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>

                {filteredVendors.map(
                  (vendor) => (
                    <tr
                      key={vendor.id}
                      className="vendor-row"
                    >

                      <td className="vendor-name-cell">

                        <div className="vendor-name">
                          {vendor.name}
                        </div>

                        <div className="vendor-meta">
                          {Number(
                            vendor.invoices || 0
                          )}{" "}
                          invoice
                          {Number(
                            vendor.invoices || 0
                          ) !== 1
                            ? "s"
                            : ""}
                        </div>

                      </td>

                      <td className="vendor-category">
                        {vendor.category ||
                          "—"}
                      </td>

                      <td className="vendor-terms">
                        {vendor.payment_terms ||
                          vendor.paymentTerms ||
                          "—"}
                      </td>

                      <td className="vendor-rating">

                        <span className="rating-pill">
                          {Number(
                            vendor.rating || 0
                          ).toFixed(1)}
                        </span>

                      </td>

                      <td className="vendor-spent">
                        {formatCurrency(vendor.totalSpent)}
                      </td>

                      <td className="vendor-status">

                        <span
                          className={`status-badge ${
                            vendor.status
                          }`}
                        >
                          {vendor.status ===
                          "active"
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>

                      <td className="vendor-actions">

                        {/* Edit — Accountant allowed */}

                        <button
                          className="action-btn edit-btn"
                          onClick={() =>
                            handleEditVendor(
                              vendor
                            )
                          }
                          title="Edit vendor"
                          disabled={saving}
                        >
                          <i className="ti ti-edit"></i>
                        </button>

                        {/* Activate / deactivate — Accountant allowed */}

                        <button
                          className="action-btn toggle-btn"
                          onClick={() =>
                            toggleVendorStatus(
                              vendor.id
                            )
                          }
                          title={`Toggle to ${
                            vendor.status ===
                            "active"
                              ? "inactive"
                              : "active"
                          }`}
                          disabled={saving}
                        >
                          <i
                            className={`ti ${
                              vendor.status ===
                              "active"
                                ? "ti-circle-check"
                                : "ti-circle"
                            }`}
                          ></i>
                        </button>

                        {/* Delete — Accountant NOT allowed */}

                        {!isAccountant && (
                          <button
                            className="action-btn delete-btn"
                            onClick={() =>
                              handleDeleteVendor(
                                vendor.id
                              )
                            }
                            title="Delete vendor"
                            disabled={saving}
                          >
                            <i className="ti ti-trash"></i>
                          </button>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>
        ) : (
          <div className="empty-state">

            <i className="ti ti-inbox"></i>

            <p>
              {searchQuery ||
              filterStatus !== "all"
                ? "No vendors found matching your search"
                : "No vendor records available"}
            </p>

          </div>
        )}

        {/* ═════════ RESULT SUMMARY ═════════ */}

        <div className="results-summary">
          Showing{" "}
          {filteredVendors.length}{" "}
          of{" "}
          {vendors.length}{" "}
          vendors
        </div>

      </div>
    </div>
  );
};

export default VendorManagement;