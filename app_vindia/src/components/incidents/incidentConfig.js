export const PRIORITY_CONFIG = {
  P1: {
    label: "P1 - Urgent",
    color: "p1",
    days: 0,
    icon: "🔴",
    desc: "Same day resolution",
  },
  P2: {
    label: "P2 - Medium",
    color: "p2",
    days: 2,
    icon: "🟡",
    desc: "2–3 days resolution",
  },
  P3: {
    label: "P3 - Low",
    color: "p3",
    days: 7,
    icon: "🟢",
    desc: "Low priority",
  },
};

export const STATUS_FLOW = [
  "Created",
  "Assigned",
  "In Progress",
  "Resolved",
  "Closed",
];

export const STATUS_CONFIG = {
  Created: { color: "s-created", icon: "✦" },
  Assigned: { color: "s-assigned", icon: "◎" },
  "In Progress": { color: "s-inprogress", icon: "◐" },
  Resolved: { color: "s-resolved", icon: "✔" },
  Closed: { color: "s-closed", icon: "■" },
};

export const TASK_STATUS_FLOW = ["Pending", "In Progress", "Done", "Blocked"];

export const TASK_STATUS_CONFIG = {
  Pending: { color: "ts-pending", icon: "○" },
  "In Progress": { color: "ts-inprog", icon: "◐" },
  Done: { color: "ts-done", icon: "✔" },
  Blocked: { color: "ts-blocked", icon: "✕" },
};
