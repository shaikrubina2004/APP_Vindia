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
  Approved:  { icon: <CheckCircle size={11} />, cls: "te-s-approved", card: "st-approved" },
  Rejected:  { icon: <XCircle size={11} />,     cls: "te-s-rejected", card: "st-rejected" },
  Cancelled: { icon: <XCircle size={11} />,     cls: "te-s-rejected", card: "st-rejected" },
  Pending:   { icon: <Clock size={11} />,       cls: "te-s-pending",  card: "st-pending"  },
};
const getSM = (s) => statusMeta[s] || statusMeta.Pending;

// ── Receipt Preview Lightbox ──────────────────────────────────────────────────
const Lightbox = ({ receipt, onClose }) => {
  const url = receipt.file_url;
  const img = isImage(receipt.file_name);

  return (
    <div className="te-lightbox-bg" onClick={onClose}>
      <div className="te-lightbox" onClick={(e) => e.stopPropagation()}>
        <div className="te-lightbox-header">
          <span>{receipt.file_name}</span>
          <div className="te-lightbox-actions">
            <a
              href={url}
              download={receipt.file_name}
              className="te-lb-btn"
              title="Download"
              target="_blank"
              rel="noreferrer"
            >
              <Download size={14} />
            </a>
            <button className="te-lb-btn te-lb-close" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="te-lightbox-body">
          {img ? (
            <img src={url} alt={receipt.file_name} className="te-lb-img" />
          ) : (
            <iframe
              src={url}
              title={receipt.file_name}
              className="te-lb-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ── Detail Modal ──────────────────────────────────────────────────────────────
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
  const [activeTab,   setActiveTab]   = useState("travel");

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
      setIsEditing(loadedExp.length === 0);
    } catch {
      setExpenses([]); setReceipts([]);
    } finally {
      setLoadingData(false);
    }
  };

  const rowsFor    = (cat) => expenses.filter((e) => e.category === cat);
  const addRow     = (cat) => setExpenses((p) => [...p, makeRow(cat)]);
  const updRow     = (idx, f, v) => setExpenses((p) => p.map((e, i) => (i === idx ? { ...e, [f]: v } : e)));
  const delRow     = (idx) => setExpenses((p) => p.filter((_, i) => i !== idx));

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

  const renderExpenseSummary = () => (
    <>
      {EXP_CATEGORIES.map((cat) => {
        const rows = rowsFor(cat.key);
        if (!rows.length) return null;
        return (
          <div key={cat.key} className="te-exp-cat-summary">
            <div className="te-exp-cat-label">{cat.icon} {cat.label}</div>
            {rows.map((e, i) => (
              <div key={i} className="te-detail-row">
                <span className="te-detail-label">
                  <Receipt size={11} />
                  {e.type}{e.description ? ` — ${e.description}` : ""}
                </span>
                <span className="te-detail-value te-amount">
                  ₹{parseFloat(e.amount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            ))}
            <div className="te-exp-cat-subtotal">
              <span>{cat.label} subtotal</span>
              <strong>₹{totalFor(cat.key).toLocaleString("en-IN")}</strong>
            </div>
          </div>
        );
      })}
      <div className="te-exp-total-row te-exp-grand-total">
        <span>Grand total</span>
        <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
      </div>
    </>
  );

  return (
    <>
      <div className="te-modal-backdrop" onClick={onClose}>
        <div className="te-modal" onClick={(e) => e.stopPropagation()}>

          <div className="te-modal-header">
            <div className="te-modal-header-left">
              <div className="te-modal-icon"><Plane size={17} /></div>
              <div>
                <h2>{req.trip_title || req.destination}</h2>
                <p>{req.request_no} · Submitted {fmt(req.created_at)}</p>
              </div>
            </div>
            <div className="te-modal-header-right">
              <span className={`te-status-pill ${sm.cls}`}>{sm.icon}{req.status}</span>
              <button className="te-modal-close" onClick={onClose}><X size={15} /></button>
            </div>
          </div>

          <div className="te-modal-body">

            {/* LEFT COLUMN */}
            <div className="te-modal-left">
              <div className="te-info-card">
                <div className="te-info-card-title">Employee</div>
                <div className="te-emp-block">
                  <div className="te-emp-avatar">
                    {(req.employee_name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="te-emp-name">{req.employee_name}</div>
                    <div className="te-emp-role">{req.designation}</div>
                  </div>
                </div>
              </div>

              <div className="te-info-card">
                <div className="te-info-card-title">Trip details</div>
                <div className="te-detail-row">
                  <span className="te-detail-label"><Navigation size={11} />From</span>
                  <span className="te-detail-value">{req.origin || "—"}</span>
                </div>
                <div className="te-detail-row">
                  <span className="te-detail-label"><MapPin size={11} />To</span>
                  <span className="te-detail-value">{req.destination}</span>
                </div>
                <div className="te-detail-row">
                  <span className="te-detail-label"><CalendarDays size={11} />Travel dates</span>
                  <span className="te-detail-value">
                    {fmt(req.travel_from_date)} → {fmt(req.travel_to_date)}
                  </span>
                </div>

                {req.purpose && (
                  <div className="te-purpose-block">
                    <div className="te-detail-label" style={{ marginBottom: 6 }}>
                      <FileText size={11} />Purpose
                    </div>
                    <p className="te-purpose-text">{req.purpose}</p>
                  </div>
                )}

                {req.notes && (
                  <div className="te-purpose-block">
                    <div className="te-detail-label" style={{ marginBottom: 6 }}>Notes</div>
                    <p className="te-purpose-text">{req.notes}</p>
                  </div>
                )}
              </div>

              {req.payment_mode === "self" && (
                <div className="te-info-card">
                  <div className="te-info-card-title">
                    Uploaded receipts
                    <span className="te-receipt-count">{receipts.length}</span>
                  </div>

                  {loadingData ? (
                    <p className="te-empty-msg">Loading receipts…</p>
                  ) : receipts.length === 0 ? (
                    <p className="te-empty-msg">No receipts uploaded.</p>
                  ) : (
                    <div className="te-receipt-grid">
                      {receipts.map((r, i) => {
                        const img = isImage(r.file_name);
                        return (
                          <div key={i} className="te-receipt-tile">
                            <div className="te-receipt-thumb" onClick={() => setPreview(r)}>
                              {img ? (
                                <img src={r.file_url} alt={r.file_name} className="te-thumb-img" onError={(e) => { e.target.style.display = "none"; }} />
                              ) : (
                                <div className="te-thumb-pdf">
                                  <FileText size={22} />
                                  <span>PDF</span>
                                </div>
                              )}
                              <div className="te-thumb-overlay"><Eye size={16} /></div>
                            </div>

                            <div className="te-receipt-info">
                              <span className="te-receipt-type-badge">{r.expense_type}</span>
                              <span className="te-receipt-name" title={r.file_name}>
                                {r.file_name.length > 22 ? r.file_name.slice(0, 20) + "…" : r.file_name}
                              </span>
                              <span className="te-receipt-size">{r.file_size_kb} KB</span>
                              <div className="te-receipt-tile-actions">
                                <button className="te-tile-btn" onClick={() => setPreview(r)}><Eye size={11} /></button>
                                <a href={r.file_url} download={r.file_name} className="te-tile-btn" target="_blank" rel="noreferrer"><Download size={11} /></a>
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
            <div className="te-modal-right">
              <div className="te-info-card">
                <div className="te-info-card-title">Budget &amp; payment</div>
                <div className="te-detail-row">
                  <span className="te-detail-label"><CreditCard size={11} />Budget type</span>
                  <span className={`te-badge ${req.budget_type === "project" ? "te-badge-project" : "te-badge-company"}`}>
                    {req.budget_type === "project" ? <><Briefcase size={10} />Project</> : <><CreditCard size={10} />Company</>}
                  </span>
                </div>
                {req.project_name && (
                  <div className="te-detail-row">
                    <span className="te-detail-label"><Briefcase size={11} />Project name</span>
                    <span className="te-detail-value">{req.project_name}</span>
                  </div>
                )}
                <div className="te-detail-row">
                  <span className="te-detail-label"><Wallet size={11} />Payment mode</span>
                  <span className={`te-badge ${req.payment_mode === "self" ? "te-badge-self" : "te-badge-requested"}`}>
                    {req.payment_mode === "self" ? <><Wallet size={10} />Self-paid</> : <><Building2 size={10} />Company pays</>}
                  </span>
                </div>
              </div>

              {req.payment_mode !== "self" && expenses.length > 0 && !canEnterExp && (
                <div className="te-info-card">
                  <div className="te-info-card-title">Expenses allocated</div>
                  {renderExpenseSummary()}
                </div>
              )}

              <div className="te-info-card">
                <div className="te-info-card-title">Approval trail</div>
                <div className="te-trail">
                  <div className={`te-trail-step ${req.pm_status === "Approved" ? "te-trail-done" : req.pm_status === "Rejected" ? "te-trail-reject" : ""}`}>
                    <div className="te-trail-dot" />
                    <div className="te-trail-content">
                      <span className="te-trail-label">{isHRRole(req.designation) ? "Auto-approved (HR staff)" : "Project Manager"}</span>
                      <span className="te-trail-status">{req.pm_status || "Pending"}</span>
                      {req.pm_reviewed_at && <span className="te-trail-date">{fmtDT(req.pm_reviewed_at)}</span>}
                      {req.pm_review_note && <span className="te-trail-note">"{req.pm_review_note}"</span>}
                    </div>
                  </div>

                  <div className="te-trail-line" />

                  <div className={`te-trail-step ${req.status === "Approved" ? "te-trail-done" : req.status === "Rejected" ? "te-trail-reject" : "te-trail-waiting"}`}>
                    <div className="te-trail-dot" />
                    <div className="te-trail-content">
                      <span className="te-trail-label">{isHRRole(req.designation) ? "CEO" : "HR Manager"}</span>
                      <span className="te-trail-status">{req.status === "Pending" ? "Awaiting decision" : req.status}</span>
                      {req.reviewed_at && <span className="te-trail-date">{fmtDT(req.reviewed_at)}</span>}
                      {req.review_note && <span className="te-trail-note">"{req.review_note}"</span>}
                    </div>
                  </div>
                </div>
              </div>

              {canEnterExp && (
                <div className="te-info-card te-expense-entry-card">
                  <div className="te-info-card-title te-title-row">
                    <span><Receipt size={11} /> Expense entry</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {grandTotal > 0 && (
                        <span className="te-exp-grand-badge">₹{grandTotal.toLocaleString("en-IN")}</span>
                      )}
                      {!isEditing && expenses.length > 0 && (
                        <button className="te-edit-exp-btn" onClick={() => setIsEditing(true)}>
                          Edit expenses
                        </button>
                      )}
                    </div>
                  </div>

                  {!isEditing && expenses.length > 0 && (
                    <div className="te-exp-saved-summary">{renderExpenseSummary()}</div>
                  )}

                  {isEditing && (
                    <>
                      <div className="te-exp-tabs">
                        {EXP_CATEGORIES.map((cat) => (
                          <button
                            key={cat.key}
                            className={`te-exp-tab ${activeTab === cat.key ? "active" : ""}`}
                            onClick={() => setActiveTab(cat.key)}
                          >
                            <span className="te-exp-tab-icon">{cat.icon}</span>
                            <span>{cat.label}</span>
                            {totalFor(cat.key) > 0 && (
                              <span className="te-exp-tab-amt">₹{totalFor(cat.key).toLocaleString("en-IN")}</span>
                            )}
                          </button>
                        ))}
                      </div>

                      {EXP_CATEGORIES.filter((c) => c.key === activeTab).map((cat) => {
                        const catRows = rowsFor(cat.key);
                        const catIndexes = expenses.reduce((acc, e, i) => {
                          if (e.category === cat.key) acc.push(i);
                          return acc;
                        }, []);
                        return (
                          <div key={cat.key}>
                            {catRows.length === 0 && (
                              <p className="te-empty-msg te-exp-empty">No {cat.label.toLowerCase()} expenses added yet.</p>
                            )}
                            {catRows.map((e, ci) => {
                              const globalIdx = catIndexes[ci];
                              return (
                                <div className="te-exp-row-v2" key={ci}>
                                  <div className="te-exp-row-top">
                                    <select
                                      className="te-exp-select"
                                      value={e.type}
                                      onChange={(ev) => updRow(globalIdx, "type", ev.target.value)}
                                    >
                                      {cat.types.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                    <button className="te-exp-del" onClick={() => delRow(globalIdx)}>
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                  <input
                                    className="te-exp-input te-exp-desc"
                                    type="text"
                                    placeholder="Description (optional)"
                                    value={e.description}
                                    onChange={(ev) => updRow(globalIdx, "description", ev.target.value)}
                                  />
                                  <div className="te-exp-amt-wrap">
                                    <span className="te-exp-rupee">₹</span>
                                    <input
                                      className="te-exp-input te-exp-amt"
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
                            <div className="te-exp-cat-actions">
                              <button className="te-add-exp-btn" onClick={() => addRow(cat.key)}>
                                <Plus size={11} /> Add {cat.label}
                              </button>
                              {totalFor(cat.key) > 0 && (
                                <span className="te-exp-cat-running">
                                  Subtotal: <strong>₹{totalFor(cat.key).toLocaleString("en-IN")}</strong>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      <div className="te-exp-footer">
                        {grandTotal > 0 && (
                          <span className="te-exp-total-label">
                            Grand total <strong>₹{grandTotal.toLocaleString("en-IN")}</strong>
                          </span>
                        )}
                        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                          {expenses.length > 0 && (
                            <button className="te-btn-secondary te-exp-cancel-btn" onClick={() => setIsEditing(false)}>
                              Cancel
                            </button>
                          )}
                          <button
                            className="te-exp-save-btn"
                            onClick={saveExpenses}
                            disabled={savingExp || expenses.filter((e) => parseFloat(e.amount) > 0).length === 0}
                          >
                            {savingExp ? "Saving…" : "Save expenses"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {isEditing && expenses.length === 0 && (
                    <p className="te-empty-msg" style={{ textAlign: "center", padding: "8px 0 4px" }}>
                      Select a category tab above and add expenses.
                    </p>
                  )}
                </div>
              )}

              {canAct ? (
                <div className="te-info-card te-action-card">
                  <div className="te-info-card-title">{isHRRole(req.designation) ? "CEO decision" : "HR decision"}</div>
                  <textarea className="te-note-input" rows={3} placeholder="Add a review note (optional)…" value={note} onChange={(e) => setNote(e.target.value)} />
                  {!confirm ? (
                    <div className="te-action-btns">
                      <button className="te-btn-reject" onClick={() => setConfirm("Rejected")} disabled={acting}><XCircle size={13} /> Reject</button>
                      <button className="te-btn-approve" onClick={() => setConfirm("Approved")} disabled={acting}><CheckCircle size={13} /> Approve</button>
                    </div>
                  ) : (
                    <div className="te-confirm-row">
                      <span className="te-confirm-label"><AlertCircle size={12} /> Confirm {confirm}?</span>
                      <button className={confirm === "Approved" ? "te-btn-approve" : "te-btn-reject"} onClick={() => handle(confirm)} disabled={acting}>{acting ? "Saving…" : "Yes, confirm"}</button>
                      <button className="te-btn-secondary" onClick={() => setConfirm(null)}>Cancel</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="te-info-card">
                  <div className="te-info-card-title">Final status</div>
                  <div className={`te-status-pill-lg ${sm.cls}`}>{sm.icon}{req.status}</div>
                  {req.review_note && <p className="te-purpose-text" style={{ marginTop: 10 }}>Note: {req.review_note}</p>}
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

// ── Request Row Card ──────────────────────────────────────────────────────────
const RequestRow = ({ req, onOpen }) => {
  const sm = getSM(req.status);
  return (
    <div
      className={`te-row-card ${sm.card}`}
      onClick={() => onOpen(req)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(req)}
    >
      <div className="te-row-top">
        <span className="te-row-no">{req.request_no}</span>
        <span className={`te-status-pill ${sm.cls}`}>{sm.icon}{req.status}</span>
      </div>

      <h3 className="te-row-title">{req.trip_title || req.destination}</h3>

      <div className="te-row-employee">
        <span className="te-row-employee-name">{req.employee_name}</span>
        <span className="te-row-employee-sep">·</span>
        <Building2 size={11} />
        <span>{req.department || "—"}</span>
      </div>

      <div className="te-row-route">
        <div className="te-route-item">
          <Navigation size={12} />
          <span>{req.origin || "—"}</span>
        </div>
        <MoveRight size={14} className="te-row-arrow" />
        <div className="te-route-item">
          <MapPin size={12} />
          <span>{req.destination}</span>
        </div>
      </div>

      <div className="te-row-footer">
        <div className="te-row-dates">
          <CalendarDays size={12} />
          <span>{fmt(req.travel_from_date)}</span>
          <span className="te-row-datesep">→</span>
          <span>{fmt(req.travel_to_date)}</span>
        </div>

        <div className="te-row-badges">
          <span className={`te-badge ${req.budget_type === "project" ? "te-badge-project" : "te-badge-company"}`}>
            {req.budget_type === "project" ? "Project" : "Company"}
          </span>
          <span className={`te-badge ${req.payment_mode === "self" ? "te-badge-self" : "te-badge-requested"}`}>
            {req.payment_mode === "self" ? "Self-paid" : "Company paid"}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
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

    const matchStatus  = filter === "All" || r.status === filter;
    const matchBudget  = budgetFilter === "All" || r.budget_type === budgetFilter;
    const matchPayment = payFilter === "All" || r.payment_mode === payFilter;

    return matchSearch && matchStatus && matchBudget && matchPayment;
  });

  const statNumClass = (s) =>
    s === "Approved" ? "green" : s === "Rejected" ? "red" : s === "Pending" ? "amber" : "";

  return (
    <div className="te-page">
      {toast && (
        <div className={`te-toast te-toast-${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
          {toast.msg}
        </div>
      )}

      <div className="te-topbar">
        <div className="te-topbar-left">
          <div className="te-topbar-icon-box">
            {isCEO ? <Shield size={18} /> : <Plane size={18} />}
          </div>
          <div>
            <h1>{isCEO ? "HR Travel Requests" : "Travel Expense Requests"}</h1>
            <p>{isCEO ? "Approve or reject travel requests from HR employees" : "Approve or reject PM-approved employee travel requests"}</p>
          </div>
        </div>
        <div className="te-search-wrap">
          <Search size={13} />
          <input
            placeholder="Search name, destination, request no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="te-workspace">

        <aside className="te-sidebar">
          <div className="te-metric-card">
            <div className="te-metric-title">Active queue</div>
            <div className="te-metric-value">
              <span className="te-metric-num">{counts.Pending}</span>
              <span className="te-metric-label">requests awaiting verification</span>
            </div>
            <div className="te-metric-bar">
              <div className="te-metric-bar-fill" style={{ width: queue.length ? `${(counts.Pending / queue.length) * 100}%` : "0%" }} />
            </div>
          </div>

          <div className="te-filter-panel">
            <h3 className="te-filter-heading">Filters</h3>

            <div className="te-filter-group">
              <label className="te-filter-label">Coverage allocation</label>
              <div className="te-filter-options">
                <button className={`te-filter-btn ${budgetFilter === "All" ? "active" : ""}`} onClick={() => setBudgetFilter("All")}>All allocations</button>
                <button className={`te-filter-btn ${budgetFilter === "company" ? "active" : ""}`} onClick={() => setBudgetFilter("company")}>Company expense</button>
                <button className={`te-filter-btn ${budgetFilter === "project" ? "active" : ""}`} onClick={() => setBudgetFilter("project")}>Project budget</button>
              </div>
            </div>

            <div className="te-filter-group">
              <label className="te-filter-label">Settlement mode</label>
              <div className="te-filter-options">
                <button className={`te-filter-btn ${payFilter === "All" ? "active" : ""}`} onClick={() => setPayFilter("All")}>All modes</button>
                <button className={`te-filter-btn ${payFilter === "requested" ? "active" : ""}`} onClick={() => setPayFilter("requested")}>Company paid</button>
                <button className={`te-filter-btn ${payFilter === "self" ? "active" : ""}`} onClick={() => setPayFilter("self")}>Self-paid</button>
              </div>
            </div>
          </div>
        </aside>

        <main className="te-content">
          <div className="te-stats">
            {["All", "Pending", "Approved", "Rejected"].map((s) => (
              <div
                key={s}
                className={`te-stat-card ${filter === s ? "active" : ""}`}
                onClick={() => setFilter(s)}
              >
                <span className="te-stat-label">{s === "All" ? "Total" : s}</span>
                <strong className={`te-stat-num ${statNumClass(s)}`}>{counts[s]}</strong>
              </div>
            ))}
          </div>

          <span className="te-section-caption">
            Showing {filtered.length} of {queue.length} requests
          </span>

          {loading ? (
            <div className="te-state-box">
              <Clock size={26} strokeWidth={1.4} className="te-spin" />
              <p>Loading requests…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="te-state-box">
              <Plane size={30} strokeWidth={1.4} />
              <p>{search ? `No requests match "${search}"` : "No requests found."}</p>
            </div>
          ) : (
            <div className="te-list-grid">
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