import { PRIORITY_CONFIG } from "./incidentConfig";

export function timeAgo(date) {
  if (!date) return "—";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function isOverdue(incident) {
  if (!incident) return false;
  if (["Resolved", "Closed"].includes(incident.status)) return false;

  const cfg = PRIORITY_CONFIG[incident.priority];
  if (!cfg) return false;

  // ✅ FIX: AppShell normalises deadline_at → deadlineAt (camelCase)
  //    Fall back to raw deadline_at string if camelCase not present yet
  const deadlineRaw = incident.deadlineAt ?? incident.deadline_at;
  if (deadlineRaw) {
    return Date.now() > new Date(deadlineRaw).getTime();
  }

  // Client-side calculation when no deadline from server
  const created =
    incident.createdAt instanceof Date
      ? incident.createdAt
      : new Date(incident.createdAt ?? incident.created_at);

  const deadline = new Date(
    created.getTime() +
      cfg.days * 86400000 +
      (cfg.days === 0 ? 8 * 3600000 : 0),
  );
  return Date.now() > deadline.getTime();
}

export function getDeadlineText(incident) {
  if (!incident) return "—";

  const cfg = PRIORITY_CONFIG[incident.priority];
  if (!cfg) return "—";

  // ✅ FIX: same camelCase preference as isOverdue
  const deadlineRaw = incident.deadlineAt ?? incident.deadline_at;
  let deadline;

  if (deadlineRaw) {
    deadline = new Date(deadlineRaw);
  } else {
    const created =
      incident.createdAt instanceof Date
        ? incident.createdAt
        : new Date(incident.createdAt ?? incident.created_at);

    deadline = new Date(
      created.getTime() +
        cfg.days * 86400000 +
        (cfg.days === 0 ? 8 * 3600000 : 0),
    );
  }

  const diff = deadline.getTime() - Date.now();
  if (diff < 0) {
    // How long overdue
    const absDiff = Math.abs(diff);
    const overdueH = Math.floor(absDiff / 3600000);
    const overdueD = Math.floor(absDiff / 86400000);
    if (overdueH < 24) return `Overdue by ${overdueH}h`;
    return `Overdue by ${overdueD}d`;
  }

  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 24) return `Due in ${hrs}h`;
  return `Due in ${days}d`;
}
