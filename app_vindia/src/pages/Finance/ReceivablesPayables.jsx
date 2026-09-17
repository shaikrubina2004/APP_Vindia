import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useAuth } from "../../context/useAuth";
import financeService from "../../services/financeService";
import "./Receivablespayables.css";

// ─── Pure helpers ─────────────────────────────────────────────────────────────
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const money = (v) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num(v));

const pct = (part, total) =>
  total > 0 ? Math.min((part / total) * 100, 100) : 0;

const dateText = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const getArr = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.results)) return d.results;
  return [];
};

const pick = (item, ...keys) => {
  for (const k of keys) {
    if (item?.[k] != null && item[k] !== "") return item[k];
  }
  return null;
};

const displayName = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return String(
      value.name ??
        value.project_name ??
        value.projectName ??
        value.vendor_name ??
        value.vendorName ??
        value.title ??
        value.label ??
        fallback,
    );
  }
  return fallback;
};

const projectName = (item) =>
  displayName(
    pick(item, "project_name", "projectName", "project"),
    "Unlinked project",
  );

const vendorName = (item) =>
  displayName(
    pick(item, "vendor_name", "vendorName", "vendor"),
    "Unlinked vendor",
  );

const projectId = (item) =>
  String(item?.project_id ?? item?.projectId ?? "");

const vendorId = (item) =>
  String(item?.vendor_id ?? item?.vendorId ?? "");

const invoiceAmount = (item) =>
  num(
    pick(
      item,
      "amount",
      "total_amount",
      "invoice_amount",
      "expense_amount",
      "payment_amount",
    ) ?? 0,
  );

const statusOf = (item) =>
  String(item?.status ?? "")
    .trim()
    .toLowerCase();

const paymentType = (p) =>
  String(p?.payment_type ?? p?.paymentType ?? "")
    .trim()
    .toLowerCase();

const isIncoming = (p) =>
  ["", "incoming", "receivable", "customer"].includes(paymentType(p));

const isOutgoing = (p) =>
  ["outgoing", "payable", "vendor"].includes(paymentType(p));

const isComplete = (p) =>
  ["completed", "complete", "paid", "success", "successful"].includes(
    statusOf(p),
  );

const isPending = (p) =>
  ["pending", "processing", "scheduled"].includes(statusOf(p));

const isOverdue = (dueDate, outstanding) => {
  if (!dueDate || outstanding <= 0) return false;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return false;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due < today;
};

const badgeVariant = (state) => {
  const s = state.toLowerCase();
  if (s === "paid") return "success";
  if (s === "overdue") return "danger";
  if (s === "partially paid") return "info";
  return "warning";
};

