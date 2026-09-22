import React, { useCallback, useEffect, useMemo, useState } from "react";
import accountantService from "../../services/accountantService";
import "./BankReconciliation.css";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getList = (response) => {
  const value = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(value) ? value : [];
};

export default function BankReconciliation() {
  const [records, setRecords] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [form, setForm] = useState({
    bank_account_id: "",
    statement_date: new Date().toISOString().slice(0, 10),
    statement_balance: "",
    book_balance: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (statusFilter !== "all") filters.status = statusFilter;
      if (accountFilter !== "all") filters.bank_account_id = accountFilter;

      const response = await accountantService.getBankReconciliations(filters);
      const rows = getList(response);
      setRecords(rows);

      // Do not require an extra endpoint for the page to work.
      // If the service exposes configured finance bank accounts, use it;
      // otherwise the reconciliation register still remains fully usable.
      if (typeof accountantService.getBankAccounts === "function") {
        try {
          const accountResponse = await accountantService.getBankAccounts();
          setBankAccounts(getList(accountResponse));
        } catch {
          setBankAccounts([]);
        }
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load bank reconciliations."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, accountFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const visibleRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return records.filter((record) => {
      if (!needle) return true;

      return [
        record.bank_account_name,
        record.account_name,
        record.account_number,
        record.statement_date,
        record.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [records, search]);

  const summary = useMemo(() => {
    let inProgress = 0;
    let reconciled = 0;
    let totalDifference = 0;

    records.forEach((record) => {
      if (record.status === "reconciled") reconciled += 1;
      else inProgress += 1;
      totalDifference += Number(record.difference || 0);
    });

    return {
      total: records.length,
      inProgress,
      reconciled,
      totalDifference,
    };
  }, [records]);

  const balanceDifference =
    Number(form.statement_balance || 0) - Number(form.book_balance || 0);

  const resetForm = () => {
    setForm({
      bank_account_id: "",
      statement_date: new Date().toISOString().slice(0, 10),
      statement_balance: "",
      book_balance: "",
    });
    setFormError("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!form.bank_account_id) {
      setFormError("Enter the configured bank account ID.");
      return;
    }

    if (!form.statement_date) {
      setFormError("Statement date is required.");
      return;
    }

    if (form.statement_balance === "" || form.book_balance === "") {
      setFormError("Statement balance and book balance are required.");
      return;
    }

    try {
      setSaving(true);

      await accountantService.createBankReconciliation({
        bank_account_id: Number(form.bank_account_id),
        statement_date: form.statement_date,
        statement_balance: Number(form.statement_balance),
        book_balance: Number(form.book_balance),
      });

      setShowCreate(false);
      resetForm();
      await loadData();
    } catch (err) {
      setFormError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to create reconciliation."
      );
    } finally {
      setSaving(false);
    }
  };

  const approve = async (record) => {
    if (!window.confirm("Mark this reconciliation as reconciled?")) return;

    try {
      setError("");
      setSaving(true);

      await accountantService.approveBankReconciliation(record.id);
      setSelectedRecord(null);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to reconcile the account."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateRecord = async (recordId, patch) => {
    try {
      setSaving(true);
      await accountantService.updateBankReconciliation(recordId, patch);
      setSelectedRecord(null);
      await loadData();
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to update reconciliation."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="br-page">
      <section className="br-hero">
        <div>
          <div className="br-eyebrow">
            <span className="br-dot" />
            CASH & BANK CONTROL
          </div>
          <h1>Bank Reconciliation</h1>
          <p>
            Compare bank statement balances with book balances, investigate
            differences, and move completed reconciliations through the control
            workflow.
          </p>
        </div>

        <div className="br-hero-actions">
          <span className="br-readonly-badge">Accountant Workspace</span>
          <button
            type="button"
            className="br-primary-button"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            + New Reconciliation
          </button>
        </div>
      </section>

      {error && <div className="br-alert">{error}</div>}

      <section className="br-summary-grid">
        <div className="br-stat">
          <span>Total Reconciliations</span>
          <strong>{summary.total}</strong>
          <small>Current register</small>
        </div>
        <div className="br-stat br-stat-warning">
          <span>In Progress</span>
          <strong>{summary.inProgress}</strong>
          <small>Still being reviewed</small>
        </div>
        <div className="br-stat br-stat-success">
          <span>Reconciled</span>
          <strong>{summary.reconciled}</strong>
          <small>Completed control records</small>
        </div>
        <div className="br-stat">
          <span>Net Difference</span>
          <strong>{formatCurrency(summary.totalDifference)}</strong>
          <small>Across current records</small>
        </div>
      </section>

      <section className="br-panel">
        <div className="br-panel-header">
          <div>
            <div className="br-kicker">RECONCILIATION REGISTER</div>
            <h2>Bank Reconciliations</h2>
          </div>

          <button
            type="button"
            className="br-secondary-button"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        <div className="br-filter-bar">
          <label className="br-search">
            <span>⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search bank account or status"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="reconciled">Reconciled</option>
          </select>

          <select
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
          >
            <option value="all">All bank accounts</option>
            {records
              .map((record) => record.bank_account_id)
              .filter(Boolean)
              .filter((id, index, list) => list.indexOf(id) === index)
              .map((id) => {
                const matching = records.find((record) => record.bank_account_id === id);
                return (
                  <option key={id} value={id}>
                    {matching?.bank_account_name || `Bank Account ${id}`}
                  </option>
                );
              })}
          </select>
        </div>

        <div className="br-table-wrap">
          <table className="br-table">
            <thead>
              <tr>
                <th>Bank Account</th>
                <th>Statement Date</th>
                <th className="br-num">Statement Balance</th>
                <th className="br-num">Book Balance</th>
                <th className="br-num">Difference</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="br-empty">Loading reconciliation records…</td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="br-empty">
                    <div className="br-empty-icon">◎</div>
                    <strong>No reconciliations found</strong>
                    <span>Create the first reconciliation or adjust the filters.</span>
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                  >
                    <td>
                      <div className="br-account">
                        <strong>
                          {record.bank_account_name ||
                            record.account_name ||
                            `Bank Account ${record.bank_account_id}`}
                        </strong>
                        <span>
                          {record.account_number
                            ? `A/c ${record.account_number}`
                            : `ID ${record.bank_account_id}`}
                        </span>
                      </div>
                    </td>
                    <td>{formatDate(record.statement_date)}</td>
                    <td className="br-num">{formatCurrency(record.statement_balance)}</td>
                    <td className="br-num">{formatCurrency(record.book_balance)}</td>
                    <td
                      className={`br-num ${
                        Math.abs(Number(record.difference || 0)) < 0.01
                          ? "br-difference-ok"
                          : "br-difference-warning"
                      }`}
                    >
                      {formatCurrency(record.difference)}
                    </td>
                    <td>
                      <span
                        className={`br-status ${
                          record.status === "reconciled"
                            ? "br-status-reconciled"
                            : "br-status-progress"
                        }`}
                      >
                        {record.status === "reconciled" ? "Reconciled" : "In Progress"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="br-view-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedRecord(record);
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="br-note">
        <div className="br-note-icon">i</div>
        <div>
          <strong>Reconciliation control</strong>
          <p>
            The difference is calculated by the backend as statement balance
            minus book balance. An Accountant can create and edit a record while
            it is in progress. Reconciliation approval remains a protected
            backend action.
          </p>
        </div>
      </section>

      {showCreate && (
        <div className="br-overlay" onMouseDown={() => setShowCreate(false)}>
          <div className="br-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="br-modal-header">
              <div>
                <div className="br-kicker">NEW CONTROL RECORD</div>
                <h2>Start Bank Reconciliation</h2>
                <p>Capture the statement balance and current book balance.</p>
              </div>
              <button
                type="button"
                className="br-close"
                onClick={() => setShowCreate(false)}
              >
                ×
              </button>
            </div>

            {formError && <div className="br-form-error">{formError}</div>}

            <form onSubmit={handleCreate}>
              <div className="br-form-grid">
                <label>
                  <span>Bank Account ID</span>
                  <input
                    type="number"
                    min="1"
                    value={form.bank_account_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bank_account_id: event.target.value,
                      }))
                    }
                    placeholder="Configured finance bank account ID"
                    required
                  />
                </label>

                <label>
                  <span>Statement Date</span>
                  <input
                    type="date"
                    value={form.statement_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        statement_date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Statement Balance</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.statement_balance}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        statement_balance: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  <span>Book Balance</span>
                  <input
                    type="number"
                    step="0.01"
                    value={form.book_balance}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        book_balance: event.target.value,
                      }))
                    }
                    placeholder="0.00"
                    required
                  />
                </label>
              </div>

              <div
                className={`br-live-difference ${
                  Math.abs(balanceDifference) < 0.01 ? "is-balanced" : ""
                }`}
              >
                <span>Calculated Difference</span>
                <strong>{formatCurrency(balanceDifference)}</strong>
                <small>
                  {Math.abs(balanceDifference) < 0.01
                    ? "Statement and book balances currently match."
                    : "A non-zero difference means the account needs investigation before reconciliation."}
                </small>
              </div>

              <div className="br-modal-actions">
                <button
                  type="button"
                  className="br-secondary-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="br-primary-button" disabled={saving}>
                  {saving ? "Saving…" : "Save Reconciliation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecord && (
        <div className="br-overlay" onMouseDown={() => setSelectedRecord(null)}>
          <div className="br-modal br-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="br-modal-header">
              <div>
                <div className="br-kicker">RECONCILIATION DETAIL</div>
                <h2>
                  {selectedRecord.bank_account_name ||
                    selectedRecord.account_name ||
                    `Bank Account ${selectedRecord.bank_account_id}`}
                </h2>
                <p>{formatDate(selectedRecord.statement_date)}</p>
              </div>
              <button
                type="button"
                className="br-close"
                onClick={() => setSelectedRecord(null)}
              >
                ×
              </button>
            </div>

            <div className="br-detail-grid">
              <div>
                <span>Statement Balance</span>
                <strong>{formatCurrency(selectedRecord.statement_balance)}</strong>
              </div>
              <div>
                <span>Book Balance</span>
                <strong>{formatCurrency(selectedRecord.book_balance)}</strong>
              </div>
              <div>
                <span>Difference</span>
                <strong>{formatCurrency(selectedRecord.difference)}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>{selectedRecord.status === "reconciled" ? "Reconciled" : "In Progress"}</strong>
              </div>
            </div>

            {selectedRecord.status === "in_progress" && (
              <div className="br-detail-edit">
                <div className="br-kicker">UPDATE</div>
                <div className="br-edit-grid">
                  <label>
                    <span>Statement Balance</span>
                    <input
                      id="br-statement-edit"
                      type="number"
                      step="0.01"
                      defaultValue={selectedRecord.statement_balance}
                    />
                  </label>
                  <label>
                    <span>Book Balance</span>
                    <input
                      id="br-book-edit"
                      type="number"
                      step="0.01"
                      defaultValue={selectedRecord.book_balance}
                    />
                  </label>
                </div>
                <div className="br-modal-actions br-detail-actions">
                  <button
                    type="button"
                    className="br-secondary-button"
                    disabled={saving}
                    onClick={() =>
                      updateRecord(selectedRecord.id, {
                        statement_balance: Number(
                          document.getElementById("br-statement-edit").value
                        ),
                        book_balance: Number(
                          document.getElementById("br-book-edit").value
                        ),
                      })
                    }
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    className="br-primary-button"
                    disabled={saving}
                    onClick={() => approve(selectedRecord)}
                  >
                    {saving ? "Processing…" : "Mark Reconciled"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
