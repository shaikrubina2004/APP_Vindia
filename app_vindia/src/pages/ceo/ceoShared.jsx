// Small helpers shared by the CEO Dashboard, Analytics and Reports pages.
import { useState, useEffect, useCallback } from "react";
import { ceoDashboardService } from "../../services/ceoHubService";

/* ₹ formatting (Indian lakh / crore) */
export const inr = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(1)} L`;
  if (a >= 1e3) return `${sign}₹${(a / 1e3).toFixed(1)} K`;
  return `${sign}₹${a.toLocaleString("en-IN")}`;
};

export const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

/* status → chip colour */
export const statusChip = (s) => {
  switch (s) {
    case "on-track":
    case "ahead":
    case "approved":
      return "ceo-chip--ok";
    case "attention":
    case "delayed":
    case "pending":
      return "ceo-chip--warn";
    case "critical":
    case "rejected":
      return "ceo-chip--bad";
    default:
      return "";
  }
};

/* One request feeds Dashboard + Analytics */
export function useOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ceoDashboardService.overview();
      setData(res.data.data);
    } catch (err) {
      console.error("CEO overview failed:", err);
      setError(err?.response?.data?.message || "Couldn't load company data. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  return { data, loading, error, reload: load };
}

/* Recharts tooltip in the dark-navy style */
export function ChartTip({ active, payload, label, format = (v) => v }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="ceo-tooltip">
      {label !== undefined && <div><b>{label}</b></div>}
      {payload.map((p) => (
        <div key={p.dataKey || p.name}>
          {p.name}: <b>{format(p.value)}</b>
        </div>
      ))}
    </div>
  );
}

export function Card({ title, action, children, className = "", rule = false }) {
  return (
    <section className={`ceo-card ${className}`}>
      {(title || action) && (
        <>
          <div className="ceo-card__head">
            <h3 className="ceo-card__title">{title}</h3>
            {action}
          </div>
          {rule && <div className="ceo-card__rule" />}
        </>
      )}
      {children}
    </section>
  );
}

export const Empty = ({ children }) => <div className="ceo-empty">{children}</div>;

export function Skeletons({ n = 4, h = 190 }) {
  return (
    <div className="ceo-grid ceo-grid--kpi">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="ceo-skeleton" style={{ height: h }} />
      ))}
    </div>
  );
}

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}