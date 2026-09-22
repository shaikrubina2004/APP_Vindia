import React, { useCallback, useEffect, useMemo, useState } from "react";
import accountantService from "../../services/accountantService";
import { useProject } from "../../context/ProjectContext";
import "./GeneralLedger.css";

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getList = (response) => {
  const value = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(value) ? value : [];
};

const getObject = (response) => response?.data?.data ?? response?.data ?? {};

export default function GeneralLedger() {
  const projectCtx = useProject();
  const projects = projectCtx?.PROJECTS || [];

  const [entries, setEntries] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTrial, setLoadingTrial] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("");
  const [view, setView] = useState("ledger");
  const [showPostedOnly, setShowPostedOnly] = useState(true);

  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const filters = {};
      if (projectFilter !== "all") filters.project_id = projectFilter;
      if (accountFilter.trim()) filters.account_id = accountFilter.trim();

      const response = await accountantService.getLedger(filters);
      setEntries(getList(response));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load the General Ledger."
      );
    } finally {
      setLoading(false);
    }
  }, [projectFilter, accountFilter]);

  const loadTrialBalance = useCallback(async () => {
    try {
      setLoadingTrial(true);

      const filters = {};
      if (projectFilter !== "all") filters.project_id = projectFilter;

      const response = await accountantService.getTrialBalance(filters);
      setTrialBalance(getList(response));
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load the Trial Balance."
      );
    } finally {
      setLoadingTrial(false);
    }
  }, [projectFilter]);

  useEffect(() => {
    loadLedger();
    loadTrialBalance();
  }, [loadLedger, loadTrialBalance]);

  const visibleEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (showPostedOnly && String(entry.status || "posted").toLowerCase() !== "posted") {
        return false;
      }

      if (!needle) return true;

      return [
        entry.entry_number,
        entry.entry_no,
        entry.description,
        entry.account_code,
        entry.account_name,
        entry.project_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [entries, search, showPostedOnly]);

  const summary = useMemo(() => {
    let debit = 0;
    let credit = 0;

    visibleEntries.forEach((entry) => {
      debit += Number(entry.debit || 0);
      credit += Number(entry.credit || 0);
    });

    return {
      lines: visibleEntries.length,
      debit,
      credit,
      net: debit - credit,
    };
  }, [visibleEntries]);

  const trialSummary = useMemo(() => {
    let debit = 0;
    let credit = 0;

    trialBalance.forEach((row) => {
      debit += Number(row.debit || row.total_debit || 0);
      credit += Number(row.credit || row.total_credit || 0);
    });

    return { debit, credit, difference: debit - credit };
  }, [trialBalance]);

  return (
    <div className="gl-page">
      <section className="gl-hero">
        <div>
          <div className="gl-eyebrow">
            <span className="gl-dot" />
            ACCOUNTING LEDGER
          </div>
          <h1>General Ledger</h1>
          <p>
            Read-only ledger derived from posted Journal Entries. Review account
            movement and confirm the trial balance without altering posted data.
          </p>
        </div>

        <div className="gl-hero-actions">
          <span className="gl-readonly-badge">✓ Read Only</span>
          <button
            type="button"
            className="gl-refresh"
            onClick={() => {
              loadLedger();
              loadTrialBalance();
            }}
            disabled={loading || loadingTrial}
          >
            ↻ Refresh
          </button>
        </div>
      </section>

      {error && <div className="gl-alert">{error}</div>}

      <section className="gl-summary-grid">
        <div className="gl-stat">
          <span>Ledger Lines</span>
          <strong>{summary.lines}</strong>
          <small>Current filtered view</small>
        </div>

        <div className="gl-stat gl-stat-debit">
          <span>Total Debit</span>
          <strong>{formatCurrency(summary.debit)}</strong>
          <small>Posted journal activity</small>
        </div>

        <div className="gl-stat gl-stat-credit">
          <span>Total Credit</span>
          <strong>{formatCurrency(summary.credit)}</strong>
          <small>Posted journal activity</small>
        </div>

        <div className={`gl-stat ${Math.abs(summary.net) < 0.01 ? "gl-stat-ok" : "gl-stat-warning"}`}>
          <span>Net Difference</span>
          <strong>{formatCurrency(summary.net)}</strong>
          <small>{Math.abs(summary.net) < 0.01 ? "Balanced view" : "Difference in current filter"}</small>
        </div>
      </section>

      <section className="gl-panel">
        <div className="gl-toolbar">
          <div className="gl-tabs">
            <button
              type="button"
              className={view === "ledger" ? "active" : ""}
              onClick={() => setView("ledger")}
            >
              General Ledger
            </button>
            <button
              type="button"
              className={view === "trial" ? "active" : ""}
              onClick={() => setView("trial")}
            >
              Trial Balance
            </button>
          </div>

          <div className="gl-filters">
            <label className="gl-search">
              <span>⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search account, entry or description"
              />
            </label>

            <select
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
            >
              <option value="all">All projects</option>
              {projects
                .filter((project) => project?.id)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.project_name || `Project ${project.id}`}
                  </option>
                ))}
            </select>

            {view === "ledger" && (
              <>
                <input
                  className="gl-account-input"
                  value={accountFilter}
                  onChange={(event) => setAccountFilter(event.target.value)}
                  placeholder="Account ID"
                  inputMode="numeric"
                />

                <label className="gl-check">
                  <input
                    type="checkbox"
                    checked={showPostedOnly}
                    onChange={(event) => setShowPostedOnly(event.target.checked)}
                  />
                  Posted only
                </label>
              </>
            )}
          </div>
        </div>

        {view === "ledger" ? (
          <div className="gl-table-wrap">
            <table className="gl-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Entry</th>
                  <th>Account</th>
                  <th>Description</th>
                  <th>Project</th>
                  <th className="gl-num">Debit</th>
                  <th className="gl-num">Credit</th>
                  <th className="gl-num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="gl-empty">Loading ledger…</td>
                  </tr>
                ) : visibleEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="gl-empty">
                      <div className="gl-empty-icon">◎</div>
                      <strong>No posted ledger lines found</strong>
                      <span>Post balanced Journal Entries to populate the ledger.</span>
                    </td>
                  </tr>
                ) : (
                  visibleEntries.map((entry, index) => (
                    <tr key={entry.id || `${entry.entry_id}-${index}`}>
                      <td>{formatDate(entry.entry_date)}</td>
                      <td>
                        <strong className="gl-entry">
                          {entry.entry_number || entry.entry_no || `JE-${entry.entry_id || "—"}`}
                        </strong>
                      </td>
                      <td>
                        <div className="gl-account">
                          <strong>{entry.account_code || "—"}</strong>
                          <span>{entry.account_name || "Unmapped account"}</span>
                        </div>
                      </td>
                      <td>{entry.description || "—"}</td>
                      <td>{entry.project_name || "Company level"}</td>
                      <td className="gl-num">{formatCurrency(entry.debit)}</td>
                      <td className="gl-num">{formatCurrency(entry.credit)}</td>
                      <td className="gl-num gl-balance">
                        {formatCurrency(entry.running_balance ?? (Number(entry.debit || 0) - Number(entry.credit || 0)))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gl-table-wrap">
            <table className="gl-table gl-trial-table">
              <thead>
                <tr>
                  <th>Account Code</th>
                  <th>Account Name</th>
                  <th>Account Type</th>
                  <th className="gl-num">Debit</th>
                  <th className="gl-num">Credit</th>
                  <th className="gl-num">Net</th>
                </tr>
              </thead>
              <tbody>
                {loadingTrial ? (
                  <tr>
                    <td colSpan={6} className="gl-empty">Loading trial balance…</td>
                  </tr>
                ) : trialBalance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="gl-empty">
                      <div className="gl-empty-icon">◎</div>
                      <strong>No trial balance rows found</strong>
                      <span>Posted journal lines will appear here.</span>
                    </td>
                  </tr>
                ) : (
                  trialBalance.map((row) => {
                    const debit = Number(row.debit || row.total_debit || 0);
                    const credit = Number(row.credit || row.total_credit || 0);

                    return (
                      <tr key={row.account_id || row.id}>
                        <td>
                          <strong className="gl-entry">{row.account_code || "—"}</strong>
                        </td>
                        <td>{row.account_name || "—"}</td>
                        <td>{row.account_type || "—"}</td>
                        <td className="gl-num">{formatCurrency(debit)}</td>
                        <td className="gl-num">{formatCurrency(credit)}</td>
                        <td className="gl-num">{formatCurrency(debit - credit)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Trial Balance Total</strong></td>
                  <td className="gl-num"><strong>{formatCurrency(trialSummary.debit)}</strong></td>
                  <td className="gl-num"><strong>{formatCurrency(trialSummary.credit)}</strong></td>
                  <td className="gl-num"><strong>{formatCurrency(trialSummary.difference)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="gl-control-card">
        <div className="gl-control-icon">✓</div>
        <div>
          <strong>Posting control</strong>
          <p>
            The General Ledger is derived from posted Journal Entry lines.
            Draft, submitted and approved entries do not become ledger activity.
            Posted entries remain immutable; corrections are handled through
            the established reversal workflow.
          </p>
        </div>
      </section>
    </div>
  );
}
