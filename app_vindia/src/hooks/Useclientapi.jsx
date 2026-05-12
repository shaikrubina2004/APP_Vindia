// hooks/useClientAPI.js
// Shared data-fetching hook used by every client page.
// Matches the project's existing pattern: API from authService + localStorage user.

import { useState, useEffect, useCallback } from "react";
import { API } from "../services/authService";

/**
 * Generic fetch hook.
 * Usage:  const { data, loading, error, refetch } = useClientAPI("/client/milestones");
 */
export function useClientAPI(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const res = await API.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Tiny loading skeleton placeholder.
 */
export function PageLoader() {
  return (
    <div className="cl-page">
      <div className="cl-empty">
        <div className="cl-empty__icon" style={{ fontSize: 28 }}>
          ⏳
        </div>
        <p>Loading…</p>
      </div>
    </div>
  );
}

/**
 * Full-page error state.
 */
export function PageError({ message, onRetry }) {
  return (
    <div className="cl-page">
      <div className="cl-empty">
        <div className="cl-empty__icon" style={{ fontSize: 28 }}>
          ⚠️
        </div>
        <p style={{ color: "var(--red)" }}>{message}</p>
        {onRetry && (
          <button
            className="cl-btn cl-btn--ghost"
            style={{ marginTop: 12 }}
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Format a date string for display.
 */
export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a number as Indian currency string.
 */
export function fmtINR(n) {
  if (n == null) return "—";
  return "₹" + Number(n).toLocaleString("en-IN");
}
