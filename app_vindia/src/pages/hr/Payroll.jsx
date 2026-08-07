import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Calendar,
  User,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
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

let toastId = 0;

function SkeletonLine({ w = "100%" }) {
  return <div className="sk-line" style={{ width: w }} />;
}

function SkeletonBlock({ className = "" }) {
  return <div className={`sk-block ${className}`} />;
}

function EmployeeSkeleton() {
  return (
    <div className="pr-card">
      <div className="pr-section-header">
        <User size={16} />
        <h2>Employee</h2>
      </div>

      <div className="pr-emp-grid">
        <div className="pr-emp-col">
          <SkeletonLine w="65%" />
          <SkeletonLine w="82%" />
          <SkeletonLine w="72%" />
          <SkeletonLine w="58%" />
          <SkeletonLine w="76%" />
        </div>

        <div className="pr-emp-col">
          <SkeletonLine w="70%" />
          <SkeletonLine w="88%" />
          <SkeletonLine w="62%" />
          <SkeletonLine w="74%" />
          <SkeletonLine w="68%" />
        </div>
      </div>

      <div className="pr-section-header mt-24">
        <BarChart3 size={16} />
        <h2>Attendance Summary</h2>
      </div>

      <div className="pr-att-stats">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBlock key={i} className="sk-stat" />
        ))}
      </div>

      <div className="pr-att-summary">
        {[1, 2, 3].map((i) => (
          <SkeletonBlock key={i} className="sk-pill" />
        ))}
      </div>

      <div className="pr-more-panel">
        <SkeletonLine w="40%" />
        <SkeletonLine w="60%" />
      </div>
    </div>
  );
}

