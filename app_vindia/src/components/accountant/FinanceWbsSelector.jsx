// ===== FILE: APP_Vindia/app_vindia/src/components/accountant/FinanceWbsSelector.jsx =====
//
// Reusable Project -> WBS/Milestone -> Activity/Subtask classifier for
// every Finance create/edit form (Section 8).
//
// DESIGN NOTE: every host form (Expenses, Invoices, Payments, Journal
// Entries...) already owns its OWN Project selector, tied into other
// form logic (vendor lists, invoice linking, etc). Duplicating a second
// Project dropdown inside this component would create two competing
// sources of truth for "which project". So this component takes
// `projectId` (and `projectLabel`, for the always-visible project
// context) as props from the host's existing selector, and owns only
// the WBS/Milestone -> Activity cascade — which is the part that does
// not exist anywhere else in the app yet.
//
// Usage:
//   <FinanceWbsSelector
//     projectId={form.project_id}
//     projectLabel={selectedProjectName}
//     value={form.wbs_id}
//     onChange={(ctx) => setForm(f => ({ ...f, wbs_id: ctx ? ctx.wbs_id : null }))}
//     fetchWbs={accountantService.getFinanceWbs}   // or financeService.getFinanceWbs
//     required
//   />

import { useEffect, useRef, useState } from "react";
import "./FinanceWbsSelector.css";

function findNode(tree, id) {
  if (id === null || id === undefined || id === "") return null;
  const numId = Number(id);
  for (const milestone of tree) {
    if (milestone.id === numId) return { milestone, activity: null };
    for (const activity of milestone.children || []) {
      if (activity.id === numId) return { milestone, activity };
    }
  }
  return null;
}

function buildContext(milestone, activity) {
  if (!milestone) return null;
  const node = activity || milestone;
  return {
    wbs_id: node.id,
    wbs_code: node.code,
    wbs_name: node.name,
    wbs_level: activity ? "activity" : "milestone",
    milestone_id: milestone.id,
    milestone_code: milestone.code,
    milestone_name: milestone.name,
  };
}

export default function FinanceWbsSelector({
  projectId,
  projectLabel,
  value,
  onChange,
  fetchWbs,
  required = false,
  disabled = false,
  label = "WBS / Milestone Classification",
  helperText = "Every project-related financial entry must trace back to a WBS milestone or activity.",
}) {
  const [tree, setTree] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorMsg, setErrorMsg] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!projectId) {
      setTree([]);
      setStatus("idle");
      return;
    }
    const myRequest = ++requestId.current;
    setStatus("loading");
    setErrorMsg("");

    (async () => {
      try {
        const res = await fetchWbs(projectId);
        if (myRequest !== requestId.current) return; // stale response, a newer project was selected meanwhile
        const data = res?.data?.data || res?.data || [];
        setTree(Array.isArray(data) ? data : []);
        setStatus("ready");
      } catch (err) {
        if (myRequest !== requestId.current) return;
        setErrorMsg(
          err?.response?.data?.message || "Could not load WBS items for this project."
        );
        setStatus("error");
      }
    })();
  }, [projectId, fetchWbs]);

  const selected = findNode(tree, value);
  const selectedMilestoneId = selected?.milestone?.id ?? "";
  const selectedActivityId = selected?.activity?.id ?? "";
  const activityOptions = selected?.milestone?.children || [];

  const handleMilestoneChange = (e) => {
    const milestoneId = e.target.value;
    if (milestoneId === "") {
      onChange(null);
      return;
    }
    const milestone = tree.find((m) => String(m.id) === milestoneId);
    // Selecting a milestone alone is a complete, valid classification —
    // the activity dropdown below is an optional narrowing, never a
    // requirement (Section 2: "Where wbs_id points directly to a
    // top-level milestone, that is also valid").
    onChange(buildContext(milestone, null));
  };

  const handleActivityChange = (e) => {
    const activityId = e.target.value;
    const milestone = tree.find((m) => m.id === selected?.milestone?.id);
    if (activityId === "") {
      onChange(buildContext(milestone, null));
      return;
    }
    const activity = (milestone?.children || []).find(
      (c) => String(c.id) === activityId
    );
    onChange(buildContext(milestone, activity));
  };

  const isDisabled = disabled || !projectId || status === "loading" || status === "error";

  return (
    <div className="fws-wrap">
      <div className="fws-head">
        <div>
          <span className="fws-label">
            {label} {required && <b className="fws-required">*</b>}
          </span>
          <span className="fws-helper">{helperText}</span>
        </div>
        <span className="fws-project-chip" title="Selected project context">
          {projectLabel ? (
            <>
              <i className="fws-dot" /> {projectLabel}
            </>
          ) : (
            "No project selected"
          )}
        </span>
      </div>

      {!projectId && (
        <div className="fws-state fws-state-idle">
          Select a project first to load its WBS milestones.
        </div>
      )}

      {projectId && status === "loading" && (
        <div className="fws-state fws-state-loading">
          <span className="fws-spinner" /> Loading WBS items…
        </div>
      )}

      {projectId && status === "error" && (
        <div className="fws-state fws-state-error">{errorMsg}</div>
      )}

      {projectId && status === "ready" && tree.length === 0 && (
        <div className="fws-state fws-state-empty">
          No WBS milestones exist for this project yet. Ask the Project
          Manager / Site Engineer to create the WBS breakdown first.
        </div>
      )}

      {projectId && status === "ready" && tree.length > 0 && (
        <div className="fws-grid">
          <label className="fws-field">
            <span>WBS / Milestone</span>
            <select
              value={selectedMilestoneId}
              onChange={handleMilestoneChange}
              disabled={isDisabled}
            >
              <option value="">
                {required ? "Select a milestone…" : "— None —"}
              </option>
              {tree.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code ? `${m.code} — ${m.name}` : m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="fws-field">
            <span>Activity / Subtask</span>
            <select
              value={selectedActivityId}
              onChange={handleActivityChange}
              disabled={isDisabled || !selectedMilestoneId || activityOptions.length === 0}
            >
              <option value="">
                {activityOptions.length === 0
                  ? "No sub-activities — milestone applies"
                  : "Milestone level (no specific activity)"}
              </option>
              {activityOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code ? `${a.code} — ${a.name}` : a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {selected && (
        <div className="fws-trail">
          <span className="fws-trail-chip fws-trail-project">{projectLabel}</span>
          <span className="fws-trail-arrow">→</span>
          <span className="fws-trail-chip fws-trail-milestone">
            {selected.milestone.code} · {selected.milestone.name}
          </span>
          {selected.activity && (
            <>
              <span className="fws-trail-arrow">→</span>
              <span className="fws-trail-chip fws-trail-activity">
                {selected.activity.code} · {selected.activity.name}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact, read-only badge for tables/lists (Section 26) ──────────
// Usage: <WbsBadge code={row.wbs_code} name={row.wbs_name}
//                   milestoneCode={row.milestone_code} milestoneName={row.milestone_name} />
export function WbsBadge({ code, name, milestoneCode, milestoneName }) {
  if (!code) {
    return <span className="fws-badge fws-badge-unassigned">WBS not assigned</span>;
  }
  const isActivity = milestoneCode && milestoneCode !== code;
  return (
    <span
      className="fws-badge"
      title={isActivity ? `${milestoneCode} — ${milestoneName}` : undefined}
    >
      <strong>{code}</strong>
      <em>{name}</em>
      {isActivity && <small>under {milestoneCode}</small>}
    </span>
  );
}
