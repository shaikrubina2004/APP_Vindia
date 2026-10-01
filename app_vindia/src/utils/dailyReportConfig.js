// Role-specific daily report definitions.
// Used by:
//   • components/dailyupdate/RoleDailyUpdate.jsx  (the form each manager fills in)
//   • pages/ceo/Reports.jsx                         (how the CEO reads it)
//
// kind: "int" | "money" | "percent" | "text"

export const STATUS_OPTIONS = [
  { value: "on-track",  label: "On Track",        color: "#10b981" },
  { value: "attention", label: "Needs Attention", color: "#f59e0b" },
  { value: "critical",  label: "Critical",        color: "#ef4444" },
];

export const STATUS_LABEL = {
  "on-track": "On Track",
  attention: "Needs Attention",
  critical: "Critical",
  delayed: "Delayed",
  ahead: "Ahead of Plan",
};

export const REVIEW_LABEL = {
  pending:  { text: "Pending CEO review",         cls: "fdu-badge-pending" },
  approved: { text: "Approved",                   cls: "fdu-badge-approved" },
  rejected: { text: "Sent back — resubmit below", cls: "fdu-badge-rejected" },
};

export const REPORT_TYPES = {
  finance: {
    label: "Finance Manager",
    short: "Finance",
    fields: [
      { key: "cash_position",      label: "Cash / Bank Position", kind: "money" },
      { key: "todays_collections", label: "Collections Today",    kind: "money" },
      { key: "todays_expenses",    label: "Expenses Today",       kind: "money" },
      { key: "invoices_raised",    label: "Invoices Raised",      kind: "int" },
      { key: "payments_made",      label: "Payments Made",        kind: "int" },
      { key: "pending_approvals",  label: "Pending Approvals",    kind: "int" },
    ],
  },

  pm: {
    label: "Project Manager",
    short: "Projects",
    fields: [
      { key: "overall_progress",  label: "Overall Progress",   kind: "percent" },
      { key: "phase",             label: "Current Phase",      kind: "text" },
      { key: "manpower_present",  label: "Manpower Present",   kind: "int" },
      { key: "manpower_planned",  label: "Manpower Planned",   kind: "int" },
      { key: "open_issues",       label: "Open Issues",        kind: "int" },
      { key: "work_items",        label: "Work Items Logged",  kind: "int" },
      { key: "safety_notes",      label: "Safety Observations", kind: "text", wide: true },
      { key: "tomorrow_plan",     label: "Tomorrow's Plan",    kind: "text", wide: true },
    ],
  },

  bda: {
    label: "Business Development",
    short: "BD",
    eyebrow: "Business Development",
    summaryLabel: "Key wins, blockers & next steps",
    summaryHint: "Deals moving forward, objections you are hearing, anything that needs the CEO's help.",
    fields: [
      { key: "leads_generated",  label: "New Leads Generated",     kind: "int",   required: true },
      { key: "calls_made",       label: "Calls Made",              kind: "int",   required: true },
      { key: "meetings_held",    label: "Client Meetings Held",    kind: "int" },
      { key: "proposals_sent",   label: "Proposals / Quotes Sent", kind: "int" },
      { key: "follow_ups_done",  label: "Follow-ups Completed",    kind: "int" },
      { key: "leads_converted",  label: "Leads Converted",         kind: "int" },
      { key: "pipeline_value",   label: "Pipeline Value (₹)",      kind: "money" },
      { key: "top_source",       label: "Best Lead Source Today",  kind: "text", placeholder: "e.g. Referral, Meta Ads" },
    ],
  },

  ops: {
    label: "Operations Manager",
    short: "Operations",
    eyebrow: "Operations",
    summaryLabel: "Operational highlights & risks",
    summaryHint: "Site disruptions, vendor or supply problems, resource shortfalls, decisions you need.",
    fields: [
      { key: "active_sites",          label: "Active Sites Running",        kind: "int",     required: true },
      { key: "manpower_deployed",     label: "Manpower Deployed",           kind: "int",     required: true },
      { key: "attendance_rate",       label: "Workforce Attendance (%)",    kind: "percent" },
      { key: "schedule_adherence",    label: "Schedule Adherence (%)",      kind: "percent" },
      { key: "equipment_utilisation", label: "Equipment Utilisation (%)",   kind: "percent" },
      { key: "material_deliveries",   label: "Material Deliveries Received", kind: "int" },
      { key: "pending_procurement",   label: "Pending Procurement Orders",  kind: "int" },
      { key: "vendor_issues",         label: "Vendor / Supply Issues",      kind: "int" },
      { key: "delayed_activities",    label: "Delayed Activities",          kind: "int" },
      { key: "safety_incidents",      label: "Safety Incidents",            kind: "int" },
    ],
  },

  hr: {
    label: "HR Manager",
    short: "HR",
    eyebrow: "Human Resources",
    fields: [
      { key: "present_today",      label: "Present Today",          kind: "int" },
      { key: "on_leave",           label: "On Leave",               kind: "int" },
      { key: "new_joiners",        label: "New Joiners",            kind: "int" },
      { key: "open_positions",     label: "Open Positions",         kind: "int" },
      { key: "pending_leaves",     label: "Pending Leave Requests", kind: "int" },
      { key: "pending_expenses",   label: "Pending Expense Claims", kind: "int" },
    ],
  },
};

/* ── formatting helpers ───────────────────────────────────────── */
export const fmtMoney = (n) => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};

export const formatValue = (kind, value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (kind === "money") return fmtMoney(value);
  if (kind === "percent") return `${Number(value)}%`;
  if (kind === "int") return Number(value).toLocaleString("en-IN");
  return String(value);
};