import { PRIORITY_CONFIG } from "./incidentConfig";

export function timeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

export function isOverdue(incident) {
  if (["Resolved", "Closed"].includes(incident.status)) return false;
  const cfg = PRIORITY_CONFIG[incident.priority];
  const deadline = new Date(
    incident.createdAt.getTime() +
      cfg.days * 86400000 +
      (cfg.days === 0 ? 8 * 3600000 : 0),
  );
  return Date.now() > deadline.getTime();
}

export function getDeadlineText(incident) {
  const cfg = PRIORITY_CONFIG[incident.priority];
  const deadline = new Date(
    incident.createdAt.getTime() +
      cfg.days * 86400000 +
      (cfg.days === 0 ? 8 * 3600000 : 0),
  );
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return `Overdue by ${timeAgo(deadline)}`;
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 24) return `Due in ${hrs}h`;
  return `Due in ${days}d`;
}
