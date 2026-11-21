// ===== FILE: APP_Vindia/app_vindia/src/pages/hiring/hiringConstants.js =====
// Constants and plain helper functions for the hiring-request pages.
// (Components live in hiringComponents.jsx — ESLint's react-refresh rule wants
// a .jsx file to export only components.)
import { formatINR } from "../../utils/currencyFormatter";

export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

export const URGENCIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

export const STATUS_META = {
  pending_finance: { label: "Waiting for Finance", tone: "pending" },
  pending_hr: { label: "Waiting for HR", tone: "pending" },
  approved: { label: "Approved", tone: "approved" },
  rejected: { label: "Rejected", tone: "rejected" },
  cancelled: { label: "Cancelled", tone: "cancelled" },
};

export const ACTION_LABELS = {
  submitted: "Submitted to Finance",
  submitted_skip_finance: "Submitted to HR (Finance step skipped)",
  finance_approved: "Finance approved",
  finance_rejected: "Finance rejected",
  hr_approved: "HR approved — recruitment started",
  hr_rejected: "HR rejected",
  resubmitted: "Edited and resubmitted",
  cancelled: "Cancelled by requester",
};

export const labelOf = (list, value) =>
  list.find((x) => x.value === value)?.label || value || "—";

// "finance_manager" -> "Finance Manager"
export const formatRoleName = (role) =>
  role
    ? String(role)
        .split("_")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ")
    : "—";

export const formatDate = (d) => {
  if (!d) return "—";
  // plain YYYY-MM-DD strings (expected joining date) are shown as-is, no timezone shift
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(d)) ? new Date(`${d}T00:00:00`) : new Date(d);
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

// salary_min / salary_max are stored as yearly rupees
export const formatSalaryRange = (min, max) => {
  const a = min === null || min === undefined || min === "" ? null : Number(min);
  const b = max === null || max === undefined || max === "" ? null : Number(max);
  if (a === null && b === null) return "—";
  if (a !== null && b !== null) return `${formatINR(a)} – ${formatINR(b)} / year`;
  return `${formatINR(a ?? b)} / year`;
};

/* Work out the state of the three steps from the request row.
   state: done | current | rejected | skipped | waiting */
export const getStepStates = (r) => {
  const financeSkipped = r.requester_role === "finance_manager";

  let finance;
  if (financeSkipped) finance = "skipped";
  else if (r.status === "pending_finance") finance = "current";
  else if (r.status === "rejected" && r.finance_reviewed_by && !r.hr_reviewed_by) finance = "rejected";
  else if (r.finance_reviewed_by) finance = "done";
  else finance = "waiting"; // e.g. cancelled before Finance reviewed

  let hr;
  if (r.status === "pending_hr") hr = "current";
  else if (r.status === "approved") hr = "done";
  else if (r.status === "rejected" && r.hr_reviewed_by) hr = "rejected";
  else hr = "waiting";

  return [
    { key: "submit", label: "Submitted", state: "done" },
    {
      key: "finance",
      label: financeSkipped ? "Finance (skipped)" : "Finance",
      state: finance,
    },
    { key: "hr", label: r.requester_role === "hr_manager" ? "HR (CEO approves)" : "HR", state: hr },
  ];
};