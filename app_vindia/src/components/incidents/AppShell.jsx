import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import IncidentManagement from "./IncidentManagement";
import TaskQueue from "./taskQueue";
import { API } from "../../services/authService";

function normaliseIncident(inc) {
  return {
    id: inc.id,
    incidentNo: inc.incident_no,
    title: inc.title,
    description: inc.description ?? "",
    priority: inc.priority,
    status: inc.status,
    assignedTo: inc.assigned_role ?? "",
    assignedName: inc.assigned_to_name ?? "",
    assignedId: inc.assigned_to_id ?? null,
    createdAt: new Date(inc.created_at),
    updatedAt: new Date(inc.updated_at),
    deadlineAt: inc.deadline_at ? new Date(inc.deadline_at) : null,
    resolvedAt: inc.resolved_at ? new Date(inc.resolved_at) : null,
    taskCount: Number(inc.task_count ?? 0),
    commentCount: Number(inc.comment_count ?? 0),
    photoCount: Number(inc.photo_count ?? 0),
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

export default function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(
    searchParams.get("page") === "tasks" ? "taskqueue" : "incidents",
  );
  const [incidents, setIncidents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync page state when URL query param changes (e.g. sidebar link clicked)
  useEffect(() => {
    if (searchParams.get("page") === "tasks") {
      setPage("taskqueue");
    } else {
      setPage("incidents");
    }
  }, [searchParams]);

  // Keep URL in sync when page changes programmatically
  const navigateToQueue = useCallback(() => {
    setSearchParams({ page: "tasks" });
  }, [setSearchParams]);

  const navigateToIncidents = useCallback(() => {
    setSearchParams({});
  }, [setSearchParams]);

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

  const fetchUsers = useCallback(async () => {
    try {
      const res = await API.get("/users");
      const normalised = (Array.isArray(res.data) ? res.data : []).map((u) => ({
        id: u.id,
        name: u.name,
        roleId: u.role_id,
        roleName: u.role ?? "",
      }));
      setUsers(normalised);
    } catch (err) {
      console.error("fetchUsers:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchIncidents(), fetchUsers()]).finally(() =>
      setLoading(false),
    );
  }, [fetchIncidents, fetchUsers]);

  const refreshIncident = useCallback(async (incidentId) => {
    try {
      const res = await API.get(`/incidents/${incidentId}`);
      const updated = normaliseIncident(res.data.data);
      setIncidents((prev) =>
        prev.map((inc) => (inc.id === incidentId ? updated : inc)),
      );
      return updated;
    } catch (err) {
      console.error("refreshIncident:", err);
    }
  }, []);

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
          onNavigateToQueue={navigateToQueue}
        />
      ) : (
        <TaskQueue
          incidents={incidents}
          setIncidents={setIncidents}
          users={users}
          refreshIncident={refreshIncident}
          onNavigateBack={navigateToIncidents}
        />
      )}
    </>
  );
}
