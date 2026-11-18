// ===== FILE: APP_Vindia/app_vindia/src/pages/Finance/TravelClaims.jsx =====

import React, { useEffect, useMemo, useState } from "react";
import travelClaimsService from "../../services/travelClaimsService";
import { useAuth } from "../../context/useAuth";
import "./TravelClaims.css";

const PAY_ROLES = ["finance_manager", "ceo"];

const inr = (value) =>
  "\u20b9" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const TABS = ["Pending", "Paid", "All"];

const TravelClaims = () => {
  const { user } = useAuth();
  const role = String(user?.role || "").toLowerCase().replace(/[\s-]+/g, "_");
  const canPay = PAY_ROLES.includes(role);

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [payingClaim, setPayingClaim] = useState(null);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const loadClaims = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await travelClaimsService.getClaims();
      setClaims(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load travel claims:", err);
      setClaims([]);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not load travel claims."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClaims();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const pending = claims.filter((c) => c.finance_status === "Pending");
    const paid = claims.filter((c) => c.finance_status === "Paid");
    return {
      pendingCount: pending.length,
      pendingTotal: pending.reduce((s, c) => s + Number(c.total_amount || 0), 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((s, c) => s + Number(c.total_amount || 0), 0),
    };
  }, [claims]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return claims.filter((c) => {
      if (tab !== "All" && c.finance_status !== tab) return false;
      if (!q) return true;
      return [c.request_no, c.employee_name, c.trip_title, c.destination, c.project_name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [claims, tab, search]);

  const openPay = (claim) => {
    setPayingClaim(claim);
    setReference("");
    setNote("");
    setModalError("");
  };

  const closePay = () => {
    if (saving) return;
    setPayingClaim(null);
  };

  const confirmPay = async () => {
    if (!payingClaim) return;
    try {
      setSaving(true);
      setModalError("");
      await travelClaimsService.markPaid(payingClaim.id, {
        reference: reference.trim(),
        note: note.trim(),
      });
      setToast(`${payingClaim.request_no} marked as paid.`);
      setPayingClaim(null);
      await loadClaims();
    } catch (err) {
      console.error("Failed to mark claim as paid:", err);
      setModalError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Could not mark this claim as paid."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ftc-root">
      <div className="ftc-header">
        <div>
          <p className="ftc-eyebrow">Finance</p>
          <h1 className="ftc-title">Travel Claims</h1>
          <p className="ftc-sub">
            Travel requests approved by HR or the CEO that are waiting for payment.
          </p>
        </div>
      </div>

      {toast && <div className="ftc-toast">{toast}</div>}
      {error && <div className="ftc-error">{error}</div>}

      <div className="ftc-stats">
        <div className="ftc-stat">
          <span className="ftc-stat-label">Awaiting payment</span>
          <span className="ftc-stat-value">{stats.pendingCount}</span>
          <span className="ftc-stat-hint">{inr(stats.pendingTotal)} entered so far</span>
        </div>
        <div className="ftc-stat">
          <span className="ftc-stat-label">Paid</span>
          <span className="ftc-stat-value">{stats.paidCount}</span>
          <span className="ftc-stat-hint">{inr(stats.paidTotal)}</span>
        </div>
      </div>

      <div className="ftc-toolbar">
        <div className="ftc-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`ftc-tab ${tab === t ? "ftc-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          className="ftc-search"
          type="text"
          placeholder="Search request no, employee, trip or project"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="ftc-state">Loading travel claims...</div>
      ) : visible.length === 0 ? (
        <div className="ftc-state">
          {tab === "Pending"
            ? "No travel claims are waiting for payment."
            : "No travel claims match this view."}
        </div>
      ) : (
        <div className="ftc-list">
          {visible.map((c) => {
            const expanded = expandedId === c.id;
            const total = Number(c.total_amount || 0);
            const expenses = Array.isArray(c.manual_expenses) ? c.manual_expenses : [];
            const receipts = Array.isArray(c.receipts) ? c.receipts : [];
            const isPaid = c.finance_status === "Paid";

            return (
              <div className="ftc-card" key={c.id}>
                <div className="ftc-card-top">
                  <div>
                    <div className="ftc-card-no">{c.request_no}</div>
                    <div className="ftc-card-name">{c.employee_name}</div>
                    <div className="ftc-card-meta">
                      {[c.designation, c.department].filter(Boolean).join(" \u00b7 ")}
                    </div>
                  </div>
                  <div className="ftc-card-right">
                    <span className={`ftc-badge ${isPaid ? "ftc-badge--paid" : "ftc-badge--pending"}`}>
                      {isPaid ? "Paid" : "Awaiting payment"}
                    </span>
                    <span className="ftc-mode">
                      {c.payment_mode === "self" ? "Reimbursement" : "Company-paid"}
                    </span>
                  </div>
                </div>

                <div className="ftc-card-grid">
                  <div>
                    <span className="ftc-k">Trip</span>
                    <span className="ftc-v">
                      {c.trip_title || "-"}
                      <br />
                      {[c.origin, c.destination].filter(Boolean).join(" \u2192 ") || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="ftc-k">Dates</span>
                    <span className="ftc-v">
                      {formatDate(c.travel_from_date)} - {formatDate(c.travel_to_date)}
                    </span>
                  </div>
                  <div>
                    <span className="ftc-k">Charged to</span>
                    <span className="ftc-v">
                      {c.budget_type === "project" ? c.project_name || "Project" : "Company budget"}
                    </span>
                  </div>
                  <div>
                    <span className="ftc-k">Amount</span>
                    <span className="ftc-v ftc-amount">
                      {total > 0 ? inr(total) : <em className="ftc-missing">Not entered by HR</em>}
                    </span>
                  </div>
                </div>

                {isPaid && (
                  <div className="ftc-paid-info">
                    Paid on {formatDateTime(c.finance_paid_at)}
                    {c.finance_paid_by_name ? ` by ${c.finance_paid_by_name}` : ""}
                    {c.finance_reference ? ` \u00b7 Ref: ${c.finance_reference}` : ""}
                    {c.finance_note ? ` \u00b7 ${c.finance_note}` : ""}
                  </div>
                )}

                {expanded && (
                  <div className="ftc-details">
                    <div className="ftc-detail-block">
                      <span className="ftc-k">Purpose</span>
                      <span className="ftc-v">{c.purpose || "-"}</span>
                    </div>
                    {c.review_note && (
                      <div className="ftc-detail-block">
                        <span className="ftc-k">Approval note</span>
                        <span className="ftc-v">{c.review_note}</span>
                      </div>
                    )}
                    <div className="ftc-detail-block">
                      <span className="ftc-k">Expenses entered by HR</span>
                      {expenses.length === 0 ? (
                        <span className="ftc-v">None</span>
                      ) : (
                        <table className="ftc-table">
                          <thead>
                            <tr>
                              <th>Category</th>
                              <th>Description</th>
                              <th className="ftc-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.map((e, i) => (
                              <tr key={i}>
                                <td>{[e.category, e.type].filter(Boolean).join(" / ") || "-"}</td>
                                <td>{e.description || "-"}</td>
                                <td className="ftc-right">{inr(e.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                    <div className="ftc-detail-block">
                      <span className="ftc-k">Receipts submitted</span>
                      {receipts.length === 0 ? (
                        <span className="ftc-v">None</span>
                      ) : (
                        <div className="ftc-chips">
                          {receipts.map((r) => (
                            <span className="ftc-chip" key={r.id}>
                              {r.file_name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="ftc-actions">
                  <button
                    type="button"
                    className="ftc-link-btn"
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                  >
                    {expanded ? "Hide details" : "View details"}
                  </button>
                  {!isPaid && canPay && (
                    <button type="button" className="ftc-pay-btn" onClick={() => openPay(c)}>
                      Mark as paid
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {payingClaim && (
        <div className="ftc-modal-bg" onClick={closePay}>
          <div className="ftc-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="ftc-modal-title">Mark {payingClaim.request_no} as paid</h3>
            <p className="ftc-modal-sub">
              {payingClaim.employee_name} &mdash;{" "}
              {Number(payingClaim.total_amount || 0) > 0
                ? inr(payingClaim.total_amount)
                : "no amount entered by HR"}{" "}
              ({payingClaim.payment_mode === "self" ? "reimbursement" : "company-paid"})
            </p>

            {Number(payingClaim.total_amount || 0) <= 0 && (
              <div className="ftc-warn">
                HR has not entered any expense amounts for this request. You can still mark it
                paid, but check the amount with HR first.
              </div>
            )}

            <label className="ftc-field">
              <span>Payment reference (optional)</span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="UTR / cheque no / voucher no"
                maxLength={120}
              />
            </label>
            <label className="ftc-field">
              <span>Note (optional)</span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything HR or the employee should know"
              />
            </label>

            {modalError && <div className="ftc-error">{modalError}</div>}

            <div className="ftc-modal-actions">
              <button type="button" className="ftc-cancel-btn" onClick={closePay} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="ftc-pay-btn" onClick={confirmPay} disabled={saving}>
                {saving ? "Saving..." : "Confirm payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelClaims;