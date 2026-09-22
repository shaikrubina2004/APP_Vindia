import React, { useCallback, useEffect, useMemo, useState } from "react";
import accountantService from "../../services/accountantService";
import "./ChartOfAccounts.css";

const ACCOUNT_TYPES = ["asset", "liability", "equity", "revenue", "expense"];

const TYPE_META = {
  asset: { label: "Assets", short: "A" },
  liability: { label: "Liabilities", short: "L" },
  equity: { label: "Equity", short: "E" },
  revenue: { label: "Revenue", short: "R" },
  expense: { label: "Expenses", short: "X" },
};

const getList = (response) => {
  const value = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(value) ? value : [];
};

const typeLabel = (type) => TYPE_META[String(type || "").toLowerCase()]?.label || "Other";

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("active");

  const loadAccounts = useCallback(async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      setError("");

      const params = {};
      if (typeFilter !== "all") params.account_type = typeFilter;

      const response = await accountantService.getChartOfAccounts(params);
      setAccounts(getList(response));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load the Chart of Accounts."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const filteredAccounts = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return accounts.filter((account) => {
      const isActive = account.is_active !== false;
      if (activeFilter === "active" && !isActive) return false;
      if (activeFilter === "inactive" && isActive) return false;

      if (typeFilter !== "all") {
        if (String(account.account_type || "").toLowerCase() !== typeFilter) {
          return false;
        }
      }

      if (!needle) return true;

      return [
        account.account_code,
        account.account_name,
        account.account_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [accounts, activeFilter, search, typeFilter]);

  const summary = useMemo(() => {
    const result = {
      total: accounts.length,
      active: 0,
      inactive: 0,
      byType: {
        asset: 0,
        liability: 0,
        equity: 0,
        revenue: 0,
        expense: 0,
      },
    };

    accounts.forEach((account) => {
      const type = String(account.account_type || "").toLowerCase();
      if (account.is_active !== false) result.active += 1;
      else result.inactive += 1;

      if (result.byType[type] !== undefined) {
        result.byType[type] += 1;
      }
    });

    return result;
  }, [accounts]);

  return (
    <div className="coa-page">
      <section className="coa-hero">
        <div>
          <div className="coa-eyebrow">
            <span className="coa-dot" />
            ACCOUNTING STRUCTURE
          </div>
          <h1>Chart of Accounts</h1>
          <p>
            The controlled account structure used by Journal Entries and the
            General Ledger.
          </p>
        </div>

        <div className="coa-readonly-badge">
          <span>✓</span>
          Accountant View
        </div>
      </section>

      {error && <div className="coa-alert">{error}</div>}

      <section className="coa-summary-grid">
        <div className="coa-stat-card coa-stat-primary">
          <span>Total Accounts</span>
          <strong>{summary.total}</strong>
          <small>Configured in the accounting structure</small>
        </div>

        <div className="coa-stat-card">
          <span>Active Accounts</span>
          <strong>{summary.active}</strong>
          <small>Available for accounting entries</small>
        </div>

        <div className="coa-stat-card">
          <span>Inactive Accounts</span>
          <strong>{summary.inactive}</strong>
          <small>Retained for historical reference</small>
        </div>

        <div className="coa-stat-card">
          <span>Account Classes</span>
          <strong>5</strong>
          <small>Assets, liabilities, equity, revenue and expenses</small>
        </div>
      </section>

      <section className="coa-class-grid">
        {ACCOUNT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            className={`coa-class-card coa-class-${type}`}
            onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
          >
            <div className="coa-class-icon">{TYPE_META[type].short}</div>
            <div>
              <span>{TYPE_META[type].label}</span>
              <strong>{summary.byType[type]}</strong>
            </div>
            <small>Accounts</small>
          </button>
        ))}
      </section>

      <section className="coa-panel">
        <div className="coa-panel-header">
          <div>
            <div className="coa-section-kicker">ACCOUNT REGISTER</div>
            <h2>Accounts</h2>
          </div>

          <div className="coa-header-actions">
            <button
              type="button"
              className="coa-refresh-button"
              onClick={() => loadAccounts(true)}
              disabled={refreshing || loading}
            >
              {refreshing ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </div>

        <div className="coa-filter-bar">
          <label className="coa-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search account code or name"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="all">All account types</option>
            {ACCOUNT_TYPES.map((type) => (
              <option key={type} value={type}>
                {typeLabel(type)}
              </option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="active">Active only</option>
            <option value="all">Active + inactive</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        <div className="coa-table-wrap">
          <table className="coa-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Account Name</th>
                <th>Type</th>
                <th>Parent Account</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="coa-empty">
                    Loading Chart of Accounts…
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="coa-empty">
                    <div className="coa-empty-icon">◎</div>
                    <strong>No accounts found</strong>
                    <span>Try changing the filters or search term.</span>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <span className="coa-code">{account.account_code || "—"}</span>
                    </td>
                    <td>
                      <div className="coa-account-name">
                        <strong>{account.account_name || "Unnamed account"}</strong>
                        <span>
                          {account.parent_account_name
                            ? `Parent: ${account.parent_account_name}`
                            : "Top-level account"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`coa-type-badge coa-type-${String(account.account_type || "").toLowerCase()}`}>
                        {typeLabel(account.account_type)}
                      </span>
                    </td>
                    <td>{account.parent_account_name || "—"}</td>
                    <td>
                      <span
                        className={`coa-status ${
                          account.is_active === false
                            ? "coa-status-inactive"
                            : "coa-status-active"
                        }`}
                      >
                        {account.is_active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="coa-note">
        <div className="coa-note-icon">i</div>
        <div>
          <strong>Controlled accounting structure</strong>
          <p>
            This Accountant view is intentionally read-only. Account creation,
            renaming, reclassification and activation are governed outside the
            Accountant workflow so Journal Entries continue to use a stable
            account structure.
          </p>
        </div>
      </section>
    </div>
  );
}
