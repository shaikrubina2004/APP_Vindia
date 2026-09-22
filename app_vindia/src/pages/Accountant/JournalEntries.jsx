import React, { useCallback, useEffect, useMemo, useState } from "react";
import accountantService from "../../services/accountantService";
import { useProject } from "../../context/ProjectContext";
import { useAuth } from "../../context/useAuth";
import "./JournalEntries.css";

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

const today = () => new Date().toISOString().slice(0, 10);

const emptyLine = () => ({
  account_id: "",
  description: "",
  debit: "",
  credit: "",
});

const statusLabel = (status) =>
  String(status || "draft")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusClass = (status) => `je-status-${String(status || "draft").toLowerCase()}`;

const extractList = (response) => {
  const value = response?.data?.data ?? response?.data ?? [];
  return Array.isArray(value) ? value : [];
};

const extractObject = (response) => response?.data?.data ?? response?.data ?? null;

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

export default function JournalEntries() {
  const auth = useAuth();
  const authUser = auth?.user || auth?.currentUser || null;
  const role = String(authUser?.role || auth?.role || "")
    .toLowerCase()
    .replace(/\s+/g, "_");

  const isAccountant = role === "accountant";
  const canCreate = ["accountant", "finance_manager", "ceo"].includes(role);
  const canApprove = ["finance_manager", "ceo"].includes(role);
  const canPost = ["finance_manager", "ceo"].includes(role);
  const canReverse = ["finance_manager", "ceo"].includes(role);

  const projectCtx = useProject();
  const projects = projectCtx?.PROJECTS || [];

  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [header, setHeader] = useState({
    entry_date: today(),
    project_id: "",
    description: "",
  });

  const [lines, setLines] = useState([emptyLine(), emptyLine()]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [workingId, setWorkingId] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const entryFilters = {};
      if (statusFilter !== "all") entryFilters.status = statusFilter;
      if (projectFilter !== "all") entryFilters.project_id = projectFilter;

      const [entriesRes, accountsRes] = await Promise.all([
        accountantService.getAllJournalEntries(entryFilters),
        accountantService.getChartOfAccounts({ active_only: true }),
      ]);

      setEntries(extractList(entriesRes));
      setAccounts(extractList(accountsRes));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load journal entries."));
    } finally {
      setLoading(false);
    }
  }, [projectFilter, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return entries;

    return entries.filter((entry) => {
      const haystack = [
        entry.entry_number,
        entry.entry_no,
        entry.description,
        entry.project_name,
        entry.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [entries, search]);

  const summary = useMemo(() => {
    const result = {
      total: filteredEntries.length,
      draft: 0,
      submitted: 0,
      approved: 0,
      posted: 0,
      reversed: 0,
      totalDebit: 0,
      totalCredit: 0,
    };

    filteredEntries.forEach((entry) => {
      const status = String(entry.status || "draft").toLowerCase();
      if (status in result) result[status] += 1;
      result.totalDebit += Number(entry.total_debit || 0);
      result.totalCredit += Number(entry.total_credit || 0);
    });

    return result;
  }, [filteredEntries]);

  const totalDebit = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.debit || 0), 0),
    [lines]
  );

  const totalCredit = useMemo(
    () => lines.reduce((sum, line) => sum + Number(line.credit || 0), 0),
    [lines]
  );

  const isBalanced =
    lines.length >= 2 &&
    totalDebit > 0 &&
    Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const resetForm = () => {
    setHeader({
      entry_date: today(),
      project_id: "",
      description: "",
    });
    setLines([emptyLine(), emptyLine()]);
    setFormError("");
  };

  const updateLine = (index, field, value) => {
    setLines((current) =>
      current.map((line, idx) => {
        if (idx !== index) return line;

        const next = { ...line, [field]: value };
        if (field === "debit" && Number(value) > 0) next.credit = "";
        if (field === "credit" && Number(value) > 0) next.debit = "";
        return next;
      })
    );
  };

  const addLine = () => setLines((current) => [...current, emptyLine()]);

  const removeLine = (index) => {
    setLines((current) =>
      current.length > 2 ? current.filter((_, idx) => idx !== index) : current
    );
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setFormError("");

    const cleanLines = lines
      .filter(
        (line) =>
          line.account_id &&
          (Number(line.debit) > 0 || Number(line.credit) > 0)
      )
      .map((line) => ({
        account_id: Number(line.account_id),
        description: line.description?.trim() || undefined,
        debit: Number(line.debit || 0),
        credit: Number(line.credit || 0),
      }));

    if (cleanLines.length < 2) {
      setFormError("Add at least two valid lines.");
      return;
    }

    if (!isBalanced) {
      setFormError("Total debit must equal total credit before saving.");
      return;
    }

    try {
      setSaving(true);

      await accountantService.createJournalEntry({
        entry_date: header.entry_date,
        project_id: header.project_id || null,
        description: header.description.trim(),
        lines: cleanLines,
      });

      setShowCreate(false);
      resetForm();
      await loadData();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save the journal entry."));
    } finally {
      setSaving(false);
    }
  };

  const openEntry = async (id) => {
    try {
      setWorkingId(id);
      const response = await accountantService.getJournalEntryById(id);
      setSelectedEntry(extractObject(response));
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load journal entry."));
    } finally {
      setWorkingId(null);
    }
  };

  const runAction = async (label, action, id) => {
    try {
      setError("");
      setWorkingId(id);
      await action(id);
      setSelectedEntry(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, `Failed to ${label.toLowerCase()}.`));
    } finally {
      setWorkingId(null);
    }
  };

  const submitDraft = (id) =>
    runAction("submit entry", accountantService.submitJournalEntry, id);

  const approveEntry = (id) =>
    runAction("approve entry", accountantService.approveJournalEntry, id);

  const postEntry = (id) =>
    runAction("post entry", accountantService.postJournalEntry, id);

  const reverseEntry = async (id) => {
    if (!window.confirm("Reverse this posted entry? A new reversing entry will be created.")) {
      return;
    }
    await runAction("reverse entry", accountantService.reverseJournalEntry, id);
  };

  const deleteDraft = async (id) => {
    if (!window.confirm("Delete this draft journal entry? This cannot be undone.")) {
      return;
    }
    await runAction("delete entry", accountantService.deleteJournalEntry, id);
  };

  const accountName = (line) => {
    if (line.account_code && line.account_name) {
      return `${line.account_code} — ${line.account_name}`;
    }
    return line.account_name || line.account_code || "Unmapped account";
  };

  return (
    <div className="je-page">
      <section className="je-hero">
        <div>
          <div className="je-eyebrow">
            <span className="je-dot" />
            ACCOUNTING CONTROL
          </div>
          <h1>Journal Entries</h1>
          <p>
            Record balanced double-entry transactions and move them through the
            accounting workflow.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            className="je-primary-button"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
          >
            <span>＋</span>
            New Journal Entry
          </button>
        )}
      </section>

      {error && <div className="je-alert je-alert-error">{error}</div>}

      <section className="je-summary-grid">
        <div className="je-stat-card">
          <span className="je-stat-label">Total Entries</span>
          <strong>{summary.total}</strong>
          <small>Visible in current filter</small>
        </div>
        <div className="je-stat-card je-stat-draft">
          <span className="je-stat-label">Draft</span>
          <strong>{summary.draft}</strong>
          <small>Entries still being prepared</small>
        </div>
        <div className="je-stat-card je-stat-submitted">
          <span className="je-stat-label">Submitted</span>
          <strong>{summary.submitted}</strong>
          <small>Awaiting review</small>
        </div>
        <div className="je-stat-card je-stat-posted">
          <span className="je-stat-label">Posted</span>
          <strong>{summary.posted}</strong>
          <small>Included in the ledger</small>
        </div>
      </section>

      <section className="je-workspace">
        <div className="je-panel">
          <div className="je-panel-header">
            <div>
              <div className="je-section-kicker">REGISTER</div>
              <h2>Journal Register</h2>
            </div>
            <div className="je-register-total">
              <span>Visible debit</span>
              <strong>{formatCurrency(summary.totalDebit)}</strong>
            </div>
          </div>

          <div className="je-filter-bar">
            <label className="je-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search entry number, description or project"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="posted">Posted</option>
              <option value="reversed">Reversed</option>
            </select>

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

            <button
              type="button"
              className="je-refresh-button"
              onClick={loadData}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          <div className="je-table-wrap">
            <table className="je-table">
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Project</th>
                  <th className="je-number">Debit</th>
                  <th className="je-number">Credit</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="je-empty">
                      Loading journal entries…
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="je-empty">
                      <div className="je-empty-icon">◎</div>
                      <strong>No journal entries found</strong>
                      <span>Try another filter or create a new entry.</span>
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id} onClick={() => openEntry(entry.id)}>
                      <td>
                        <strong className="je-entry-number">
                          {entry.entry_number || entry.entry_no || `JE-${entry.id}`}
                        </strong>
                      </td>
                      <td>{formatDate(entry.entry_date)}</td>
                      <td>
                        <div className="je-description">
                          <strong>{entry.description || "Journal transaction"}</strong>
                          <span>
                            {entry.status === "posted"
                              ? "Ledger-impacting entry"
                              : "Workflow entry"}
                          </span>
                        </div>
                      </td>
                      <td>{entry.project_name || "Company level"}</td>
                      <td className="je-number">{formatCurrency(entry.total_debit)}</td>
                      <td className="je-number">{formatCurrency(entry.total_credit)}</td>
                      <td>
                        <span className={`je-status ${statusClass(entry.status)}`}>
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="je-view-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEntry(entry.id);
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
        </div>

        <aside className="je-control-panel">
          <div className="je-control-icon">✓</div>
          <div className="je-section-kicker">DOUBLE ENTRY CONTROL</div>
          <h3>Every entry must balance.</h3>
          <p>
            Journal entries are saved only when total debit equals total credit.
            Posted entries become part of the derived General Ledger.
          </p>

          <div className="je-control-row">
            <span>Visible debit</span>
            <strong>{formatCurrency(summary.totalDebit)}</strong>
          </div>
          <div className="je-control-row">
            <span>Visible credit</span>
            <strong>{formatCurrency(summary.totalCredit)}</strong>
          </div>

          <div className="je-workflow">
            <span className="je-workflow-dot active" />
            Draft
            <span className="je-workflow-arrow">→</span>
            <span className="je-workflow-dot" />
            Submitted
            <span className="je-workflow-arrow">→</span>
            <span className="je-workflow-dot" />
            Approved
            <span className="je-workflow-arrow">→</span>
            <span className="je-workflow-dot" />
            Posted
          </div>

          {isAccountant ? (
            <div className="je-role-note">
              <strong>Accountant workflow</strong>
              <span>
                Create and maintain your own draft entries, then submit them for
                Finance Manager review.
              </span>
            </div>
          ) : (
            <div className="je-role-note">
              <strong>Review workflow</strong>
              <span>
                Approval and posting controls are available here according to
                your backend role permissions.
              </span>
            </div>
          )}
        </aside>
      </section>

      {showCreate && (
        <div className="je-overlay" onMouseDown={() => setShowCreate(false)}>
          <div className="je-modal je-modal-wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="je-modal-header">
              <div>
                <div className="je-section-kicker">NEW TRANSACTION</div>
                <h2>Create Journal Entry</h2>
                <p>Build a balanced double-entry transaction and save it as draft.</p>
              </div>
              <button type="button" className="je-close" onClick={() => setShowCreate(false)}>
                ×
              </button>
            </div>

            {formError && <div className="je-alert je-alert-error">{formError}</div>}

            <form onSubmit={handleCreate}>
              <div className="je-form-grid">
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={header.entry_date}
                    onChange={(event) =>
                      setHeader((current) => ({
                        ...current,
                        entry_date: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Project</span>
                  <select
                    value={header.project_id}
                    onChange={(event) =>
                      setHeader((current) => ({
                        ...current,
                        project_id: event.target.value,
                      }))
                    }
                  >
                    <option value="">Company level</option>
                    {projects
                      .filter((project) => project?.id)
                      .map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name || project.project_name || `Project ${project.id}`}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="je-field-wide">
                  <span>Description</span>
                  <input
                    value={header.description}
                    onChange={(event) =>
                      setHeader((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="e.g. Office rent for September"
                    required
                  />
                </label>
              </div>

              <div className="je-line-header">
                <div>
                  <div className="je-section-kicker">ENTRY LINES</div>
                  <h3>Debit & Credit Lines</h3>
                </div>
                <button type="button" className="je-secondary-button" onClick={addLine}>
                  + Add line
                </button>
              </div>

              <div className="je-line-table-wrap">
                <table className="je-line-table">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Description</th>
                      <th className="je-number">Debit</th>
                      <th className="je-number">Credit</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={index}>
                        <td>
                          <select
                            value={line.account_id}
                            onChange={(event) =>
                              updateLine(index, "account_id", event.target.value)
                            }
                            required
                          >
                            <option value="">Select account</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.account_code} — {account.account_name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={line.description}
                            onChange={(event) =>
                              updateLine(index, "description", event.target.value)
                            }
                            placeholder="Line description"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.debit}
                            onChange={(event) =>
                              updateLine(index, "debit", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.credit}
                            onChange={(event) =>
                              updateLine(index, "credit", event.target.value)
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="je-remove-button"
                            onClick={() => removeLine(index)}
                            disabled={lines.length <= 2}
                            aria-label="Remove line"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`je-balance ${isBalanced ? "balanced" : "unbalanced"}`}>
                <div>
                  <span>Total Debit</span>
                  <strong>{formatCurrency(totalDebit)}</strong>
                </div>
                <div>
                  <span>Total Credit</span>
                  <strong>{formatCurrency(totalCredit)}</strong>
                </div>
                <div>
                  <span>Validation</span>
                  <strong>{isBalanced ? "Balanced ✓" : "Not balanced"}</strong>
                </div>
              </div>

              <div className="je-modal-actions">
                <button
                  type="button"
                  className="je-secondary-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="je-primary-button"
                  disabled={saving || !isBalanced}
                >
                  {saving ? "Saving…" : "Save as Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEntry && (
        <div className="je-overlay" onMouseDown={() => setSelectedEntry(null)}>
          <div className="je-modal je-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="je-modal-header">
              <div>
                <div className="je-section-kicker">JOURNAL DETAIL</div>
                <div className="je-detail-title-row">
                  <h2>
                    {selectedEntry.entry_number ||
                      selectedEntry.entry_no ||
                      `JE-${selectedEntry.id}`}
                  </h2>
                  <span
                    className={`je-status ${statusClass(selectedEntry.status)}`}
                  >
                    {statusLabel(selectedEntry.status)}
                  </span>
                </div>
                <p>
                  {formatDate(selectedEntry.entry_date)} ·{" "}
                  {selectedEntry.project_name || "Company level"}
                </p>
              </div>
              <button type="button" className="je-close" onClick={() => setSelectedEntry(null)}>
                ×
              </button>
            </div>

            {selectedEntry.description && (
              <div className="je-detail-description">{selectedEntry.description}</div>
            )}

            <div className="je-detail-summary">
              <div>
                <span>Debit</span>
                <strong>{formatCurrency(selectedEntry.total_debit)}</strong>
              </div>
              <div>
                <span>Credit</span>
                <strong>{formatCurrency(selectedEntry.total_credit)}</strong>
              </div>
              <div>
                <span>Created by</span>
                <strong>{selectedEntry.created_by_name || selectedEntry.created_by || "—"}</strong>
              </div>
            </div>

            <div className="je-detail-table-wrap">
              <table className="je-line-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Description</th>
                    <th className="je-number">Debit</th>
                    <th className="je-number">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedEntry.lines || []).map((line) => (
                    <tr key={line.id}>
                      <td>{accountName(line)}</td>
                      <td>{line.description || "—"}</td>
                      <td className="je-number">{formatCurrency(line.debit)}</td>
                      <td className="je-number">{formatCurrency(line.credit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="je-modal-actions">
              {isAccountant && selectedEntry.status === "draft" && (
                <>
                  <button
                    type="button"
                    className="je-danger-button"
                    onClick={() => deleteDraft(selectedEntry.id)}
                    disabled={workingId === selectedEntry.id}
                  >
                    Delete Draft
                  </button>
                  <button
                    type="button"
                    className="je-secondary-button"
                    onClick={() => submitDraft(selectedEntry.id)}
                    disabled={workingId === selectedEntry.id}
                  >
                    {workingId === selectedEntry.id ? "Submitting…" : "Submit for Review"}
                  </button>
                </>
              )}

              {canApprove && selectedEntry.status === "submitted" && (
                <button
                  type="button"
                  className="je-secondary-button"
                  onClick={() => approveEntry(selectedEntry.id)}
                  disabled={workingId === selectedEntry.id}
                >
                  {workingId === selectedEntry.id ? "Approving…" : "Approve"}
                </button>
              )}

              {canPost && selectedEntry.status === "approved" && (
                <button
                  type="button"
                  className="je-primary-button"
                  onClick={() => postEntry(selectedEntry.id)}
                  disabled={workingId === selectedEntry.id}
                >
                  {workingId === selectedEntry.id ? "Posting…" : "Post to Ledger"}
                </button>
              )}

              {canReverse && selectedEntry.status === "posted" && (
                <button
                  type="button"
                  className="je-danger-button"
                  onClick={() => reverseEntry(selectedEntry.id)}
                  disabled={workingId === selectedEntry.id}
                >
                  Reverse Entry
                </button>
              )}

              <button
                type="button"
                className="je-secondary-button"
                onClick={() => setSelectedEntry(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
