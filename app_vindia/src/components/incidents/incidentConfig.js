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

export const ASSIGNEE_ROLES = [
  "Site Engineer",
  "Architect",
  "Manager",
  "Supervisor",
  "Contractor",
];

export const MOCK_INCIDENTS = [
  {
    id: "INC-001",
    title: "Water leakage in Block B basement",
    description:
      "Severe water seepage detected near the eastern wall of Block B basement. Structural damage risk.",
    priority: "P1",
    status: "In Progress",
    assignedTo: "Site Engineer",
    assignedName: "Rajesh Kumar",
    createdAt: new Date(Date.now() - 3 * 3600000),
    updatedAt: new Date(Date.now() - 1 * 3600000),
    photo: null,
    comments: [
      {
        author: "Rajesh Kumar",
        text: "Investigating the source.",
        time: new Date(Date.now() - 2 * 3600000),
      },
    ],
    tasks: [],
  },
  {
    id: "INC-002",
    title: "Electrical wiring exposed on 3rd floor",
    description:
      "Exposed wiring near the corridor on floor 3. Safety hazard for workers.",
    priority: "P1",
    status: "Assigned",
    assignedTo: "Site Engineer",
    assignedName: "Priya Sharma",
    createdAt: new Date(Date.now() - 5 * 3600000),
    updatedAt: new Date(Date.now() - 4 * 3600000),
    photo: null,
    comments: [],
    tasks: [],
  },
  {
    id: "INC-003",
    title: "Design revision required for staircase",
    description:
      "Client requested staircase width increase from 1.2m to 1.5m as per new accessibility norms.",
    priority: "P2",
    status: "Created",
    assignedTo: "Architect",
    assignedName: "Anita Desai",
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
    photo: null,
    comments: [],
    tasks: [],
  },
  {
    id: "INC-004",
    title: "Material delivery delay — cement",
    description:
      "Cement delivery delayed by 3 days. May impact Block C foundation work.",
    priority: "P2",
    status: "Resolved",
    assignedTo: "Manager",
    assignedName: "Suresh Nair",
    createdAt: new Date(Date.now() - 3 * 86400000),
    updatedAt: new Date(Date.now() - 6 * 3600000),
    photo: null,
    comments: [
      {
        author: "Suresh Nair",
        text: "Alternative supplier arranged.",
        time: new Date(Date.now() - 6 * 3600000),
      },
    ],
    tasks: [],
  },
  {
    id: "INC-005",
    title: "Painting quality issue — exterior wall",
    description:
      "Uneven paint application on north-facing exterior wall. Touch-up required.",
    priority: "P3",
    status: "Closed",
    assignedTo: "Site Engineer",
    assignedName: "Rajesh Kumar",
    createdAt: new Date(Date.now() - 7 * 86400000),
    updatedAt: new Date(Date.now() - 2 * 86400000),
    photo: null,
    comments: [],
    tasks: [],
  },
];
