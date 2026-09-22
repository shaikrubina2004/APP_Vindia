import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import accountantService from "../../services/accountantService";
import "./AccountantVendors.css";

const EMPTY_VENDOR = {
  name: "",
  category: "",
  payment_terms: "",
  rating: "",
  contact_email: "",
  contact_phone: "",
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatRating = (value) => {
  const rating = Number(value || 0);
  return rating > 0 ? rating.toFixed(1) : "—";
};

const normalize = (value) => String(value ?? "").trim().toLowerCase();

function MetricCard({ label, value, helper, accent }) {
  return (
    <div className={`av-metric av-metric-${accent}`}>
      <div className="av-metric-label">{label}</div>
      <div className="av-metric-value">{value}</div>
      <div className="av-metric-helper">{helper}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const safeStatus = normalize(status) || "unknown";
  const label = safeStatus.charAt(0).toUpperCase() + safeStatus.slice(1);
  return <span className={`av-status av-status-${safeStatus}`}>{label}</span>;
}

export default function AccountantVendors() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState([]);
  const [metrics, setMetrics] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalSpent: 0,
    avgRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [form, setForm] = useState(EMPTY_VENDOR);
  const [mode, setMode] = useState("create");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [vendorsRes, metricsRes] = await Promise.all([
        accountantService.getVendors(),
        accountantService.getVendorMetrics(),
      ]);

      const vendorRows = vendorsRes?.data?.data ?? [];
      const metricData = metricsRes?.data?.data ?? {};

      setVendors(Array.isArray(vendorRows) ? vendorRows : []);
      setMetrics({
        totalVendors: Number(metricData.totalVendors || 0),
        activeVendors: Number(metricData.activeVendors || 0),
        totalSpent: Number(metricData.totalSpent || 0),
        avgRating: Number(metricData.avgRating || 0),
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to load vendor records.");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleVendors = useMemo(() => {
    const query = normalize(search);
    const rows = vendors.filter((vendor) => {
      const matchesSearch =
        !query ||
        normalize(vendor.name).includes(query) ||
        normalize(vendor.category).includes(query) ||
        normalize(vendor.contact_email).includes(query) ||
        normalize(vendor.contact_phone).includes(query);

      const matchesStatus =
        statusFilter === "all" || normalize(vendor.status) === statusFilter;

      return matchesSearch && matchesStatus;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "spent") {
        return Number(b.totalSpent || 0) - Number(a.totalSpent || 0);
      }
      if (sortBy === "rating") {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortBy === "transactions") {
        return Number(b.invoices || 0) - Number(a.invoices || 0);
      }
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [vendors, search, statusFilter, sortBy]);

  const resetForm = () => {
    setForm(EMPTY_VENDOR);
    setSelectedVendor(null);
    setDrawerOpen(false);
    setMode("create");
  };

  const openCreate = () => {
    setError("");
    setNotice("");
    setMode("create");
    setSelectedVendor(null);
    setForm(EMPTY_VENDOR);
    setDrawerOpen(true);
  };

  const openEdit = (vendor) => {
    setError("");
    setNotice("");
    setMode("edit");
    setSelectedVendor(vendor);
    setForm({
      name: vendor.name || "",
      category: vendor.category || "",
      payment_terms: vendor.payment_terms || "",
      rating: vendor.rating ?? "",
      contact_email: vendor.contact_email || "",
      contact_phone: vendor.contact_phone || "",
    });
    setDrawerOpen(true);
  };

  const openView = (vendor) => {
    setSelectedVendor(vendor);
    setMode("view");
    setForm({
      name: vendor.name || "",
      category: vendor.category || "",
      payment_terms: vendor.payment_terms || "",
      rating: vendor.rating ?? "",
      contact_email: vendor.contact_email || "",
      contact_phone: vendor.contact_phone || "",
    });
    setDrawerOpen(true);
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const saveVendor = async (event) => {
    event.preventDefault();

    const name = form.name.trim();
    const category = form.category.trim();

    if (!name || !category) {
      setError("Vendor name and category are required.");
      return;
    }

    if (form.rating !== "") {
      const rating = Number(form.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        setError("Rating must be between 0 and 5.");
        return;
      }
    }

    const payload = {
      name,
      category,
      payment_terms: form.payment_terms.trim() || null,
      rating: form.rating === "" ? undefined : Number(form.rating),
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
    };

    try {
      setSaving(true);
      setError("");

      if (mode === "edit" && selectedVendor?.id) {
        await accountantService.updateVendor(selectedVendor.id, payload);
        setNotice("Vendor details updated successfully.");
      } else {
        await accountantService.createVendor(payload);
        setNotice("Vendor added successfully.");
      }

      setDrawerOpen(false);
      setSelectedVendor(null);
      setForm(EMPTY_VENDOR);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to save vendor details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-page">
      <div className="av-container">
        <header className="av-header">
          <div>
            <div className="av-eyebrow">VENDOR MANAGEMENT</div>
            <h1>Vendors</h1>
            <p>
              Maintain supplier records, review vendor spend and keep contact
              information ready for accounting operations.
            </p>
          </div>
          <div className="av-header-actions">
            <button className="av-btn av-btn-light" onClick={() => loadData()} disabled={loading}>
              {loading ? "Refreshing…" : "↻ Refresh"}
            </button>
            <button className="av-btn av-btn-primary" onClick={openCreate}>
              + Add Vendor
            </button>
          </div>
        </header>

        {error && <div className="av-alert av-alert-error">{error}</div>}
        {notice && <div className="av-alert av-alert-success">{notice}</div>}

        <section className="av-metrics" aria-label="Vendor summary">
          <MetricCard
            label="Total Vendors"
            value={metrics.totalVendors}
            helper="Company-wide vendor records"
            accent="blue"
          />
          <MetricCard
            label="Active Vendors"
            value={metrics.activeVendors}
            helper="Currently active supplier records"
            accent="green"
          />
          <MetricCard
            label="Total Vendor Spend"
            value={formatCurrency(metrics.totalSpent)}
            helper="Expense value linked to vendors"
            accent="amber"
          />
          <MetricCard
            label="Average Rating"
            value={metrics.avgRating ? `${formatRating(metrics.avgRating)} / 5` : "—"}
            helper="Average vendor rating"
            accent="purple"
          />
        </section>

        <section className="av-panel av-panel-register">
          <div className="av-panel-header">
            <div>
              <div className="av-section-label">SUPPLIER REGISTER</div>
              <h2>Vendor Directory</h2>
              <p>{visibleVendors.length} visible vendor records</p>
            </div>
            <button className="av-link-button" onClick={() => navigate("/accountant/expenses")}>
              View vendor expenses →
            </button>
          </div>

          <div className="av-filters">
            <div className="av-search-wrap">
              <span className="av-search-icon">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, category, email or phone"
                className="av-input av-search"
              />
            </div>
            <select
              className="av-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select className="av-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="spent">Sort: Spend</option>
              <option value="rating">Sort: Rating</option>
              <option value="transactions">Sort: Transactions</option>
            </select>
          </div>

          <div className="av-table-wrap">
            <table className="av-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Category</th>
                  <th>Contact</th>
                  <th>Payment Terms</th>
                  <th>Rating</th>
                  <th>Spend</th>
                  <th>Status</th>
                  <th className="av-align-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="av-empty">Loading vendor records…</td>
                  </tr>
                ) : visibleVendors.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="av-empty">
                      <strong>No matching vendors</strong>
                      <span>Try changing the search or status filter.</span>
                    </td>
                  </tr>
                ) : (
                  visibleVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td>
                        <button className="av-name-button" onClick={() => openView(vendor)}>
                          <span className="av-avatar">
                            {String(vendor.name || "V").trim().charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{vendor.name || "Unnamed Vendor"}</strong>
                            <small>Vendor #{vendor.id}</small>
                          </span>
                        </button>
                      </td>
                      <td>{vendor.category || "—"}</td>
                      <td>
                        <div className="av-contact">
                          <span>{vendor.contact_email || "No email"}</span>
                          <small>{vendor.contact_phone || "No phone"}</small>
                        </div>
                      </td>
                      <td>{vendor.payment_terms || "—"}</td>
                      <td>
                        <span className="av-rating">★ {formatRating(vendor.rating)}</span>
                      </td>
                      <td className="av-money">{formatCurrency(vendor.totalSpent)}</td>
                      <td><StatusBadge status={vendor.status} /></td>
                      <td className="av-align-right">
                        <div className="av-row-actions">
                          <button className="av-row-button" onClick={() => openView(vendor)}>View</button>
                          <button className="av-row-button av-row-button-primary" onClick={() => openEdit(vendor)}>
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="av-footnote">
          <strong>Accountant access:</strong> vendor records can be viewed, created and edited here.
          Vendor activation/deactivation is intentionally controlled outside this page by the
          Finance Manager workflow.
        </div>
      </div>

      {drawerOpen && (
        <div className="av-overlay" onMouseDown={resetForm}>
          <aside className="av-drawer" onMouseDown={(e) => e.stopPropagation()}>
            <div className="av-drawer-header">
              <div>
                <div className="av-section-label">
                  {mode === "view" ? "VENDOR PROFILE" : mode === "edit" ? "EDIT VENDOR" : "NEW VENDOR"}
                </div>
                <h2>{mode === "view" ? selectedVendor?.name : mode === "edit" ? "Edit Vendor" : "Add Vendor"}</h2>
              </div>
              <button className="av-close" onClick={resetForm} aria-label="Close">×</button>
            </div>

            {mode === "view" ? (
              <div className="av-detail-content">
                <div className="av-profile-card">
                  <div className="av-profile-avatar">
                    {String(selectedVendor?.name || "V").trim().charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3>{selectedVendor?.name || "Unnamed Vendor"}</h3>
                    <p>{selectedVendor?.category || "No category"}</p>
                    <StatusBadge status={selectedVendor?.status} />
                  </div>
                </div>

                <div className="av-detail-grid">
                  <div><span>Rating</span><strong>★ {formatRating(selectedVendor?.rating)}</strong></div>
                  <div><span>Total Spend</span><strong>{formatCurrency(selectedVendor?.totalSpent)}</strong></div>
                  <div><span>Expense Transactions</span><strong>{Number(selectedVendor?.invoices || 0)}</strong></div>
                  <div><span>Payment Terms</span><strong>{selectedVendor?.payment_terms || "—"}</strong></div>
                  <div><span>Email</span><strong>{selectedVendor?.contact_email || "—"}</strong></div>
                  <div><span>Phone</span><strong>{selectedVendor?.contact_phone || "—"}</strong></div>
                </div>

                <div className="av-info-card">
                  <strong>Accountant workflow</strong>
                  <p>Vendor details can be maintained here. Activation and deactivation are not exposed to the Accountant.</p>
                </div>

                <div className="av-drawer-actions">
                  <button className="av-btn av-btn-light" onClick={resetForm}>Close</button>
                  <button className="av-btn av-btn-primary" onClick={() => openEdit(selectedVendor)}>Edit Details</button>
                </div>
              </div>
            ) : (
              <form className="av-form" onSubmit={saveVendor}>
                <div className="av-form-intro">
                  Add only supplier information maintained by the accounting team. Status is managed separately.
                </div>

                <label>
                  Vendor Name <span>*</span>
                  <input className="av-input" value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. ABC Electricals" autoFocus />
                </label>

                <label>
                  Category <span>*</span>
                  <input className="av-input" value={form.category} onChange={(e) => updateField("category", e.target.value)} placeholder="e.g. Materials, Subcontractor" />
                </label>

                <div className="av-form-grid">
                  <label>
                    Payment Terms
                    <input className="av-input" value={form.payment_terms} onChange={(e) => updateField("payment_terms", e.target.value)} placeholder="e.g. Net 30" />
                  </label>
                  <label>
                    Rating
                    <input className="av-input" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(e) => updateField("rating", e.target.value)} placeholder="0 - 5" />
                  </label>
                </div>

                <div className="av-form-grid">
                  <label>
                    Contact Email
                    <input className="av-input" type="email" value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} placeholder="vendor@example.com" />
                  </label>
                  <label>
                    Contact Phone
                    <input className="av-input" value={form.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} placeholder="+91 …" />
                  </label>
                </div>

                <div className="av-drawer-actions">
                  <button type="button" className="av-btn av-btn-light" onClick={resetForm}>Cancel</button>
                  <button type="submit" className="av-btn av-btn-primary" disabled={saving}>
                    {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Vendor"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
