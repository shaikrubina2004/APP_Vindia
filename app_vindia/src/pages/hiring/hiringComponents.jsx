// ===== FILE: APP_Vindia/app_vindia/src/pages/hiring/hiringComponents.jsx =====
// Small components shared by the Manager pages now, and by the Finance / HR
// review pages later. Constants and helpers are in hiringConstants.js.
import { STATUS_META, getStepStates } from "./hiringConstants";
import "./HiringRequests.css";

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, tone: "cancelled" };
  return <span className={`hr-req-badge hr-req-badge--${meta.tone}`}>{meta.label}</span>;
}

export function Stepper({ request }) {
  const steps = getStepStates(request);
  const icon = { done: "✓", current: "…", rejected: "✕", skipped: "–", waiting: "" };
  return (
    <ol className="hr-req-stepper">
      {steps.map((s) => (
        <li key={s.key} className={`hr-req-step hr-req-step--${s.state}`}>
          <span className="hr-req-step-dot">{icon[s.state]}</span>
          <span className="hr-req-step-label">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}