// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/shared/opsDailyUpdateConfig.js =====

export const OVERALL_STATUS = [
  { val: "on-track", label: "On Track", color: "#10b981", bg: "#d1fae5" },
  { val: "at-risk",  label: "At Risk",  color: "#f59e0b", bg: "#fff3cd" },
  { val: "delayed",  label: "Delayed",  color: "#ef4444", bg: "#fee2e2" },
];

export const REVIEW_STATUS = {
  approved: { label: "Approved",       bg: "#d1fae5", color: "#065f46", border: "#10b981" },
  pending:  { label: "Pending Review", bg: "#fff3cd", color: "#92400e", border: "#f59e0b" },
  rejected: { label: "Needs Changes",  bg: "#fee2e2", color: "#991b1b", border: "#ef4444" },
};

// Only the wording differs per role — the form itself is the same.
export const ROLE_CONFIG = {
  inventory_controller: {
    roleLabel: "Inventory Controller",
    workPlaceholder:
      "e.g. Received 40 bags cement (GRN-112). Issued 2 tonnes steel to Site B. Cycle count done for Aisle 3.",
    issuesPlaceholder:
      "e.g. 5 bags damaged on arrival. Steel count 20kg short vs GRN. Leave blank if none.",
    nextPlaceholder: "e.g. Physical count of electrical items. Receive PO-2041.",
  },
  logistics_coordinator: {
    roleLabel: "Logistics Coordinator",
    workPlaceholder:
      "e.g. 3 deliveries dispatched to Site A. Cement truck delivered to Site B. One steel load delayed at vendor.",
    issuesPlaceholder:
      "e.g. Truck broke down en route to Site A. Vendor delayed loading. Leave blank if none.",
    nextPlaceholder: "e.g. Dispatch 4 deliveries to Site C. Confirm vehicle for steel pickup.",
  },
  office_administrator: {
    roleLabel: "Office Administrator",
    workPlaceholder:
      "e.g. Closed 3 office requests (stationery, AC service). Registered 6 visitors. Reissued 2 laptops.",
    issuesPlaceholder:
      "e.g. Printer vendor has not confirmed the service slot. Leave blank if none.",
    nextPlaceholder: "e.g. Follow up on the furniture quotation. Renew the courier contract.",
  },
};

export const emptyForm = () => ({
  work: "",
  overallStatus: "on-track",
  issues: "",
  pending: "",
  nextPlan: "",
});

// Saved row -> form
export const rowToForm = (row) => ({
  work: row.work || "",
  overallStatus: row.overall_status || "on-track",
  issues: row.issues || "",
  pending: row.pending || "",
  nextPlan: row.next_plan || "",
});

// Form -> API payload
export const formToPayload = (form) => ({
  work: form.work,
  overall_status: form.overallStatus,
  issues: form.issues,
  pending: form.pending,
  next_plan: form.nextPlan,
});