// ─── CSV export ───────────────────────────────────────────────────────────────
const exportCSV = (rows, tab) => {
  const receivableCols = [
    "Invoice",
    "Client",
    "Project",
    "Invoice Date",
    "Due Date",
    "Total",
    "Received",
    "Outstanding",
    "Status",
  ];
  const payableCols = [
    "Vendor",
    "Project",
    "Expenses",
    "Paid",
    "Pending",
    "Outstanding",
    "Status",
  ];
  const cols = tab === "receivables" ? receivableCols : payableCols;

  const toRow = (r) =>
    tab === "receivables"
      ? [
          r.invoiceNumber,
          r.clientName,
          r.projectName,
          dateText(r.invoiceDate),
          dateText(r.dueDate),
          r.total,
          r.received,
          r.outstanding,
          r.state,
        ]
      : [
          r.vendorName,
          r.projectName,
          r.expenses,
          r.paid,
          r.pending,
          r.outstanding,
          r.state,
        ];

  const csv = [cols, ...rows.map(toRow)]
    .map((row) => row.map((v) => `"${v}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Mini bar chart (SVG, no dependencies) ───────────────────────────────────
const BarChart = ({ data, color }) => {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 320;
  const H = 90;
  const pad = { l: 6, r: 6, t: 8, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const barW = Math.floor(innerW / data.length) - 4;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * innerH, 2);
        const x = pad.l + i * (innerW / data.length) + 2;
        const y = pad.t + innerH - bh;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={bh}
              rx={3}
              fill={color}
              opacity={0.85}
            />
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── Donut chart ──────────────────────────────────────────────────────────────
const Donut = ({ paid, outstanding, overdue }) => {
  const total = paid + outstanding + overdue || 1;
  const R = 36;
  const C = 2 * Math.PI * R;
  const paidPct = paid / total;
  const outPct = outstanding / total;
  const segments = [
    { color: "#22c55e", dash: paidPct * C, offset: 0 },
    {
      color: "#f59e0b",
      dash: outPct * C,
      offset: paidPct * C,
    },
    {
      color: "#ef4444",
      dash: (overdue / total) * C,
      offset: (paidPct + outPct) * C,
    },
  ];
  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={R} fill="none" stroke="#f1f5f9" strokeWidth={10} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={45}
          cy={45}
          r={R}
          fill="none"
          stroke={s.color}
          strokeWidth={10}
          strokeDasharray={`${s.dash} ${C - s.dash}`}
          strokeDashoffset={C * 0.25 - s.offset}
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      ))}
      <text
        x={45}
        y={49}
        textAnchor="middle"
        fontSize={11}
        fontWeight={700}
        fill="#0f172a"
      >
        {Math.round(pct(paid, total))}%
      </text>
    </svg>
  );
};

// ─── MANAGER_ROLES ────────────────────────────────────────────────────────────
const ALLOWED_ROLES = ["accountant", "finance_manager", "ceo", "admin"];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = ``;

// ─── Main component ───────────────────────────────────────────────────────────
const ReceivablesPayables = () => {
  const { user } = useAuth();

  const normalizedRole = String(user?.role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const canView = ALLOWED_ROLES.includes(normalizedRole);

  // ── Data state ────────────────────────────────────────────────
  const [invoices,  setInvoices]  = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [expenses,  setExpenses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  // ── UI state ──────────────────────────────────────────────────
  const [tab,           setTab]           = useState("receivables");
  const [search,        setSearch]        = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [vendorFilter,  setVendorFilter]  = useState("all");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [sortKey,       setSortKey]       = useState("outstanding");
  const [sortDir,       setSortDir]       = useState("desc");
  const [expandedId,    setExpandedId]    = useState(null);

  // ── Load data ─────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [invRes, payRes, expRes] = await Promise.all([
        financeService.getAllInvoices(),
        financeService.getAllPayments(),
        financeService.getAllExpenses(),
      ]);
      setInvoices(getArr(invRes));
      setPayments(getArr(payRes));
      setExpenses(getArr(expRes));
    } catch (err) {
      console.error("ReceivablesPayables load error:", err);
      setError(
        err?.response?.data?.message ??
          "Unable to load financial data. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) loadData();
    else setLoading(false);
  }, [canView, loadData]);

  // ── Computed: receivables ─────────────────────────────────────
  const receivables = useMemo(() => {
    const paidMap = {};
    payments
      .filter((p) => isIncoming(p) && isComplete(p))
      .forEach((p) => {
        const id = p?.invoice_id ?? p?.invoiceId;
        if (id) paidMap[id] = num(paidMap[id]) + num(p.amount);
      });

    return invoices.map((inv) => {
      const total       = invoiceAmount(inv);
      const received    = Math.min(num(paidMap[inv.id]), total);
      const outstanding = Math.max(total - received, 0);
      const dueDate     = inv?.due_date ?? inv?.dueDate;

      let state = "Outstanding";
      if (outstanding <= 0) state = "Paid";
      else if (isOverdue(dueDate, outstanding)) state = "Overdue";
      else if (received > 0) state = "Partially Paid";

      return {
        ...inv,
        _id: String(inv.id ?? Math.random()),
        total,
        received,
        outstanding,
        state,
        projectKey:    projectId(inv),
        projectName:   projectName(inv),
        clientName:    displayName(
          pick(inv, "client_name", "clientName", "customer_name", "customerName"),
          "—",
        ),
        invoiceNumber: String(pick(inv, "invoice_number", "invoiceNumber", "id") ?? "—"),
        invoiceDate:   inv?.invoice_date ?? inv?.invoiceDate ?? inv?.created_at,
        dueDate,
      };
    });
  }, [invoices, payments]);

  // ── Computed: payables ────────────────────────────────────────
  const payables = useMemo(() => {
    const groups = {};

    const grp = (item) => {
      const vid  = vendorId(item);
      const pid  = projectId(item);
      const vn   = vendorName(item);
      const pn   = projectName(item);
      const key  = `${vid || vn}|${pid || pn}`;
      if (!groups[key]) {
        groups[key] = { key, vendorId: vid, vendorName: vn, projectId: pid, projectName: pn, expenses: 0, paid: 0, pending: 0 };
      }
      return groups[key];
    };

    expenses.forEach((e) => {
      grp(e).expenses += num(
        pick(e, "amount", "expense_amount", "total_amount") ?? 0,
      );
    });

    payments.filter(isOutgoing).forEach((p) => {
      const g = grp(p);
      if (isComplete(p)) g.paid    += num(p.amount);
      else if (isPending(p)) g.pending += num(p.amount);
    });

    return Object.values(groups).map((g) => ({
      ...g,
      _id:         g.key,
      outstanding: Math.max(g.expenses - g.paid, 0),
      state:
        g.expenses <= g.paid
          ? "Paid"
          : g.paid > 0
          ? "Partially Paid"
          : "Outstanding",
    }));
  }, [expenses, payments]);

  // ── Filter & sort ─────────────────────────────────────────────
  const records = useMemo(() => {
    const src = tab === "receivables" ? receivables : payables;
    const q   = search.trim().toLowerCase();

    const filtered = src.filter((r) => {
      const text =
        tab === "receivables"
          ? `${r.invoiceNumber} ${r.clientName} ${r.projectName} ${r.state}`
          : `${r.vendorName} ${r.projectName} ${r.state}`;

      return (
        (!q || text.toLowerCase().includes(q)) &&
        (projectFilter === "all" ||
          r.projectKey === projectFilter ||
          r.projectName === projectFilter) &&
        (tab === "receivables" ||
          vendorFilter === "all" ||
          r.vendorId === vendorFilter ||
          r.vendorName === vendorFilter) &&
        (statusFilter === "all" ||
          r.state.toLowerCase() === statusFilter.toLowerCase())
      );
    });

    return [...filtered].sort((a, b) => {
      const av = num(a[sortKey] ?? 0);
      const bv = num(b[sortKey] ?? 0);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [
    tab, receivables, payables,
    search, projectFilter, vendorFilter, statusFilter,
    sortKey, sortDir,
  ]);

  // ── Metrics ───────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (tab === "receivables") {
      const total       = receivables.reduce((s, r) => s + r.total, 0);
      const received    = receivables.reduce((s, r) => s + r.received, 0);
      const outstanding = receivables.reduce((s, r) => s + r.outstanding, 0);
      const overdue     = receivables.filter((r) => r.state === "Overdue").reduce((s, r) => s + r.outstanding, 0);
      return { total, received, outstanding, overdue };
    }
    const total       = payables.reduce((s, r) => s + r.expenses, 0);
    const paid        = payables.reduce((s, r) => s + r.paid, 0);
    const outstanding = payables.reduce((s, r) => s + r.outstanding, 0);
    const pending     = payables.reduce((s, r) => s + r.pending, 0);
    return { total, paid, outstanding, pending };
  }, [tab, receivables, payables]);

  // ── Project / vendor options ──────────────────────────────────
  const projectOptions = useMemo(() => {
    const map = new Map();
    [...invoices, ...expenses, ...payments].forEach((i) => {
      const k = projectId(i), v = projectName(i);
      map.set(k || v, v);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [invoices, expenses, payments]);

  const vendorOptions = useMemo(() => {
    const map = new Map();
    [...expenses, ...payments].forEach((i) => {
      const k = vendorId(i), v = vendorName(i);
      map.set(k || v, v);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [expenses, payments]);

  // ── Bar chart data (top 6 by outstanding) ────────────────────
  const barData = useMemo(() => {
    const src = tab === "receivables" ? receivables : payables;
    return [...src]
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, 6)
      .map((r) => ({
        label: (tab === "receivables" ? r.clientName : r.vendorName)
          .split(" ")[0]
          .slice(0, 8),
        value: r.outstanding,
      }));
  }, [tab, receivables, payables]);

  // ── Sort handler ──────────────────────────────────────────────
  const handleSort = useCallback(
    (key) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else { setSortKey(key); setSortDir("desc"); }
    },
    [sortKey],
  );

  const SortIcon = ({ k }) => (
    <span className={`rp-sort ${sortKey === k ? "active" : ""}`}>
      {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "⇅"}
    </span>
  );

  // ── Reset filters on tab change ───────────────────────────────
  const switchTab = (t) => {
    setTab(t);
    setSearch("");
    setProjectFilter("all");
    setVendorFilter("all");
    setStatusFilter("all");
    setSortKey("outstanding");
    setSortDir("desc");
    setExpandedId(null);
  };

  // ── Access denied ─────────────────────────────────────────────
  if (!canView) {
    return (
      <>
        <div className="rp-root">
          <div className="rp-denied">
            <span style={{ fontSize: 32 }}>🔒</span>
            <strong>Access restricted</strong>
            <span>This page is available to Finance team members only.</span>
          </div>
        </div>
      </>
    );
  }

  const completionPct = pct(
    tab === "receivables" ? metrics.received : metrics.paid,
    metrics.total,
  );

  return (
    <>
      <main className="rp-root">

        {/* ── Header ── */}
        <header className="rp-header">
          <div>
            <h1 className="rp-title">Receivables & Payables</h1>
            <p className="rp-subtitle">
              Live view of customer collections and vendor obligations.
            </p>
          </div>
          <div className="rp-header-actions">
            <button
              className="rp-btn"
              onClick={() => exportCSV(records, tab)}
              disabled={records.length === 0}
            >
              ↓ Export CSV
            </button>
            <button
              className="rp-btn"
              onClick={() => { setSearch(""); setProjectFilter("all"); setVendorFilter("all"); setStatusFilter("all"); }}
            >
              Clear filters
            </button>
            <button
              className="rp-btn rp-btn-primary"
              onClick={loadData}
              disabled={loading}
            >
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
          </div>
        </header>

        {error && <div className="rp-error">⚠ {error}</div>}

        {/* ── Tabs ── */}
        <div className="rp-tabs">
          <button className={`rp-tab ${tab === "receivables" ? "active" : ""}`} onClick={() => switchTab("receivables")}>
            Receivables
          </button>
          <button className={`rp-tab ${tab === "payables" ? "active" : ""}`} onClick={() => switchTab("payables")}>
            Payables
          </button>
        </div>

        {loading ? (
          <div className="rp-section"><div className="rp-empty">Loading financial data…</div></div>
        ) : (
          <>
            {/* ── Metric cards ── */}
            <div className="rp-metrics">
              {tab === "receivables" ? (
                <>
                  <div className="rp-metric" style={{ "--accent": "#3b82f6" }}>
                    <div className="rp-metric-label">Total invoiced</div>
                    <div className="rp-metric-value">{money(metrics.total)}</div>
                    <div className="rp-metric-sub">{receivables.length} invoices</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#22c55e" }}>
                    <div className="rp-metric-label">Received</div>
                    <div className="rp-metric-value">{money(metrics.received)}</div>
                    <div className="rp-metric-sub">{completionPct.toFixed(1)}% collected</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#f59e0b" }}>
                    <div className="rp-metric-label">Outstanding</div>
                    <div className="rp-metric-value">{money(metrics.outstanding)}</div>
                    <div className="rp-metric-sub">{receivables.filter(r => r.state !== "Paid").length} open</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#ef4444" }}>
                    <div className="rp-metric-label">Overdue</div>
                    <div className="rp-metric-value">{money(metrics.overdue)}</div>
                    <div className="rp-metric-sub">{receivables.filter(r => r.state === "Overdue").length} invoices</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="rp-metric" style={{ "--accent": "#3b82f6" }}>
                    <div className="rp-metric-label">Total payables</div>
                    <div className="rp-metric-value">{money(metrics.total)}</div>
                    <div className="rp-metric-sub">{payables.length} vendors</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#22c55e" }}>
                    <div className="rp-metric-label">Paid to vendors</div>
                    <div className="rp-metric-value">{money(metrics.paid)}</div>
                    <div className="rp-metric-sub">{completionPct.toFixed(1)}% settled</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#f59e0b" }}>
                    <div className="rp-metric-label">Outstanding</div>
                    <div className="rp-metric-value">{money(metrics.outstanding)}</div>
                    <div className="rp-metric-sub">{payables.filter(r => r.state !== "Paid").length} open</div>
                  </div>
                  <div className="rp-metric" style={{ "--accent": "#8b5cf6" }}>
                    <div className="rp-metric-label">Pending payments</div>
                    <div className="rp-metric-value">{money(metrics.pending)}</div>
                    <div className="rp-metric-sub">Scheduled / processing</div>
                  </div>
                </>
              )}
            </div>

            {/* ── Charts ── */}
            <div className="rp-charts">
              <div className="rp-chart-card">
                <div className="rp-chart-title">
                  Top outstanding {tab === "receivables" ? "clients" : "vendors"}
                </div>
                {barData.length > 0
                  ? <BarChart data={barData} color={tab === "receivables" ? "#3b82f6" : "#8b5cf6"} />
                  : <div className="rp-empty" style={{ padding: "20px 0" }}>No data</div>}
              </div>

              <div className="rp-chart-card">
                <div className="rp-chart-title">Collection breakdown</div>
                <div className="rp-donut-row">
                  {tab === "receivables"
                    ? <Donut
                        paid={metrics.received}
                        outstanding={metrics.outstanding - metrics.overdue}
                        overdue={metrics.overdue}
                      />
                    : <Donut
                        paid={metrics.paid}
                        outstanding={metrics.outstanding}
                        overdue={0}
                      />
                  }
                  <div className="rp-donut-legend">
                    <div className="rp-legend-item">
                      <span className="rp-legend-dot" style={{ background: "#22c55e" }} />
                      {tab === "receivables" ? "Received" : "Paid"} — {money(tab === "receivables" ? metrics.received : metrics.paid)}
                    </div>
                    <div className="rp-legend-item">
                      <span className="rp-legend-dot" style={{ background: "#f59e0b" }} />
                      Outstanding — {money(
                          tab === "receivables"
                            ? Math.max(metrics.outstanding - metrics.overdue, 0)
                            : metrics.outstanding,
                        )}
                    </div>
                    {tab === "receivables" && (
                      <div className="rp-legend-item">
                        <span className="rp-legend-dot" style={{ background: "#ef4444" }} />
                        Overdue — {money(metrics.overdue)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="rp-progress-wrap" style={{ marginTop: 16 }}>
                  <div className="rp-progress-label">
                    <span>Settlement progress</span>
                    <span>{completionPct.toFixed(1)}%</span>
                  </div>
                  <div className="rp-progress">
                    <div className="rp-progress-bar" style={{ width: `${completionPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Filters ── */}
            <div className="rp-filters">
              <input
                className="rp-filter-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "receivables"
                    ? "Search invoice, client, project…"
                    : "Search vendor, project…"
                }
              />
              <select className="rp-filter-select" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
                <option value="all">All projects</option>
                {projectOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              {tab === "payables" && (
                <select className="rp-filter-select" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
                  <option value="all">All vendors</option>
                  {vendorOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              )}
              <select className="rp-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Partially Paid">Partially paid</option>
                <option value="Outstanding">Outstanding</option>
                {tab === "receivables" && <option value="Overdue">Overdue</option>}
              </select>
            </div>

            {/* ── Table ── */}
            <div className="rp-section">
              <div className="rp-section-head">
                <h2>
                  {tab === "receivables" ? "Receivable invoices" : "Vendor payables"}
                </h2>
                <span>{records.length} record{records.length !== 1 ? "s" : ""}</span>
              </div>

              <div className="rp-table-wrap">
                {tab === "receivables" ? (
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Invoice</th>
                        <th>Client</th>
                        <th>Project</th>
                        <th>Invoice date</th>
                        <th>Due date</th>
                        <th onClick={() => handleSort("total")}>
                          Amount <SortIcon k="total" />
                        </th>
                        <th onClick={() => handleSort("received")}>
                          Received <SortIcon k="received" />
                        </th>
                        <th onClick={() => handleSort("outstanding")}>
                          Outstanding <SortIcon k="outstanding" />
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr><td colSpan={9} className="rp-empty">No invoices match your filters.</td></tr>
                      ) : records.map((r) => (
                        <React.Fragment key={r._id}>
                          <tr
                            className={expandedId === r._id ? "rp-expanded" : ""}
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setExpandedId(expandedId === r._id ? null : r._id);
                              }
                            }}
                          >
                            <td><strong>{r.invoiceNumber}</strong></td>
                            <td>{r.clientName}</td>
                            <td>{r.projectName}</td>
                            <td>{dateText(r.invoiceDate)}</td>
                            <td style={{ color: r.state === "Overdue" ? "#ef4444" : undefined }}>
                              {dateText(r.dueDate)}
                            </td>
                            <td className="rp-mono">{money(r.total)}</td>
                            <td className="rp-mono" style={{ color: "#22c55e" }}>{money(r.received)}</td>
                            <td className="rp-mono" style={{ fontWeight: 700 }}>{money(r.outstanding)}</td>
                            <td>
                              <span className={`rp-badge ${badgeVariant(r.state)}`}>{r.state}</span>
                            </td>
                          </tr>
                          {expandedId === r._id && (
                            <tr>
                              <td colSpan={9} style={{ padding: 0 }}>
                                <div className="rp-drill">
                                  <strong style={{ fontSize: 12 }}>Invoice details</strong>
                                  <div className="rp-drill-grid">
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Invoice number</span>
                                      <span className="rp-drill-value">{r.invoiceNumber}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Client</span>
                                      <span className="rp-drill-value">{r.clientName}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Project</span>
                                      <span className="rp-drill-value">{r.projectName}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Invoice date</span>
                                      <span className="rp-drill-value">{dateText(r.invoiceDate)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Due date</span>
                                      <span className="rp-drill-value" style={{ color: r.state === "Overdue" ? "#ef4444" : undefined }}>
                                        {dateText(r.dueDate)}
                                      </span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Total amount</span>
                                      <span className="rp-drill-value">{money(r.total)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Received</span>
                                      <span className="rp-drill-value" style={{ color: "#22c55e" }}>{money(r.received)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Outstanding</span>
                                      <span className="rp-drill-value" style={{ color: r.outstanding > 0 ? "#f59e0b" : "#22c55e" }}>{money(r.outstanding)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Collection</span>
                                      <span className="rp-drill-value">{pct(r.received, r.total).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="rp-table">
                    <thead>
                      <tr>
                        <th>Vendor</th>
                        <th>Project</th>
                        <th onClick={() => handleSort("expenses")}>
                          Expenses <SortIcon k="expenses" />
                        </th>
                        <th onClick={() => handleSort("paid")}>
                          Paid <SortIcon k="paid" />
                        </th>
                        <th onClick={() => handleSort("pending")}>
                          Pending <SortIcon k="pending" />
                        </th>
                        <th onClick={() => handleSort("outstanding")}>
                          Outstanding <SortIcon k="outstanding" />
                        </th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length === 0 ? (
                        <tr><td colSpan={7} className="rp-empty">No payable records match your filters.</td></tr>
                      ) : records.map((r) => (
                        <React.Fragment key={r._id}>
                          <tr
                            className={expandedId === r._id ? "rp-expanded" : ""}
                            role="button"
                            tabIndex={0}
                            onClick={() => setExpandedId(expandedId === r._id ? null : r._id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setExpandedId(expandedId === r._id ? null : r._id);
                              }
                            }}
                          >
                            <td><strong>{r.vendorName}</strong></td>
                            <td>{r.projectName}</td>
                            <td className="rp-mono">{money(r.expenses)}</td>
                            <td className="rp-mono" style={{ color: "#22c55e" }}>{money(r.paid)}</td>
                            <td className="rp-mono" style={{ color: "#8b5cf6" }}>{money(r.pending)}</td>
                            <td className="rp-mono" style={{ fontWeight: 700 }}>{money(r.outstanding)}</td>
                            <td>
                              <span className={`rp-badge ${badgeVariant(r.state)}`}>{r.state}</span>
                            </td>
                          </tr>
                          {expandedId === r._id && (
                            <tr>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <div className="rp-drill">
                                  <strong style={{ fontSize: 12 }}>Vendor payable details</strong>
                                  <div className="rp-drill-grid">
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Vendor</span>
                                      <span className="rp-drill-value">{r.vendorName}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Project</span>
                                      <span className="rp-drill-value">{r.projectName}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Total expenses</span>
                                      <span className="rp-drill-value">{money(r.expenses)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Paid</span>
                                      <span className="rp-drill-value" style={{ color: "#22c55e" }}>{money(r.paid)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Pending payments</span>
                                      <span className="rp-drill-value" style={{ color: "#8b5cf6" }}>{money(r.pending)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Outstanding</span>
                                      <span className="rp-drill-value" style={{ color: r.outstanding > 0 ? "#f59e0b" : "#22c55e" }}>{money(r.outstanding)}</span>
                                    </div>
                                    <div className="rp-drill-item">
                                      <span className="rp-drill-label">Settlement</span>
                                      <span className="rp-drill-value">{pct(r.paid, r.expenses).toFixed(1)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {tab === "payables" && (
              <div className="rp-note">
                Payables are grouped by vendor and project from recorded expenses, minus completed outgoing payments.
                "Unlinked vendor" or "Unlinked project" indicates missing data in expense or payment records.
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
};

export default ReceivablesPayables;