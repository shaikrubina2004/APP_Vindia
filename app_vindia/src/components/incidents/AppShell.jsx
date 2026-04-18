import React, { useState, useEffect, useCallback } from "react";
import IncidentManagement from "./IncidentManagement";
import TaskQueue from "./taskQueue";
import { API } from "../../services/authService";

/* ─── normalise helpers ──────────────────────────────────── */
function normaliseTask(t) {
  return {
    id: t.id,
    taskNo: t.task_no,
    incidentId: t.incident_id ?? "", // ✅ FIX: was missing in AppShell version

    title: t.title,
    note: t.note ?? "",
    priority: t.priority,
    status: t.status,

    // ✅ FIX: normalise both camelCase (already normalised) and snake_case (raw API)
    assignedTo: t.role_name ?? t.assignedTo ?? "",
    assignedName: t.assignee_name ?? t.assignedName ?? "",
    assignedId: t.assignee_id ?? t.assignedId ?? null,

    createdAt: t.created_at
      ? new Date(t.created_at)
      : (t.createdAt ?? new Date()),
    updatedAt: t.updated_at
      ? new Date(t.updated_at)
      : (t.updatedAt ?? new Date()),

    comments: (t.comments ?? []).map((c) => ({
      author: c.author_name ?? c.author ?? "Unknown",
      text: c.body ?? c.text ?? "",
      time: c.created_at ? new Date(c.created_at) : (c.time ?? new Date()),
      type: c.comment_type ?? c.type ?? "comment",
    })),
  };
}

function normaliseIncident(inc) {
  return {
    id: inc.id,
    incidentNo: inc.incident_no,

    title: inc.title,
    description: inc.description ?? "",
    priority: inc.priority,
    status: inc.status,

    assignedTo: inc.assigned_role ?? inc.role_name ?? "",
    assignedName: inc.assigned_to_name ?? inc.assignee_name ?? "",
    assignedId: inc.assigned_to_id ?? null,

    createdAt: new Date(inc.created_at),
    updatedAt: new Date(inc.updated_at),
    deadlineAt: inc.deadline_at ? new Date(inc.deadline_at) : null,
    resolvedAt: inc.resolved_at ? new Date(inc.resolved_at) : null,

    taskCount: Number(inc.task_count ?? 0),
    commentCount: Number(inc.comment_count ?? 0),
    photoCount: Number(inc.photo_count ?? 0),

    comments: (inc.comments ?? []).map((c) => ({
      author: c.author_name ?? c.author ?? "Unknown",
      text: c.body ?? c.text ?? "",
      time: c.created_at ? new Date(c.created_at) : new Date(),
    })),

    // ✅ FIX: always run each task through normaliseTask so fields are consistent
    tasks: (inc.tasks ?? []).map((t) => normaliseTask(t)),

    photos: inc.photos ?? [],
  };
}

/* ─── APP SHELL ─────────────────────────────────────────── */
export default function AppShell() {
  const [page, setPage] = useState("incidents");
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Fetch all incidents (list view) ── */
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await API.get("/incidents");
      const data = (res.data.data ?? []).map(normaliseIncident);
      setIncidents(data);
    } catch (err) {
      console.error("fetchIncidents:", err);
      setError("Failed to load incidents");
    }
  }, []);

  /* ── Fetch users with their roles ── */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get("/users");
      const raw = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];

      setUsers(
        raw.map((u) => ({
          id: u.id,
          name: u.name,
          roleId: u.role_id,
          roleName: u.role ?? u.role_name ?? "",
        })),
      );
    } catch (err) {
      console.error("fetchUsers:", err);
      // non-fatal — dropdowns stay empty
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchIncidents(), fetchUsers()]).finally(() =>
      setLoading(false),
    );
  }, [fetchIncidents, fetchUsers]);

  /* ── Re-fetch a single incident and merge it in ──
   * ✅ FIX: now RETURNS the normalised incident so callers
   *         (card click, after create, after convert) get fresh data.
   */
  const refreshIncident = useCallback(async (incidentId) => {
    try {
      const res = await API.get(`/incidents/${incidentId}`);
      const updated = normaliseIncident(res.data.data);

      setIncidents(
        (prev) =>
          prev.some((i) => i.id === incidentId)
            ? prev.map((i) => (i.id === incidentId ? updated : i))
            : [updated, ...prev], // handles brand-new incidents too
      );

      return updated; // ✅ callers receive the fresh object
    } catch (err) {
      console.error("refreshIncident:", err);
      return null;
    }
  }, []);

  /* ── Loading / error ── */
  if (loading) {
    return (
      <div
        className="inc-page"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div className="inc-shell-loading">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="inc-spin"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p>Loading incidents…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="inc-page"
        style={{ alignItems: "center", justifyContent: "center" }}
      >
        <div className="inc-shell-error">
          <p>⚠️ {error}</p>
          <button
            className="inc-create-btn"
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchIncidents().finally(() => setLoading(false));
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {page === "incidents" ? (
        <IncidentManagement
          incidents={incidents}
          setIncidents={setIncidents}
          users={users}
          refreshIncident={refreshIncident}
          onNavigateToQueue={() => setPage("taskqueue")}
        />
      ) : (
        <TaskQueue
          incidents={incidents}
          setIncidents={setIncidents}
          users={users}
          refreshIncident={refreshIncident}
          onNavigateBack={() => setPage("incidents")}
        />
      )}
    </>
  );
}
