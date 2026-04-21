import React, { useState, useEffect, useCallback } from "react";
import IncidentManagement from "./IncidentManagement";
import TaskQueue from "./taskQueue";
import { API } from "../../services/authService";
// adjust if your base URL differs

/* ─── normalise API incident shape → shape the UI expects ── */
function normaliseIncident(inc) {
  return {
    // identity
    id: inc.id,
    incidentNo: inc.incident_no,

    // content
    title: inc.title,
    description: inc.description ?? "",
    priority: inc.priority,
    status: inc.status,

    // assignee — comes from v_incident_overview joins
    assignedTo: inc.assigned_role ?? "",
    assignedName: inc.assigned_to_name ?? "",
    assignedId: inc.assigned_to_id ?? null,

    // dates — keep as ISO strings, helpers call new Date() when needed
    createdAt: new Date(inc.created_at),
    updatedAt: new Date(inc.updated_at),
    deadlineAt: inc.deadline_at ? new Date(inc.deadline_at) : null,
    resolvedAt: inc.resolved_at ? new Date(inc.resolved_at) : null,

    // counts from the overview view
    taskCount: Number(inc.task_count ?? 0),
    commentCount: Number(inc.comment_count ?? 0),
    photoCount: Number(inc.photo_count ?? 0),

    // detail arrays — populated when a single incident is fetched
    comments: (inc.comments ?? []).map((c) => ({
      author: c.author_name,
      text: c.body,
      time: new Date(c.created_at),
    })),
    tasks: (inc.tasks ?? []).map(normaliseTask),
    photos: inc.photos ?? [],
  };
}

function normaliseTask(t) {
  return {
    id: t.id,
    taskNo: t.task_no,
    incidentId: t.incident_id ?? t.incidentId,
    title: t.title,
    note: t.note ?? "",
    priority: t.priority,
    status: t.status,
    assignedTo: t.role_name ?? t.assignedTo ?? "",
    assignedName: t.assignee_name ?? t.assignedName ?? "",
    assignedId: t.assignee_id ?? t.assignedId ?? null,
    createdAt: new Date(t.created_at ?? t.createdAt),
    updatedAt: new Date(t.updated_at ?? t.updatedAt),
    comments: (t.comments ?? []).map((c) => ({
      author: c.author_name ?? c.author,
      text: c.body ?? c.text,
      time: new Date(c.created_at ?? c.time),
      type: c.comment_type ?? c.type ?? "comment",
    })),
  };
}

/* ─── APP SHELL ─────────────────────────────────────────── */
export default function AppShell() {
  const [page, setPage] = useState("incidents");
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]); // [{ id, name, role_name, role_id }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Fetch all incidents (list view) ── */
  const fetchIncidents = useCallback(async () => {
    try {
      const res = await API.get("/incidents");

      const data = res.data.data.map(normaliseIncident);
      setIncidents(data);
    } catch (err) {
      console.error("fetchIncidents:", err);
      setError("Failed to load incidents");
    }
  }, []);

  /* ── Fetch users with their roles (for assign dropdowns) ── */
  const fetchUsers = useCallback(async () => {
    try {
      // Your existing users endpoint — adjust if path differs
      // Expected shape: [{ id, name, role_id, role_name }]
      const res = await API.get("/users");

      const normalised = (Array.isArray(res.data) ? res.data : []).map((u) => ({
        id: u.id,
        name: u.name,
        roleId: u.role_id,
        roleName: u.role ?? "", // 👈 VERY IMPORTANT
      }));
      setUsers(normalised);
    } catch (err) {
      console.error("fetchUsers:", err);
      // Non-fatal — dropdowns just stay empty
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchIncidents(), fetchUsers()]).finally(() =>
      setLoading(false),
    );
  }, [fetchIncidents, fetchUsers]);

  /* ── Re-fetch a single incident after mutation and merge it in ── */
  const refreshIncident = useCallback(async (incidentId) => {
    try {
      const res = await API.get(`/incidents/${incidentId}`);
      const updated = normaliseIncident(res.data.data);

      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? updated : inc)),
      );
    } catch (err) {
      console.error("refreshIncident:", err);
    }
  }, []);

  /* ── Loading / error states ── */
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
