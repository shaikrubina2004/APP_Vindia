import React, { useState, useEffect, useContext } from "react";
import "./Travel.css";
import {
  Plane, CheckCircle, Clock, XCircle, Search, Briefcase,
  CreditCard, Building2, MapPin, Navigation, MoveRight,
  CalendarDays, FileText, X, AlertCircle, Wallet,
  Shield, Plus, Trash2, Receipt, Download, Eye,
} from "lucide-react";
import { API } from "../../services/authService";
import { AuthContext } from "../../context/useAuth";

const HR_ROLES = ["hr_manager", "hr", "human_resources", "hr_executive", "hr_officer"];
const isHRRole = (role = "") =>
  HR_ROLES.includes(role.toLowerCase().replace(/\s+/g, "_"));

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
      })
    : "—";

const fmtDT = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

const EXP_CATEGORIES = [
  { key: "travel",        label: "Travel",        icon: "✈️", types: ["Flight", "Train", "Bus", "Cab / Auto", "Fuel", "Toll", "Other"] },
  { key: "accommodation", label: "Accommodation",  icon: "🏨", types: ["Hotel", "Guest House", "Service Apt", "Other"] },
  { key: "food",          label: "Food & Meals",   icon: "🍽️", types: ["Breakfast", "Lunch", "Dinner", "Snacks", "Team Meal", "Other"] },
  { key: "other",         label: "Other",          icon: "📋", types: ["Printing", "Courier", "Parking", "Visa / Permits", "Misc"] },
];

const makeRow = (category) => ({ id: null, category, type: EXP_CATEGORIES.find(c => c.key === category).types[0], description: "", amount: "" });

const isImage = (name = "") => /\.(jpg|jpeg|png|gif|webp)$/i.test(name);

const statusMeta = {
  Approved:  { icon: <CheckCircle size={11} />, cls: "tv-s-approved", dot: "tv-dot-green" },
  Rejected:  { icon: <XCircle size={11} />,     cls: "tv-s-rejected", dot: "tv-dot-red"   },
  Cancelled: { icon: <XCircle size={11} />,     cls: "tv-s-rejected", dot: "tv-dot-red"   },
  Pending:   { icon: <Clock size={11} />,       cls: "tv-s-pending",  dot: "tv-dot-amber" },
};
const getSM = (s) => statusMeta[s] || statusMeta.Pending;

