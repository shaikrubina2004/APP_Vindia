// src/pages/ceo/ClientManagement.jsx
// CEO-only client directory: overview cards, search, filters, sorting,
// pagination. Separate from the client-facing portal under /client/*.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FolderOpen,
  CheckCircle2,
  UserX,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Eye,
  Info,
} from "lucide-react";
import {
  fetchClients,
  getApiErrorMessage,
} from "../../services/ceoClientService";
import "./ClientManagement.css";

/* ── helpers ─────────────────────────────────────────────── */
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const PAGE_SIZE = 10;

const PROJECT_FILTERS = [
  { value: "all", label: "All clients" },
  { value: "with_projects", label: "Has projects" },
  { value: "active", label: "Has active projects" },
  { value: "completed", label: "Has completed projects" },
  { value: "other", label: "Pending / other only" },
  { value: "no_projects", label: "No assigned projects" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Client name" },
  { value: "projects", label: "Project count" },
  { value: "value", label: "Project value" },
];

const accountStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "cm-pill cm-pill--success";
  if (s === "pending") return "cm-pill cm-pill--warning";
  if (["inactive", "suspended", "blocked", "disabled"].includes(s))
    return "cm-pill cm-pill--danger";
  return "cm-pill cm-pill--neutral";
};

const titleCase = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "—";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

