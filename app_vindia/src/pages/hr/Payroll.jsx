import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Pencil,
  Wallet,
  ArrowRight,
  X,
  User,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import "./Payroll.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const token = () => localStorage.getItem("token");
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token()}`,
});

const fmt = (v) => {
  if (v === "NA" || v == null) return "—";
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toLocaleString("en-IN");
};

const monthLabel = (m) => {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  return new Date(y, mo - 1, 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
};

const dateLabel = (d) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d).slice(0, 10);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

let toastId = 0;

/* ─── small reusable boxed field ─── */
function Field({ label, value, muted }) {
  return (
    <div className="pr-field">
      <span className="pr-field-label">{label}</span>
      <span className={`pr-field-value${muted ? " pr-field-value--muted" : ""}`}>
        {value || "—"}
      </span>
    </div>
  );
}

function SalaryPanel({
  emp,
  sal,
  att,
  month,
  monthLabel,
  adjustedNet,
  fmt,
  onApprove,
  lopDays,
  lopDeduction,
  disabled,
  onSaveDetails,
  savingDetails,
}) {
  const [editing, setEditing] = useState(false);
  const [band, setBand] = useState("");
  const [level, setLevel] = useState("");
  const [pfNo, setPfNo] = useState("");

  useEffect(() => {
    if (editing) {
      setBand(emp.band && emp.band !== "—" ? emp.band : "");
      setLevel(emp.level && emp.level !== "—" ? emp.level : "");
      setPfNo(emp.pfNo && emp.pfNo !== "—" ? emp.pfNo : "");
    }
  }, [editing, emp.band, emp.level, emp.pfNo]);

  const workingDays = att.workingDays ?? 0;
  const daysPayable = att.daysPayable ?? workingDays;
  const totalDeductionsAll = (sal.totalDeductions || 0) + (lopDeduction || 0);

  return (
    <div className="payslip-doc">
      <div className="pr-section-header">
        <div className="pr-section-header-left">
          <TrendingUp size={16} />
          <h2>Salary</h2>
        </div>
        <button type="button" className="pr-edit-link" onClick={() => setEditing((v) => !v)}>
          {editing ? <X size={13} /> : <Pencil size={13} />}
          {editing ? "Close" : "Edit details"}
        </button>
      </div>

      {editing && (
        <div className="pr-edit-panel">
          <div className="pr-edit-field">
            <label htmlFor="ps-band">Band</label>
            <input id="ps-band" value={band} onChange={(e) => setBand(e.target.value)} placeholder="e.g. Band 4" />
          </div>
          <div className="pr-edit-field">
            <label htmlFor="ps-level">Level</label>
            <input id="ps-level" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. Level 6" />
          </div>
          <div className="pr-edit-field pr-edit-field--wide">
            <label htmlFor="ps-pfno">PF No.</label>
            <input
              id="ps-pfno"
              value={pfNo}
              onChange={(e) => setPfNo(e.target.value)}
              placeholder="e.g. PYBOM00165730000096306"
            />
          </div>
          <button
            type="button"
            className="pr-edit-save"
            disabled={savingDetails}
            onClick={() => onSaveDetails({ band, level, pf_no: pfNo }).then(() => setEditing(false))}
          >
            {savingDetails ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}

      <div className="pr-banner pr-banner--month">{monthLabel(month)}</div>

      <div className="pr-banner pr-banner--earn">Earnings</div>
      <div className="pr-row-list">
        <div className="pr-row">
          <span>Basic</span>
          <span className="pr-row-amt">{fmt(sal.basic)}</span>
        </div>
        <div className="pr-row">
          <span>HRA</span>
          <span className="pr-row-amt">{fmt(sal.hra)}</span>
        </div>
        <div className="pr-row">
          <span>Special Allowance</span>
          <span className="pr-row-amt">{fmt(sal.specialAllow)}</span>
        </div>
        <div className="pr-row">
          <span>Variable Pay</span>
          <span className="pr-row-amt">{fmt(sal.exGratia)}</span>
        </div>
        <div className="pr-row pr-row--total">
          <span>Gross Pay</span>
          <span className="pr-row-amt">₹{fmt(sal.totalEarnings)}</span>
        </div>
      </div>

      <div className="pr-banner pr-banner--ded">Deductions</div>
      <div className="pr-row-list">
        <div className="pr-row">
          <span>PF</span>
          <span className="pr-row-amt">{fmt(sal.pf)}</span>
        </div>
        <div className="pr-row">
          <span>Professional Tax</span>
          <span className="pr-row-amt">{fmt(sal.profTax)}</span>
        </div>
        <div className="pr-row">
          <span>Income Tax</span>
          <span className="pr-row-amt">{fmt(sal.incomeTax)}</span>
        </div>
        {lopDays > 0 && (
          <div className="pr-row">
            <span>Loss of Pay</span>
            <span className="pr-row-amt">{fmt(lopDeduction)}</span>
          </div>
        )}
        <div className="pr-row pr-row--total">
          <span>Total Deductions</span>
          <span className="pr-row-amt">₹{fmt(totalDeductionsAll)}</span>
        </div>
      </div>

      <div className="payslip-net-row">
        <span>
          Net salary payable · {daysPayable}/{workingDays} days paid
          {lopDays > 0 ? ` · −${lopDays} LOP` : ""}
        </span>
        <strong>₹{fmt(adjustedNet)}</strong>
      </div>

      <button className="pr-approve-btn" onClick={onApprove} disabled={disabled}>
        Approve &amp; Send Payslip
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

export default function Payroll() {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [empList, setEmpList] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSugg, setShowSugg] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [empData, setEmpData] = useState(null);
  const [attData, setAttData] = useState(null);
  const [attFetchFailed, setAttFetchFailed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [moreOpen, setMoreOpen] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const pickingRef = useRef(false);

  const pushToast = useCallback((message, kind = "success") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  useEffect(() => {
    fetch(`${API}/api/payroll/employees`, { headers: hdrs() })
      .then((r) => r.json())
      .then((d) => setEmpList(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const computeSuggestions = useCallback(
    (q) => {
      if (!q || q.length < 2) {
        setSuggestions([]);
        return;
      }
      const lower = q.toLowerCase();
      setSuggestions(
        empList
          .filter(
            (e) =>
              e.name?.toLowerCase().includes(lower) ||
              e.employee_code?.toLowerCase().includes(lower)
          )
          .slice(0, 8)
      );
    },
    [empList]
  );

  useEffect(() => {
    computeSuggestions(query);
    setActiveIdx(-1);
  }, [query, computeSuggestions]);

  const pickEmployee = (emp) => {
    pickingRef.current = true;
    setQuery(emp.employee_code || String(emp.id));
    setSuggestions([]);
    setShowSugg(false);
    setActiveIdx(-1);
    setTimeout(() => {
      pickingRef.current = false;
    }, 300);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!pickingRef.current) setShowSugg(false);
    }, 200);
  };

  const handleInputKeyDown = (e) => {
    if (!showSugg || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIdx >= 0) {
        e.preventDefault();
        pickEmployee(suggestions[activeIdx]);
      }
    } else if (e.key === "Escape") {
      setShowSugg(false);
      setActiveIdx(-1);
    }
  };

  const generate = useCallback(async () => {
    const id = query.trim();
    if (!id) {
      setError("Please enter an employee name or code");
      return;
    }
    if (!month) {
      setError("Please select a month");
      return;
    }

    setError("");
    setLoading(true);
    setEmpData(null);
    setAttData(null);
    setAttFetchFailed(false);

    try {
      const [eRes, aRes] = await Promise.all([
        fetch(`${API}/api/payroll/employee/${encodeURIComponent(id)}`, { headers: hdrs() }),
        fetch(`${API}/api/payroll/attendance/${encodeURIComponent(id)}?month=${month}`, {
          headers: hdrs(),
        }),
      ]);

      const eJson = await eRes.json();
      if (!eRes.ok) {
        setError(eJson.message || "Employee not found");
        setLoading(false);
        return;
      }

      setEmpData(eJson);

      if (!aRes.ok) {
        setAttFetchFailed(true);
        setAttData({
          workingDays: 26,
          counts: {},
          dailyMap: {},
          holidayCount: 0,
          lopFromAbsent: 0,
          lopFromLeave: 0,
          leaveBalance: null,
        });
      } else {
        const aJson = await aRes.json();
        setAttData(aJson);
      }
    } catch {
      setError("Network error — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [query, month]);

  const emp = empData?.employee || {};
  const sal = empData?.salary || {};
  const att = attData || {};
  const workingDays = att.workingDays || 26;
  const daysPayable = att.daysPayable ?? workingDays;
  const counts = att.counts || {};
  const totalPresent = (counts.present || 0) + (counts.wfh || 0);
  const totalLeave = counts.leave || 0;
  const totalAbsent = counts.absent || 0;
  const totalLate = counts.late || 0;
  const totalHalf = counts.halfday || 0;
  const lopDays = att.lop || 0;
  const lopFromAbsent = att.lopFromAbsent || 0;
  const lopFromLeave = att.lopFromLeave || 0;
  const lopDeduction = att.lopDeduction || 0;
  const holidayCount = att.holidayCount || 0;
  const leaveBal = att.leaveBalance || {};
  const leavesTakenYTD = (leaveBal.usedCL || 0) + (leaveBal.usedSL || 0);
  const leaveBalanceRemaining = leaveBal.totalBalance ?? 0;
  const adjustedNet = Math.max(0, (sal.netSalary || 0) - lopDeduction);
  const hasData = Boolean(empData);
  const bankLine = [emp.bankName, emp.ifsc].filter((v) => v && v !== "—").join(" · ") || "—";

  const status = !hasData
    ? { label: "Awaiting details", tone: "pending" }
    : attFetchFailed
    ? { label: "Needs review", tone: "review" }
    : lopDays > 0
    ? { label: "Adjusted for LOP", tone: "adjusted" }
    : { label: "Ready to approve", tone: "ready" };

  const handleSaveDetails = useCallback(
    async ({ band, level, pf_no }) => {
      if (!emp.id && !emp.employee_code) return;
      const idForUrl = emp.employee_code || emp.id;
      setSavingDetails(true);
      try {
        const res = await fetch(
          `${API}/api/payroll/employee/${encodeURIComponent(idForUrl)}/payslip-details`,
          {
            method: "PATCH",
            headers: hdrs(),
            body: JSON.stringify({
              band: band?.trim() || null,
              level: level?.trim() || null,
              pf_no: pf_no?.trim() || null,
            }),
          }
        );
        if (!res.ok) throw new Error("Save failed");
        const updated = await res.json();
        setEmpData((prev) =>
          prev
            ? {
                ...prev,
                employee: {
                  ...prev.employee,
                  band: updated.band || "—",
                  level: updated.level || "—",
                  pfNo: updated.pf_no || "—",
                },
              }
            : prev
        );
        pushToast("Payslip details saved", "success");
      } catch {
        pushToast("Could not save payslip details — please try again", "error");
      } finally {
        setSavingDetails(false);
      }
    },
    [emp.id, emp.employee_code, pushToast]
  );

  const handleApproveConfirmed = async () => {
    setApproving(true);
    try {
      const idForUrl = emp.employee_code || emp.id;
      const totalDeductionsAll = (sal.totalDeductions || 0) + (lopDeduction || 0);

      const payload = {
        monthLabel: monthLabel(month),
        employee: {
          name: emp.name,
          employeeCode: emp.employee_code,
          pan: emp.pan,
          workingDays,
          designation: emp.designation,
          daysPayable,
          band: emp.band,
          pfNo: emp.pfNo,
          level: emp.level,
          lopDays,
          location: emp.location,
          lopPrevMonth: 0,
          bankName: bankLine,
          bankAccNo: emp.bankAccNo,
        },
        earnings: [
          { label: "Basic", amount: sal.basic },
          { label: "HRA", amount: sal.hra },
          { label: "Special Allowance", amount: sal.specialAllow },
          { label: "Variable Pay", amount: sal.exGratia },
        ],
        deductions: [
          { label: "PF", amount: sal.pf },
          { label: "Professional Tax", amount: sal.profTax },
          { label: "Income Tax", amount: sal.incomeTax },
          ...(lopDays > 0 ? [{ label: "Loss of Pay", amount: lopDeduction }] : []),
        ],
        totalEarnings: sal.totalEarnings,
        totalDeductions: totalDeductionsAll,
        netPay: adjustedNet,
      };

      const res = await fetch(
        `${API}/api/payroll/employee/${encodeURIComponent(idForUrl)}/payslip-pdf`,
        {
          method: "POST",
          headers: hdrs(),
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Failed to generate payslip");

      // Download the generated PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Payslip-${(emp.name || "employee").replace(/[^a-z0-9]+/gi, "_")}-${monthLabel(month).replace(/\s+/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      pushToast(`Payslip for ${emp.name} approved and sent`, "success");
    } catch {
      pushToast("Could not send payslip — please try again", "error");
    } finally {
      setApproving(false);
      setConfirmOpen(false);
    }
  };

  const stats = [
    ["Present", totalPresent, false],
    ["Late", totalLate, false],
    ["Half Day", totalHalf, false],
    ["Leave", totalLeave, false],
    ["Absent", totalAbsent, false],
    ["Working Days", workingDays, true],
  ];

  return (
    <div className="pr-wrapper">
      <div className="pr-container">
        <div className="pr-page-header">
          <h1>Payroll</h1>
          <p>Review and approve employee payslips</p>
        </div>

        <div className="pr-search-card">
          <div className="pr-search-row">
            <div className="pr-input-wrap pr-input-wrap--search">
              <Search size={16} className="pr-input-icon" />
              <input
                className="pr-input"
                type="text"
                placeholder="Search employee by name or code"
                value={query}
                autoComplete="off"
                role="combobox"
                aria-expanded={showSugg && suggestions.length > 0}
                aria-autocomplete="list"
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowSugg(true);
                }}
                onFocus={() => setShowSugg(true)}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
              />
              {showSugg && query.length >= 2 && (
                <ul className="pr-suggestions pr-suggestions--floating" role="listbox">
                  {suggestions.length > 0 ? (
                    suggestions.map((e, i) => (
                      <li
                        key={e.id}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={i === activeIdx ? "is-active" : ""}
                        onMouseDown={(ev) => {
                          ev.preventDefault();
                          pickEmployee(e);
                        }}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <span className="sugg-code">{e.employee_code}</span>
                        <span className="sugg-name">{e.name}</span>
                        <span className="sugg-dept">{e.department}</span>
                      </li>
                    ))
                  ) : (
                    <li className="sugg-empty">No employees match "{query}"</li>
                  )}
                </ul>
              )}
            </div>

            <div className="pr-input-wrap">
              <Calendar size={16} className="pr-input-icon" />
              <input
                className="pr-input"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <button className="pr-btn" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={16} className="pr-spinner" /> : <Sparkles size={16} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>

          {error && (
            <div className="pr-error">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {hasData && attFetchFailed && (
            <div className="pr-fetch-error-banner">
              <AlertTriangle size={15} />
              <span>Attendance could not be loaded. Showing fallback payroll values.</span>
            </div>
          )}
        </div>

        {/*
          Layout is always rendered — before Generate is clicked (or while
          a request is in flight) emp/sal/att are empty objects, so Field
          / fmt() naturally fall back to "—" / ₹0 placeholders. Once real
          data arrives, the same DOM re-fills with values.
        */}
        <div className="pr-dashboard">
          <div className="pr-card">
            <div className="pr-section-header">
              <div className="pr-section-header-left">
                <User size={16} />
                <h2>Employee</h2>
              </div>
            </div>

            <div className="pr-field-grid">
              <Field label="Name" value={emp.name} />
              <Field label="Location" value={emp.location} />
              <Field label="Employee No" value={emp.employee_code} />
              <Field label="Department" value={emp.department} />
              <Field label="Designation" value={emp.designation} />
              <Field label="Bank" value={bankLine} />
              <Field label="IFSC" value={emp.ifsc} />
              <Field label="Bank A/C No." value={emp.bankAccNo} />
              <Field label="PAN" value={emp.pan} />
              <Field label="Monthly Salary" value={hasData ? `₹${fmt(sal.totalEarnings)}` : null} />
              <Field label="Band / Level" value={hasData ? `${emp.band || "—"} / ${emp.level || "—"}` : null} />
              <Field label="PF No." value={emp.pfNo} />
            </div>

            <div className="pr-section-header pr-section-header--sub">
              <div className="pr-section-header-left">
                <BarChart3 size={14} />
                <h2>Attendance Summary</h2>
              </div>
            </div>

            <div className="pr-stat-grid">
              {stats.map(([label, count, highlight]) => (
                <div className={`pr-stat${highlight ? " pr-stat--highlight" : ""}`} key={label}>
                  <span className="pr-stat-count">{hasData ? count : "—"}</span>
                  <span className="pr-stat-label">{label}</span>
                </div>
              ))}
            </div>

            <div className="pr-field-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 10 }}>
              <div className="pr-field">
                <span className="pr-field-label">Net Pay Status</span>
                <span className={`pr-field-value pr-status-text pr-status-text--${status.tone}`}>
                  {hasData ? status.label : "—"}
                </span>
              </div>
              <div className="pr-field">
                <span className="pr-field-label">LOP Days</span>
                <span className="pr-field-value">{hasData ? lopDays : "—"}</span>
              </div>
              <div className="pr-field">
                <span className="pr-field-label">LOP Deduction</span>
                <span className="pr-field-value">{hasData ? `₹${fmt(lopDeduction)}` : "—"}</span>
              </div>
            </div>

            <button className="pr-more-btn" onClick={() => setMoreOpen((v) => !v)}>
              {moreOpen ? "Hide details" : "More details"}
              {moreOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>

            {moreOpen && (
              <div className="pr-more-panel">
                <div className="pr-more-row">
                  <span>Holidays this month</span>
                  <strong>{holidayCount}</strong>
                </div>
                <div className="pr-more-row">
                  <span>Leave balance remaining</span>
                  <strong>{fmt(leaveBalanceRemaining)} days</strong>
                </div>
                <div className="pr-more-row">
                  <span>Leaves taken this year</span>
                  <strong>{leavesTakenYTD}</strong>
                </div>
                <div className="pr-more-row">
                  <span>Casual Leave</span>
                  <strong>{fmt(leaveBal.usedCL || 0)} / {fmt(leaveBal.accruedCL || 0)}</strong>
                </div>
                <div className="pr-more-row">
                  <span>Sick Leave</span>
                  <strong>{fmt(leaveBal.usedSL || 0)} / {fmt(leaveBal.accruedSL || 0)}</strong>
                </div>

                {(leaveBal.approvedLeaves || []).length > 0 && (
                  <div className="pr-more-row pr-more-row--stack">
                    <span>Approved Leaves (This Year)</span>
                    <div className="pr-leave-list">
                      {leaveBal.approvedLeaves.map((lv, i) => (
                        <div className="pr-leave-list-row" key={i}>
                          <span>
                            {lv.type} — {dateLabel(lv.from_date)}
                            {lv.from_date !== lv.to_date ? ` to ${dateLabel(lv.to_date)}` : ""}
                          </span>
                          <strong>{lv.days}d</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pr-card pr-card--right">
            <SalaryPanel
              emp={emp}
              sal={sal}
              att={att}
              month={month}
              monthLabel={monthLabel}
              adjustedNet={adjustedNet}
              fmt={fmt}
              onApprove={() => setConfirmOpen(true)}
              lopDays={lopDays}
              lopDeduction={lopDeduction}
              disabled={!hasData}
              onSaveDetails={handleSaveDetails}
              savingDetails={savingDetails}
            />
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="pr-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !approving) setConfirmOpen(false);
          }}
        >
          <div className="pr-modal" role="dialog" aria-modal="true" aria-labelledby="pr-modal-title">
            <div className="pr-modal-icon">
              <Wallet size={20} />
            </div>
            <h3 id="pr-modal-title">Approve payslip?</h3>
            <p>
              This sends the {monthLabel(month)} payslip to <strong>{emp.name}</strong> for ₹{fmt(adjustedNet)} net pay.
            </p>
            <div className="pr-modal-actions">
              <button className="pr-modal-btn" onClick={() => setConfirmOpen(false)} disabled={approving}>
                Cancel
              </button>
              <button
                className="pr-modal-btn pr-modal-btn--primary"
                onClick={handleApproveConfirmed}
                disabled={approving}
              >
                {approving ? "Sending…" : "Approve & Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pr-toast-layer">
        {toasts.map((t) => (
          <div key={t.id} className={`pr-toast pr-toast--${t.kind}`}>
            <CheckCircle2 size={16} />
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}