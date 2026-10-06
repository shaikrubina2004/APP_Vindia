// hooks/Useclientapi.jsx
// Shared data hooks/helpers for every client page.
import { useState, useEffect, useCallback } from "react";
import { API } from "../services/authService";

// One place decides the backend origin (same env names as the rest of the app).
export const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:5000"
).replace(/\/+$/, "");

/**
 * Turn a stored upload path into a loadable URL.
 * Absolute, blob: and data: URLs (incident photos are stored as base64 data URLs)
 * are returned untouched - prefixing them with the server address broke every image.
 */
export function assetUrl(u) {
  if (!u) return "";
  const s = typeof u === "string" ? u : u.url || "";
  if (/^(data:|https?:|blob:)/i.test(s)) return s;
  return `${API_ORIGIN}${s.startsWith("/") ? "" : "/"}${s}`;
}

// A client with several projects picks one; the choice is sent as ?project_id=.
const PROJECT_KEY = "clientProjectId";
export const getClientProjectId = () => {
  try {
    return localStorage.getItem(PROJECT_KEY) || "";
  } catch {
    return "";
  }
};
export const setClientProjectId = (id) => {
  try {
    if (id) localStorage.setItem(PROJECT_KEY, String(id));
    else localStorage.removeItem(PROJECT_KEY);
  } catch {
    /* ignore */
  }
};
export const withClientProject = (endpoint) => {
  const id = getClientProjectId();
  if (!id || !endpoint) return endpoint;
  return `${endpoint}${endpoint.includes("?") ? "&" : "?"}project_id=${encodeURIComponent(id)}`;
};

/**
 * Generic fetch hook.
 * Usage:  const { data, loading, error, refetch } = useClientAPI("/client/milestones");
 * Ignores responses that arrive after the endpoint changed or the page unmounted.
 */
export function useClientAPI(endpoint) {
  const [state, setState] = useState({ data: null, loading: !!endpoint, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!endpoint) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    API.get(withClientProject(endpoint))
      .then((res) => {
        if (!cancelled) setState({ data: res.data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err?.response?.data?.message || "Failed to load data.",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [endpoint, tick]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);
  return { data: state.data, loading: state.loading, error: state.error, refetch };
}

export function PageLoader() {
  return (
    <div className="cl-page">
      <div className="cl-empty">
        <div className="cl-empty__icon" style={{ fontSize: 28 }}>⏳</div>
        <p>Loading…</p>
      </div>
    </div>
  );
}

export function PageError({ message, onRetry }) {
  return (
    <div className="cl-page">
      <div className="cl-empty">
        <div className="cl-empty__icon" style={{ fontSize: 28 }}>⚠️</div>
        <p style={{ color: "var(--red)" }}>{message}</p>
        {onRetry && (
          <button className="cl-btn cl-btn--ghost" style={{ marginTop: 12 }} onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Display a date. Plain YYYY-MM-DD strings are read as LOCAL dates: new Date("2026-04-09")
 * is UTC midnight, which shows the previous day west of UTC.
 */
export function fmtDate(d) {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  const date = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Indian-formatted rupees. */
export function fmtINR(n) {
  if (n == null || n === "" || Number.isNaN(Number(n))) return "—";
  return "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