/* ── component ───────────────────────────────────────────── */
function ClientManagement() {
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null); // { summary, clients, pagination }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const controllerRef = useRef(null);

  /* debounce search so we don't query on every keystroke */
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const result = await fetchClients(
        {
          search: search || undefined,
          project_filter: projectFilter,
          sort,
          order,
          page,
          limit: PAGE_SIZE,
        },
        controller.signal,
      );
      setData(result);
    } catch (err) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      setError(getApiErrorMessage(err, "Failed to load clients."));
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, [search, projectFilter, sort, order, page]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  const summary = data?.summary;
  const clients = data?.clients || [];
  const pagination = data?.pagination;

  const hasActiveFilters = Boolean(search) || projectFilter !== "all";

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setProjectFilter("all");
    setPage(1);
  };

  const applyCardFilter = (value) => {
    setProjectFilter(value);
    setPage(1);
  };

  const openClient = (id) => navigate(`/ceo/clients/${id}`);

  const cards = [
    {
      key: "total",
      label: "Total Registered Clients",
      value: summary?.total_clients,
      hint: "All client accounts",
      icon: Users,
      tone: "blue",
      filter: "all",
    },
    {
      key: "active",
      label: "Clients With Active Projects",
      value: summary?.clients_with_active_projects,
      hint: "At least one active / in-progress project",
      icon: FolderOpen,
      tone: "indigo",
      filter: "active",
    },
    {
      key: "completed",
      label: "Clients With Completed Projects",
      value: summary?.clients_with_completed_projects,
      hint: "At least one completed project",
      icon: CheckCircle2,
      tone: "green",
      filter: "completed",
    },
    {
      key: "none",
      label: "Clients Without Projects",
      value: summary?.clients_without_projects,
      hint: "No project assigned yet",
      icon: UserX,
      tone: "amber",
      filter: "no_projects",
    },
  ];

  return (
    <div className="cm-page">
      {/* ── Header ── */}
      <header className="cm-header">
        <div>
          <h1 className="cm-title">Client Management</h1>
          <p className="cm-subtitle">
            View every registered client, their projects and their financial
            position in one place.
          </p>
        </div>
        <button
          type="button"
          className="cm-btn cm-btn--ghost"
          onClick={load}
          disabled={loading}
        >
          <RefreshCw size={15} className={loading ? "cm-spin" : ""} />
          Refresh
        </button>
      </header>

      {/* ── Overview cards ── */}
      <section className="cm-cards" aria-label="Client overview">
        {cards.map((card) => {
          const { key, label, value, hint, tone, filter } = card;
          const Icon = card.icon;
          return (
          <button
            type="button"
            key={key}
            className={`cm-card cm-card--${tone} ${
              projectFilter === filter && key !== "total" ? "is-selected" : ""
            }`}
            onClick={() => applyCardFilter(filter)}
            title={`Show: ${label}`}
          >
            <span className="cm-card__icon">
              <Icon size={20} />
            </span>
            <span className="cm-card__body">
              <span className="cm-card__label">{label}</span>
              <span className="cm-card__value">
                {summary ? (
                  value
                ) : (
                  <span className="cm-skeleton cm-skeleton--num" />
                )}
              </span>
              <span className="cm-card__hint">{hint}</span>
            </span>
          </button>
          );
        })}
      </section>

      <p className="cm-note">
        <Info size={14} />
        <span>
          A client with several projects is counted once per card. Projects are
          linked to clients through the client account chosen when the project
          was created.
          {summary?.projects_without_client_account > 0 && (
            <>
              {" "}
              <strong>{summary.projects_without_client_account}</strong>{" "}
              project(s) have no client account linked and are not attributed
              to any client below.
            </>
          )}
        </span>
      </p>

      {/* ── Toolbar ── */}
      <section className="cm-toolbar">
        <div className="cm-search">
          <Search size={16} className="cm-search__icon" />
          {/* type="search" on purpose: global.css restyles input[type=text] */}
          <input
            type="search"
            className="cm-search__input"
            placeholder="Search by name, email or client ID"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search clients"
          />
        </div>

        <label className="cm-field">
          <span className="cm-field__label">Projects</span>
          <select
            className="cm-select"
            value={projectFilter}
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setPage(1);
            }}
          >
            {PROJECT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="cm-field">
          <span className="cm-field__label">Sort by</span>
          <select
            className="cm-select"
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="cm-btn cm-btn--outline cm-btn--icon"
          onClick={() => {
            setOrder((o) => (o === "asc" ? "desc" : "asc"));
            setPage(1);
          }}
          aria-label={`Sort order: ${order === "asc" ? "ascending" : "descending"}`}
          title={order === "asc" ? "Ascending" : "Descending"}
        >
          {order === "asc" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
          <span className="cm-hide-sm">{order === "asc" ? "Asc" : "Desc"}</span>
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            className="cm-btn cm-btn--link"
            onClick={clearFilters}
          >
            Clear filters
          </button>
        )}
      </section>

      {/* ── Directory ── */}
      <section className="cm-panel" aria-live="polite">
        {error ? (
          <div className="cm-state cm-state--error" role="alert">
            <AlertTriangle size={28} />
            <h3>Unable to load clients</h3>
            <p>{error}</p>
            <button type="button" className="cm-btn cm-btn--primary" onClick={load}>
              <RefreshCw size={15} /> Try again
            </button>
          </div>
        ) : loading && !data ? (
          <div className="cm-table-wrap">
            <table className="cm-table">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={9}>
                      <span className="cm-skeleton cm-skeleton--row" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : clients.length === 0 ? (
          <div className="cm-state">
            <ArrowUpDown size={28} />
            <h3>
              {hasActiveFilters
                ? "No clients match your search"
                : "No clients registered yet"}
            </h3>
            <p>
              {hasActiveFilters
                ? "Try a different name, email or ID, or clear the filters."
                : "Client accounts will appear here once they are created."}
            </p>
            {hasActiveFilters && (
              <button type="button" className="cm-btn cm-btn--outline" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={`cm-table-wrap ${loading ? "is-loading" : ""}`}>
              <table className="cm-table">
                <thead>
                  <tr>
                    <th>Client ID</th>
                    <th>Client</th>
                    <th>Phone</th>
                    <th className="cm-num">Projects</th>
                    <th className="cm-num">Active</th>
                    <th className="cm-num">Completed</th>
                    <th className="cm-num">Combined budget</th>
                    <th>Status</th>
                    <th className="cm-actions-col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td data-label="Client ID">
                        <span className="cm-code">{c.client_code}</span>
                      </td>
                      <td data-label="Client">
                        <div className="cm-client">
                          <span className="cm-avatar">{initials(c.name)}</span>
                          <span className="cm-client__text">
                            <span className="cm-client__name">{c.name}</span>
                            <span className="cm-client__email">{c.email}</span>
                          </span>
                        </div>
                      </td>
                      <td data-label="Phone">{c.phone || "—"}</td>
                      <td data-label="Projects" className="cm-num">
                        {c.total_projects === 0 ? (
                          <span className="cm-pill cm-pill--neutral">None</span>
                        ) : (
                          <strong>{c.total_projects}</strong>
                        )}
                      </td>
                      <td data-label="Active" className="cm-num">
                        {c.active_projects}
                      </td>
                      <td data-label="Completed" className="cm-num">
                        {c.completed_projects}
                      </td>
                      <td data-label="Combined budget" className="cm-num">
                        {c.total_projects ? inr(c.total_budget) : "—"}
                      </td>
                      <td data-label="Status">
                        <span className={accountStatusClass(c.status)}>
                          {titleCase(c.status)}
                        </span>
                      </td>
                      <td data-label="Action" className="cm-actions-col">
                        <button
                          type="button"
                          className="cm-btn cm-btn--outline cm-btn--sm"
                          onClick={() => openClient(c.id)}
                        >
                          <Eye size={14} /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="cm-pagination">
              <span className="cm-pagination__info">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} client{pagination.total === 1 ? "" : "s"}
              </span>
              <div className="cm-pagination__controls">
                <button
                  type="button"
                  className="cm-btn cm-btn--outline cm-btn--sm"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span className="cm-pagination__page">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button
                  type="button"
                  className="cm-btn cm-btn--outline cm-btn--sm"
                  disabled={pagination.page >= pagination.total_pages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default ClientManagement;