import { useState, useEffect, useCallback } from "react";
import "./AccountantShared.css";

/**
 * Generic list (+ optional create form, + optional row actions) page.
 * Every instance of this component makes real accountantService calls —
 * nothing here is mock data. Used for the simpler CRUD/read-only modules;
 * Journal Entries has its own bespoke page because of the multi-line
 * debit/credit form.
 *
 * props:
 *  - title, subtitle
 *  - fetchList: async () => axios response (expects { data: { data: [...] } })
 *  - columns: [{ key, label, render?: (row) => node }]
 *  - createFields: optional [{ name, label, type, required, options? }]
 *  - onCreate: optional async (formValues) => axios response
 *  - rowActions: optional [{ label, variant, show?: (row) => bool, onClick: async (row) => axios response }]
 *  - emptyLabel
 *  - summaryCards: optional [{ label, value }] (static, computed by caller)
 */
export default function AccountantResourcePage({
  title,
  subtitle,
  fetchList,
  columns,
  createFields,
  onCreate,
  rowActions,
  emptyLabel = "Nothing to show yet.",
  summaryCards,
}) {
  const [status, setStatus] = useState("loading"); // loading | error | success
  const [errorMessage, setErrorMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    setErrorMessage("");
    fetchList()
      .then((res) => {
        setRows(res.data?.data ?? []);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMessage(
          err?.response?.data?.message || "Failed to load data. Please try again."
        );
        setStatus("error");
      });
  }, [fetchList]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFieldChange = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await onCreate(formValues);
      setFormValues({});
      load();
    } catch (err) {
      setFormError(err?.response?.data?.message || "Failed to save. Please check the fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRowAction = async (action, row) => {
    setActionError("");
    try {
      await action.onClick(row);
      load();
    } catch (err) {
      setActionError(err?.response?.data?.message || "Action failed.");
    }
  };

  return (
    <div className="acs-root">
      <div className="acs-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      {summaryCards && summaryCards.length > 0 && (
        <div className="acs-summary-row">
          {summaryCards.map((c) => (
            <div className="acs-summary-card" key={c.label}>
              <div className="acs-summary-label">{c.label}</div>
              <div className="acs-summary-value">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {createFields && onCreate && (
        <form className="acs-form" onSubmit={handleCreate}>
          {createFields.map((f) => (
            <div className="acs-field" key={f.name}>
              <label htmlFor={f.name}>{f.label}{f.required && " *"}</label>
              {f.type === "select" ? (
                <select
                  id={f.name}
                  value={formValues[f.name] ?? ""}
                  required={f.required}
                  onChange={(e) => handleFieldChange(f.name, e.target.value)}
                >
                  <option value="">Select…</option>
                  {(f.options || []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  id={f.name}
                  type={f.type || "text"}
                  step={f.type === "number" ? "0.01" : undefined}
                  value={formValues[f.name] ?? ""}
                  required={f.required}
                  onChange={(e) => handleFieldChange(f.name, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="acs-form-actions">
            {formError && <p className="acs-error-text">{formError}</p>}
            <button type="submit" className="acs-btn" disabled={submitting}>
              {submitting ? "Saving…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {actionError && <p className="acs-error-text">{actionError}</p>}

      {status === "loading" && (
        <div className="acs-state">
          <div className="acs-spinner" aria-hidden="true" />
          <p>Loading…</p>
        </div>
      )}

      {status === "error" && (
        <div className="acs-state acs-state-error">
          <p>{errorMessage}</p>
          <button type="button" className="acs-btn" onClick={load}>Retry</button>
        </div>
      )}

      {status === "success" && (
        <div className="acs-panel">
          {rows.length === 0 ? (
            <div className="acs-empty">{emptyLabel}</div>
          ) : (
            <div className="acs-table-wrap">
            <table className="acs-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                  {rowActions && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>
                    ))}
                    {rowActions && (
                      <td>
                        {rowActions
                          .filter((a) => !a.show || a.show(row))
                          .map((a) => (
                            <button
                              key={a.label}
                              type="button"
                              className={`acs-btn acs-btn-sm ${a.variant ? `acs-btn-${a.variant}` : "acs-btn-secondary"}`}
                              style={{ marginRight: 6 }}
                              onClick={() => handleRowAction(a, row)}
                            >
                              {a.label}
                            </button>
                          ))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
