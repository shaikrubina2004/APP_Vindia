import { STATUS_TONE } from "./opsFormat";

export default function StatusBadge({ status }) {
  const tone = STATUS_TONE[status] || "gray";
  return (
    <span className={`ops-badge ops-badge-${tone}`}>
      <span className="ops-badge-dot" />
      {String(status || "—").replace(/_/g, " ")}
    </span>
  );
}