// ── Receipt Preview Lightbox ──────────────────────────────────────────────────
const Lightbox = ({ receipt, onClose }) => {
  const url = receipt.file_url;
  const img = isImage(receipt.file_name);

  return (
    <div className="tv-lightbox-bg" onClick={onClose}>
      <div className="tv-lightbox" onClick={(e) => e.stopPropagation()}>
        <div className="tv-lightbox-header">
          <span>{receipt.file_name}</span>
          <div className="tv-lightbox-actions">
            <a
              href={url}
              download={receipt.file_name}
              className="tv-lb-btn"
              title="Download"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={14} />
            </a>
            <button className="tv-lb-btn tv-lb-close" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="tv-lightbox-body">
          {img ? (
            <img src={url} alt={receipt.file_name} className="tv-lb-img" />
          ) : (
            <iframe
              src={url}
              title={receipt.file_name}
              className="tv-lb-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Detail Modal (Two-Column Asymmetric Grid Layout) ─────────────────────────
const DetailModal = ({ request: req, onClose, onAction, viewerRole }) => {
  const [note,        setNote]        = useState("");
  const [acting,      setActing]      = useState(false);
  const [confirm,     setConfirm]     = useState(null);
  const [expenses,    setExpenses]    = useState([]);
  const [receipts,    setReceipts]    = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingExp,   setSavingExp]   = useState(false);
  const [savedOk,     setSavedOk]     = useState(false);
  const [isEditing,   setIsEditing]   = useState(false);
  const [preview,     setPreview]     = useState(null);
  const [activeTab,   setActiveTab]   = useState("travel"); // active expense category tab

  useEffect(() => {
    if (req?.id) fetchModalData();
  }, [req?.id]);

  const fetchModalData = async () => {
    setLoadingData(true);
    try {
      const detailRes = await API.get(`/travel-expenses/${req.id}`);
      const data = detailRes.data;
      setReceipts(data?.receipts || []);
      const loadedExp = data?.manual_expenses || [];
      setExpenses(loadedExp);
      // Auto-open edit mode if no expenses saved yet
      setIsEditing(loadedExp.length === 0);
    } catch {
      setExpenses([]); setReceipts([]);
    } finally {
      setLoadingData(false);
    }
  };

  // ── Expense row helpers ──────────────────────────────────────────────────
  const rowsFor    = (cat) => expenses.filter((e) => e.category === cat);
  const addRow     = (cat) => setExpenses((p) => [...p, makeRow(cat)]);
  const updRow     = (idx, f, v) => setExpenses((p) => p.map((e, i) => (i === idx ? { ...e, [f]: v } : e)));
  const delRow     = (idx) => {
    setExpenses((p) => p.filter((_, i) => i !== idx));
  };

  const totalFor   = (cat) => rowsFor(cat).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
  const grandTotal = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

  const saveExpenses = async () => {
    const valid = expenses.filter((e) => parseFloat(e.amount) > 0);
    if (!valid.length) return;
    setSavingExp(true);
    try {
      await API.put(`/travel-expenses/${req.id}/manual-expenses`, { expenses: valid });
      setSavedOk(true);
      setIsEditing(false);
      setTimeout(() => setSavedOk(false), 2500);
      await fetchModalData();
    } catch { /* silent */ }
    finally { setSavingExp(false); }
  };

  const handle = async (status) => {
    setActing(true);
    await onAction(req.id, status, note);
    setActing(false);
    onClose();
  };

  const canAct =
    req.status === "Pending" &&
    req.pm_status === "Approved" &&
    (
      (viewerRole === "hr_manager" && !isHRRole(req.designation)) ||
      (viewerRole === "ceo"        &&  isHRRole(req.designation))
    );

  const canEnterExp =
    req.payment_mode !== "self" &&
    (req.status === "Approved" || req.status === "Pending") &&
    req.pm_status === "Approved" &&
    (viewerRole === "hr_manager" || viewerRole === "ceo");

  const sm   = getSM(req.status);
  const pmSM = getSM(req.pm_status);

  return (
    <>
      <div className="tv-modal-backdrop" onClick={onClose}>
        <div className="tv-modal" onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div className="tv-modal-header" style={{ display: "flex" }}>
            <div className="tv-modal-header-left">
              <div className="tv-modal-icon"><Plane size={17} /></div>
              <div>
                <h2>{req.trip_title || req.destination}</h2>
                <p>{req.request_no} · Submitted {fmt(req.created_at)}</p>
              </div>
            </div>
            <div className="tv-modal-header-right">
              <span className={`tv-status-pill ${sm.cls}`}>{sm.icon}{req.status}</span>
              <button className="tv-modal-close" onClick={onClose}><X size={15} /></button>
            </div>
          </div>

          {/* Two-Column Body */}
          <div className="tv-modal-body">
            
            {/* LEFT COLUMN */}
            <div className="tv-modal-left">
              <div className="tv-info-card">
                <div className="tv-info-card-title">EMPLOYEE</div>
                <div className="tv-emp-block">
                  <div className="tv-emp-avatar">
                    {(req.employee_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="tv-emp-details">
                    <div className="tv-emp-name">{req.employee_name}</div>
                    <div className="tv-emp-role">{req.designation}</div>
                  </div>
                </div>
              </div>

              <div className="tv-info-card">
                <div className="tv-info-card-title">TRIP DETAILS</div>
                <div className="tv-detail-row">
                  <span className="tv-detail-label"><Navigation size={11} />From</span>
                  <span className="tv-detail-value">{req.origin || "—"}</span>
                </div>
                <div className="tv-detail-row">
                  <span className="tv-detail-label"><MapPin size={11} />To</span>
                  <span className="tv-detail-value">{req.destination}</span>
                </div>
                <div className="tv-detail-row">
                  <span className="tv-detail-label"><CalendarDays size={11} />Travel Dates</span>
                  <span className="tv-detail-value">
                    {fmt(req.travel_from_date)} → {fmt(req.travel_to_date)}
                  </span>
                </div>
                
                {req.purpose && (
                  <div className="tv-purpose-block">
                    <div className="tv-detail-label" style={{ marginBottom: 6 }}>
                      <FileText size={11} />Purpose
                    </div>
                    <p className="tv-purpose-text">{req.purpose}</p>
                  </div>
                )}
                
                {req.notes && (
                  <div className="tv-purpose-block" style={{ marginTop: 8 }}>
                    <div className="tv-detail-label" style={{ marginBottom: 4 }}>Notes</div>
                    <p className="tv-purpose-text">{req.notes}</p>
                  </div>
                )}
              </div>

              {req.payment_mode === "self" && (
                <div className="tv-info-card">
                  <div className="tv-info-card-title">
                    UPLOADED RECEIPTS
                    <span className="tv-receipt-count">{receipts.length}</span>
                  </div>

                  {loadingData ? (
                    <p className="tv-empty-msg">Loading receipts…</p>
                  ) : receipts.length === 0 ? (
                    <p className="tv-empty-msg">No receipts uploaded.</p>
                  ) : (
                    <div className="tv-receipt-grid">
                      {receipts.map((r, i) => {
                        const img = isImage(r.file_name);
                        return (
                          <div key={i} className="tv-receipt-tile">
                            <div className="tv-receipt-thumb" onClick={() => setPreview(r)}>
                              {img ? (
                                <img src={r.file_url} alt={r.file_name} className="tv-thumb-img" onError={(e) => { e.target.style.display = "none"; }} />
                              ) : (
                                <div className="tv-thumb-pdf">
                                  <FileText size={22} />
                                  <span>PDF</span>
                                </div>
                              )}
                              <div className="tv-thumb-overlay"><Eye size={16} /></div>
                            </div>

                            <div className="tv-receipt-info">
                              <span className="tv-receipt-type-badge">{r.expense_type}</span>
                              <span className="tv-receipt-name" title={r.file_name}>
                                {r.file_name.length > 22 ? r.file_name.slice(0, 20) + "…" : r.file_name}
                              </span>
                              <span className="tv-receipt-size">{r.file_size_kb} KB</span>
                              <div className="tv-receipt-tile-actions">
                                <button className="tv-tile-btn" onClick={() => setPreview(r)}><Eye size={11} /></button>
                                <a href={r.file_url} download={r.file_name} className="tv-tile-btn" target="_blank" rel="noreferrer"><Download size={11} /></a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="tv-modal-right">
              <div className="tv-info-card">
                <div className="tv-info-card-title">BUDGET & PAYMENT</div>
                <div className="tv-detail-row">
                  <span className="tv-detail-label"><CreditCard size={11} />Budget Type</span>
                  <span className={`tv-badge ${req.budget_type === "project" ? "tv-badge-project" : "tv-badge-company"}`}>
                    {req.budget_type === "project" ? <><Briefcase size={10} />Project</> : <><CreditCard size={10} />Company</>}
                  </span>
                </div>
                {req.project_name && (
                  <div className="tv-detail-row">
                    <span className="tv-detail-label"><Briefcase size={11} />Project Name</span>
                    <span className="tv-detail-value">{req.project_name}</span>
                  </div>
                )}
                <div className="tv-detail-row">
                  <span className="tv-detail-label"><Wallet size={11} />Payment Mode</span>
                  <span className={`tv-badge ${req.payment_mode === "self" ? "tv-badge-self" : "tv-badge-requested"}`}>
                    {req.payment_mode === "self" ? <><Wallet size={10} />Self-paid</> : <><Building2 size={10} />Company pays</>}
                  </span>
                </div>
              </div>

              {req.payment_mode !== "self" && expenses.length > 0 && !canEnterExp && (
                <div className="tv-info-card">
                  <div className="tv-info-card-title">EXPENSES ALLOCATED</div>
                  {EXP_CATEGORIES.map((cat) => {
                    const rows = rowsFor(cat.key);
                    if (!rows.length) return null;
                    return (
                      <div key={cat.key} className="tv-exp-cat-summary">
                        <div className="tv-exp-cat-label">{cat.icon} {cat.label}</div>
                        {rows.map((e, i) => (
                          <div key={i} className="tv-detail-row">
                            <span className="tv-detail-label">
                              <Receipt size={11} />
                              {e.type}{e.description ? ` — ${e.description}` : ""}
                            </span>
                            <span className="tv-detail-value tv-amount">
                              ₹{parseFloat(e.amount || 0).toLocaleString("en-IN")}
                            </span>
                          </div>
                        ))}
                        <div className="tv-exp-cat-subtotal">
                          <span>{cat.label} subtotal</span>
                          <strong>₹{totalFor(cat.key).toLocaleString("en-IN")}</strong>
                        </div>
                      </div>
                    );
                  })}
                  <div className="tv-exp-total-row tv-exp-grand-total">
                    <span>Grand Total</span>
                    <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              )}

              <div className="tv-info-card">
                <div className="tv-info-card-title">APPROVAL TRAIL</div>
                <div className="tv-trail">
                  <div className={`tv-trail-step ${req.pm_status === "Approved" ? "tv-trail-done" : req.pm_status === "Rejected" ? "tv-trail-reject" : ""}`}>
                    <div className={`tv-trail-dot ${pmSM.dot}`} />
                    <div className="tv-trail-content">
                      <span className="tv-trail-label">{isHRRole(req.designation) ? "Auto-approved (HR staff)" : "Project Manager"}</span>
                      <span className="tv-trail-status">{req.pm_status || "Pending"}</span>
                      {req.pm_reviewed_at && <span className="tv-trail-date">{fmtDT(req.pm_reviewed_at)}</span>}
                      {req.pm_review_note && <span className="tv-trail-note">"{req.pm_review_note}"</span>}
                    </div>
                  </div>

                  <div className="tv-trail-line" />

                  <div className={`tv-trail-step ${req.status === "Approved" ? "tv-trail-done" : req.status === "Rejected" ? "tv-trail-reject" : "tv-trail-waiting"}`}>
                    <div className={`tv-trail-dot ${sm.dot}`} />
                    <div className="tv-trail-content">
                      <span className="tv-trail-label">{isHRRole(req.designation) ? "CEO" : "HR Manager"}</span>
                      <span className="tv-trail-status">{req.status === "Pending" ? "Awaiting decision" : req.status}</span>
                      {req.reviewed_at && <span className="tv-trail-date">{fmtDT(req.reviewed_at)}</span>}
                      {req.review_note && <span className="tv-trail-note">"{req.review_note}"</span>}
                    </div>
                  </div>
                </div>
              </div>

              {canEnterExp && (
                <div className="tv-info-card tv-expense-entry-card">
                  <div className="tv-info-card-title tv-title-row">
                    <span><Receipt size={11} /> EXPENSE ENTRY</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {grandTotal > 0 && (
                        <span className="tv-exp-grand-badge">₹{grandTotal.toLocaleString("en-IN")}</span>
                      )}
                      {!isEditing && expenses.length > 0 && (
                        <button className="tv-edit-exp-btn" onClick={() => setIsEditing(true)}>
                          ✏️ Edit Expenses
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Saved summary view */}
                  {!isEditing && expenses.length > 0 && (
                    <div className="tv-exp-saved-summary">
                      {EXP_CATEGORIES.map((cat) => {
                        const rows = rowsFor(cat.key);
                        if (!rows.length) return null;
                        return (
                          <div key={cat.key} className="tv-exp-cat-summary">
                            <div className="tv-exp-cat-label">{cat.icon} {cat.label}</div>
                            {rows.map((e, i) => (
                              <div key={i} className="tv-detail-row">
                                <span className="tv-detail-label">
                                  <Receipt size={11} />
                                  {e.type}{e.description ? ` — ${e.description}` : ""}
                                </span>
                                <span className="tv-detail-value tv-amount">
                                  ₹{parseFloat(e.amount || 0).toLocaleString("en-IN")}
                                </span>
                              </div>
                            ))}
                            <div className="tv-exp-cat-subtotal">
                              <span>{cat.label} subtotal</span>
                              <strong>₹{totalFor(cat.key).toLocaleString("en-IN")}</strong>
                            </div>
                          </div>
                        );
                      })}
                      <div className="tv-exp-total-row tv-exp-grand-total">
                        <span>Grand Total</span>
                        <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
                      </div>
                    </div>
                  )}

                  {/* Edit mode */}
                  {isEditing && (
                    <>
                      {/* Category Tabs */}
                      <div className="tv-exp-tabs">
                        {EXP_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            className={`tv-exp-tab ${activeTab === cat.key ? "active" : ""}`}
                            onClick={() => setActiveTab(cat.key)}
                          >
                            <span className="tv-exp-tab-icon">{cat.icon}</span>
                            <span>{cat.label}</span>
                            {totalFor(cat.key) > 0 && (
                              <span className="tv-exp-tab-amt">₹{totalFor(cat.key).toLocaleString("en-IN")}</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Rows for active category */}
                      {EXP_CATEGORIES.filter((c) => c.key === activeTab).map((cat) => {
                        const catRows = rowsFor(cat.key);
                        const catIndexes = expenses.reduce((acc, e, i) => {
                          if (e.category === cat.key) acc.push(i);
                          return acc;
                        }, []);
                        return (
                          <div key={cat.key} className="tv-exp-category-body">
                            {catRows.length === 0 && (
                              <p className="tv-empty-msg tv-exp-empty">No {cat.label.toLowerCase()} expenses added yet.</p>
                            )}
                            {catRows.map((e, ci) => {
                              const globalIdx = catIndexes[ci];
                              return (
                                <div className="tv-exp-row-v2" key={ci}>
                                  <div className="tv-exp-row-top">
                                    <select
                                      className="tv-exp-select"
                                      value={e.type}
                                      onChange={(ev) => updRow(globalIdx, "type", ev.target.value)}
                                    >
                                      {cat.types.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                    <button className="tv-exp-del" onClick={() => delRow(globalIdx)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <input
                                    className="tv-exp-input tv-exp-desc"
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={e.description}
                                    onChange={(ev) => updRow(globalIdx, "description", ev.target.value)}
                                  />
                                  <div className="tv-exp-amt-wrap">
                                    <span className="tv-exp-rupee">₹</span>
                                    <input
                                      className="tv-exp-input tv-exp-amt"
                                      type="number"
                                      placeholder="0.00"
                                      min="0"
                                      value={e.amount}
                                      onChange={(ev) => updRow(globalIdx, "amount", ev.target.value)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            <div className="tv-exp-cat-actions">
                              <button className="tv-add-exp-btn" onClick={() => addRow(cat.key)}>
                                <Plus size={11} /> Add {cat.label}
                              </button>
                              {totalFor(cat.key) > 0 && (
                                <span className="tv-exp-cat-running">
                                  Subtotal: <strong>₹{totalFor(cat.key).toLocaleString("en-IN")}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="tv-exp-footer">
                        {grandTotal > 0 && (
                          <span className="tv-exp-total-label">
                            Grand Total <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
                          </span>
                        )}
                        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                          {expenses.length > 0 && (
                            <button className="tv-btn-secondary tv-exp-cancel-btn" onClick={() => setIsEditing(false)}>
                              Cancel
                            </button>
                          )}
                          <button
                            className="tv-exp-save-btn"
                            onClick={saveExpenses}
                            disabled={savingExp || expenses.filter((e) => parseFloat(e.amount) > 0).length === 0}
                          >
                            {savingExp ? "Saving…" : "Save Expenses"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {isEditing && expenses.length === 0 && (
                    <p className="tv-empty-msg" style={{ textAlign: "center", padding: "8px 0 4px" }}>
                      Select a category tab above and add expenses.
                    </p>
                  )}
                </div>
              )}

              {canAct ? (
                <div className="tv-info-card tv-action-card">
                  <div className="tv-info-card-title">{isHRRole(req.designation) ? "CEO DECISION" : "HR DECISION"}</div>
                  <textarea className="tv-note-input" rows={3} placeholder="Add a review note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
                  {!confirm ? (
                    <div className="tv-action-btns">
                      <button className="tv-btn-reject" onClick={() => setConfirm("Rejected")} disabled={acting}><XCircle size={13} /> Reject</button>
                      <button className="tv-btn-approve" onClick={() => setConfirm("Approved")} disabled={acting}><CheckCircle size={13} /> Approve</button>
                    </div>
                  ) : (
                    <div className="tv-confirm-row">
                      <span className="tv-confirm-label"><AlertCircle size={12} /> Confirm {confirm}?</span>
                      <button className={confirm === "Approved" ? "tv-btn-approve" : "tv-btn-reject"} onClick={() => handle(confirm)} disabled={acting}>{acting ? "Saving…" : "Yes, confirm"}</button>
                      <button className="tv-btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="tv-info-card">
                  <div className="tv-info-card-title">FINAL STATUS</div>
                  <div className={`tv-status-pill-lg ${sm.cls}`}>{sm.icon}{req.status}</div>
                  {req.review_note && <p className="tv-purpose-text" style={{ marginTop: 10 }}>Note: {req.review_note}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {preview && <Lightbox receipt={preview} onClose={() => setPreview(null)} />}
    </>
  );
};

// ── Request Box Card Component ───────────────────────────────────────────────
const RequestRow = ({ req, onOpen }) => {
  const sm = getSM(req.status);
  return (
    <div
      className="tv-row-card"
      onClick={() => onOpen(req)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(req)}
    >
      <div className="tv-row-top">
        <span className="tv-row-no">{req.request_no}</span>
        <span className={`tv-status-pill ${sm.cls}`}>{sm.icon}{req.status}</span>
      </div>

      <h3 className="tv-row-title">{req.trip_title || req.destination}</h3>

      <div className="tv-row-route">
        <div className="tv-route-item">
          <Navigation size={12} />
          <span>{req.origin || "—"}</span>
        </div>
        <MoveRight size={14} className="tv-row-arrow" />
        <div className="tv-route-item">
          <MapPin size={12} />
          <span>{req.destination}</span>
        </div>
      </div>

      <div className="tv-row-footer">
        <div className="tv-row-dates">
          <CalendarDays size={12} />
          <span>{fmt(req.travel_from_date)}</span>
          <span className="tv-row-datesep">→</span>
          <span>{fmt(req.travel_to_date)}</span>
        </div>

        <div className="tv-row-badges">
          <span className={`tv-badge ${req.budget_type === "project" ? "tv-badge-project" : "tv-badge-company"}`}>
            {req.budget_type === "project" ? "Project" : "Company"}
          </span>
          <span className={`tv-badge ${req.payment_mode === "self" ? "tv-badge-self" : "tv-badge-requested"}`}>
            {req.payment_mode === "self" ? "Self-paid" : "Company Paid"}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard Workspace ──────────────────────────────────────────────────
const TravelExpenseDashboard = () => {
  const { user } = useContext(AuthContext);
  const viewerRole = (user?.role || user?.designation || "")
    .toLowerCase().replace(/\s+/g, "_");
  const isCEO = viewerRole === "ceo";

  const [queue,    setQueue]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [toast,    setToast]    = useState(null);
  const [filter,   setFilter]   = useState("All");

  // Localized secondary filters
  const [budgetFilter, setBudgetFilter] = useState("All");
  const [payFilter, setPayFilter]       = useState("All");

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/travel-expenses?role=${isCEO ? "ceo" : "hr_manager"}`);
      setQueue(res.data || []);
    } catch {
      showToast("error", "Failed to load travel requests.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAction = async (id, status, note) => {
    try {
      await API.put(`/travel-expenses/${id}/status`, {
        status,
        reviewed_by:   user?.id,
        review_note:   note || null,
        reviewer_role: isCEO ? "ceo" : "hr_manager",
      });
      showToast("success", `Request ${status.toLowerCase()} successfully.`);
      fetchQueue();
    } catch (err) {
      showToast("error", err.response?.data?.message || "Action failed.");
      throw err;
    }
  };

  const counts = {
    All:      queue.length,
    Pending:  queue.filter((r) => r.status === "Pending").length,
    Approved: queue.filter((r) => r.status === "Approved").length,
    Rejected: queue.filter((r) => r.status === "Rejected").length,
  };

  const filtered = queue.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      (r.employee_name || "").toLowerCase().includes(q) ||
      (r.trip_title    || "").toLowerCase().includes(q) ||
      (r.destination   || "").toLowerCase().includes(q) ||
      (r.request_no    || "").toLowerCase().includes(q) ||
      (r.department    || "").toLowerCase().includes(q) ||
      (r.designation   || "").toLowerCase().includes(q);
      
    const matchStatus = filter === "All" || r.status === filter;
    const matchBudget = budgetFilter === "All" || r.budget_type === budgetFilter;
    const matchPayment = payFilter === "All" || r.payment_mode === payFilter;

    return matchSearch && matchStatus && matchBudget && matchPayment;
  });

  return (
    <div className="tv-page">
      {toast && (
        <div className={`tv-toast tv-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      {/* Top Header Section */}
      <div className="tv-topbar">
        <div className="tv-topbar-left">
          {isCEO && <Shield size={17} className="tv-topbar-icon" />}
          <div>
            <h1>{isCEO ? "HR Travel Requests" : "Travel Expense Requests"}</h1>
            <p>{isCEO ? "Approve or reject travel requests from HR employees" : "Approve or reject PM-approved employee travel requests"}</p>
          </div>
        </div>
        <div className="tv-search-wrap">
          <Search size={13} />
          <input
            placeholder="Search name, destination, request no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Integrated Two Column Workspace Layout */}
      <div className="tv-dashboard-workspace">
        
        {/* LEFT COLUMN: Sidebar Filters */}
        <aside className="tv-workspace-sidebar">
          <div className="tv-insight-card">
            <h4 className="tv-insight-title">Active Queue Metrics</h4>
            <div className="tv-insight-metric">
              <span className="tv-metric-num">{counts.Pending}</span>
              <span className="tv-metric-label">Requests awaiting verification</span>
            </div>
            <div className="tv-insight-progress-bar">
              <div className="tv-insight-progress-fill" style={{ width: queue.length ? `${(counts.Pending / queue.length) * 100}%` : '0%' }}></div>
            </div>
          </div>

          <div className="tv-filter-panel">
            <h3 className="tv-filter-heading">Advanced Filtering</h3>
            
            <div className="tv-filter-group">
              <label className="tv-filter-label">Coverage Allocation</label>
              <div className="tv-filter-options">
                <button className={`tv-filter-btn ${budgetFilter === "All" ? "active" : ""}`} onClick={() => setBudgetFilter("All")}>All Allocations</button>
                <button className={`tv-filter-btn ${budgetFilter === "company" ? "active" : ""}`} onClick={() => setBudgetFilter("company")}>Company Expense</button>
                <button className={`tv-filter-btn ${budgetFilter === "project" ? "active" : ""}`} onClick={() => setBudgetFilter("project")}>Project Budget</button>
              </div>
            </div>

            <div className="tv-filter-group">
              <label className="tv-filter-label">Settlement Mode</label>
              <div className="tv-filter-options">
                <button className={`tv-filter-btn ${payFilter === "All" ? "active" : ""}`} onClick={() => setPayFilter("All")}>All Modes</button>
                <button className={`tv-filter-btn ${payFilter === "requested" ? "active" : ""}`} onClick={() => setPayFilter("requested")}>Company Paid</button>
                <button className={`tv-filter-btn ${payFilter === "self" ? "active" : ""}`} onClick={() => setPayFilter("self")}>Self-paid</button>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Interactive Status Badges & Cards Grid */}
        <main className="tv-workspace-content">
          <div className="tv-stats">
            {["All", "Pending", "Approved", "Rejected"].map((s) => (
              <div
                key={s}
                className={`tv-stat-card ${filter === s ? "tv-stat-active" : ""}`}
                onClick={() => setFilter(s)}
              >
                <span className="tv-stat-label">{s === "All" ? "TOTAL" : s.toUpperCase()}</span>
                <strong className={`tv-stat-num ${s === "Approved" ? "tv-stat-green" : s === "Rejected" ? "tv-stat-red" : s === "Pending" ? "tv-stat-amber" : ""}`}>
                  {counts[s]}
                </strong>
              </div>
            ))}
          </div>

          <div className="tv-list-section-header">
            <span className="tv-section-caption">Showing data blocks matching core parameters</span>
          </div>

          {loading ? (
            <div className="tv-state-box">
              <Clock size={28} strokeWidth={1.4} className="tv-spin" />
              <p>Loading requests…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="tv-state-box">
              <Plane size={32} strokeWidth={1.4} />
              <p>{search ? `No parameters match "${search}"` : `No structural records found.`}</p>
            </div>
          ) : (
            <div className="tv-list-grid">
              {filtered.map((r) => (
                <RequestRow key={r.id} req={r} onOpen={setSelected} />
              ))}
            </div>
          )}
        </main>

      </div>

      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          viewerRole={viewerRole}
        />
      )}
    </div>
  );
};

export default TravelExpenseDashboard;