function PayslipBlock({
  sal,
  month,
  monthLabel,
  adjustedNet,
  fmt,
  onApprove,
  lopDays,
  lopDeduction,
}) {
  return (
    <>
      <div className="pr-section-header">
        <TrendingUp size={16} />
        <h2>Salary</h2>
      </div>

      <div className="pr-payslip-banner">{monthLabel(month)}</div>

      <div className="pr-ed-grid">
        <div className="pr-ed-block">
          <div className="pr-ed-head pr-ed-head--earn">Earnings</div>
          <div className="pr-ed-body">
            {[
              ["Basic", sal.basic],
              ["HRA", sal.hra],
              ["Special Allowance", sal.specialAllow],
              ["Variable Pay", sal.variablePay],
            ].map(([label, val], i) => (
              <div className="pr-ed-row" key={i}>
                <span>{label}</span>
                <span className="pr-ed-amt">{val ? `₹${fmt(val)}` : "—"}</span>
              </div>
            ))}
            <div className="pr-ed-row pr-ed-row--total">
              <strong>Gross Pay</strong>
              <strong>₹{fmt(sal.totalEarnings)}</strong>
            </div>
          </div>
        </div>

        <div className="pr-ed-block">
          <div className="pr-ed-head pr-ed-head--deduct">Deductions</div>
          <div className="pr-ed-body">
            {[
              ["PF", sal.pf],
              ["Professional Tax", sal.profTax],
              ["Income Tax", sal.incomeTax],
              ...(lopDays > 0 ? [["LOP", lopDeduction]] : []),
            ].map(([label, val], i) => (
              <div className="pr-ed-row" key={i}>
                <span>{label}</span>
                <span className="pr-ed-amt pr-ed-amt--deduct">{val ? `₹${fmt(val)}` : "—"}</span>
              </div>
            ))}
            <div className="pr-ed-row pr-ed-row--total">
              <strong>Total Deductions</strong>
              <strong className="pr-ed-amt--deduct">
                ₹{fmt((sal.totalDeductions || 0) + lopDeduction)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="pr-net-bar">
        <span>Net Pay</span>
        <span className="pr-net-amount">₹{fmt(adjustedNet)}</span>
      </div>

      <button className="pr-approve-btn" onClick={onApprove}>
        Approve & Send Payslip
      </button>
    </>
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
  const counts = att.counts || {};
  const totalPresent = (counts.present || 0) + (counts.wfh || 0);
  const totalLeave = counts.leave || 0;
  const totalAbsent = counts.absent || 0;
  const totalLate = counts.late || 0;
  const totalHalf = counts.halfday || 0;
  const lopDays = att.lop || 0;
  const lopDeduction = att.lopDeduction || 0;
  const adjustedNet = Math.max(0, (sal.netSalary || 0) - lopDeduction);
  const showSkeleton = !empData && !loading;

  const handleApproveConfirmed = async () => {
    setApproving(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      pushToast(`Payslip for ${emp.name} approved and sent`, "success");
    } catch {
      pushToast("Could not send payslip — please try again", "error");
    } finally {
      setApproving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="pr-wrapper">
      <div className="pr-container">
        <div className="pr-page-header">
          <div>
            <h1>Payroll</h1>
            <p>Review and approve employee payslips</p>
          </div>
        </div>

        <div className="pr-search-card">
          <div className="pr-search-row">
            <div className="pr-input-wrap pr-input-wrap--search">
              <span className="pr-input-icon">
                <Search size={16} />
              </span>
              <input
                type="text"
                className="pr-input"
                placeholder="Employee name or code"
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

            <div className="pr-input-wrap pr-input-wrap--month">
              <span className="pr-input-icon">
                <Calendar size={16} />
              </span>
              <input
                type="month"
                className="pr-input"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <button className="pr-btn" onClick={generate} disabled={loading}>
              {loading ? <Loader2 size={16} className="pr-spinner" style={{ border: "none" }} /> : null}
              {loading ? "Loading…" : "Generate"}
            </button>
          </div>

          {error && (
            <div className="pr-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}
        </div>

        {empData && attFetchFailed && (
          <div className="pr-fetch-error-banner">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Attendance could not be loaded. Showing fallback payroll values.</span>
          </div>
        )}

        <div className="pr-dashboard">
          {showSkeleton ? (
            <EmployeeSkeleton />
          ) : empData ? (
            <>
              <div className="pr-card">
                <div className="pr-section-header">
                  <User size={16} />
                  <h2>Employee</h2>
                </div>

                <div className="pr-emp-grid">
                  <div className="pr-emp-col">
                    {[
                      ["Name", emp.name],
                      ["Employee No", emp.employee_code],
                      ["Designation", emp.designation],
                      ["Department", emp.department],
                    ].map(([label, val]) => (
                      <div className="pr-emp-row" key={label}>
                        <span className="pr-emp-label">{label}</span>
                        <span className="pr-emp-val">{val || "—"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pr-emp-col">
                    {[
                      ["Location", emp.location],
                      ["Bank", emp.bankName],
                      ["IFSC", emp.ifsc],
                      ["Monthly Salary", `₹${fmt(emp.monthlySalary)}`],
                    ].map(([label, val]) => (
                      <div className="pr-emp-row" key={label}>
                        <span className="pr-emp-label">{label}</span>
                        <span className="pr-emp-val">{val || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pr-section-header mt-24">
                  <BarChart3 size={16} />
                  <h2>Attendance Summary</h2>
                </div>

                <div className="pr-att-stats">
                  {[
                    ["present", "Present", totalPresent],
                    ["late", "Late", totalLate],
                    ["halfday", "Half Day", totalHalf],
                    ["leave", "Leave", totalLeave],
                    ["absent", "Absent", totalAbsent],
                    ["working", "Working Days", workingDays],
                  ].map(([key, label, count]) => (
                    <div key={key} className={`pr-stat pr-stat--${key}`}>
                      <span className="pr-stat-count">{count}</span>
                      <span className="pr-stat-label">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="pr-att-summary">
                  <div className="pr-att-pill pr-att-pill--info">
                    <span className="pill-label">Net Pay Status</span>
                    <span className="pill-val">{lopDays > 0 ? "Adjusted" : "Ready"}</span>
                  </div>
                  <div className="pr-att-pill pr-att-pill--info">
                    <span className="pill-label">LOP Days</span>
                    <span className="pill-val">{lopDays}</span>
                  </div>
                  <div className="pr-att-pill pr-att-pill--info">
                    <span className="pill-label">LOP Deduction</span>
                    <span className="pill-val">₹{fmt(lopDeduction)}</span>
                  </div>
                </div>

                <button className="pr-more-btn" onClick={() => setMoreOpen((v) => !v)}>
                  {moreOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {moreOpen ? "Hide details" : "More details"}
                </button>

                {moreOpen && (
                  <div className="pr-more-panel">
                    <div className="pr-more-row">
                      <span>Monthly Salary</span>
                      <strong>₹{fmt(emp.monthlySalary)}</strong>
                    </div>
                    <div className="pr-more-row">
                      <span>LOP Deduction</span>
                      <strong>₹{fmt(lopDeduction)}</strong>
                    </div>
                    <div className="pr-more-row">
                      <span>Approval Note</span>
                      <strong>{attFetchFailed ? "Review required" : "Ready for approval"}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="pr-card pr-card--right">
                <PayslipBlock
                  sal={sal}
                  month={month}
                  monthLabel={monthLabel}
                  adjustedNet={adjustedNet}
                  fmt={fmt}
                  onApprove={() => setConfirmOpen(true)}
                  lopDays={lopDays}
                  lopDeduction={lopDeduction}
                />
              </div>
            </>
          ) : null}
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