import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import IncidentManagement from "./IncidentManagement";
import TaskQueue from "./taskQueue";
import { API } from "../../services/authService";
import { useProject } from "../../context/ProjectContext";

function normaliseIncident(inc) {
  return {
    id: inc.id,
    incidentNo: inc.incident_no,
    title: inc.title,
    description: inc.description ?? "",
    priority: inc.priority,
    status: inc.status,
    createdByName: inc.created_by_name ?? "",
    assignedTo: inc.assigned_role ?? "",
    assignedName: inc.assigned_to_name ?? "",
    assignedId: inc.assigned_to_id ?? null,
    createdById: inc.created_by ?? null,
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
    photos: (inc.photos ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      uploadedAt: new Date(p.uploaded_at ?? p.uploadedAt),
    })),
  };
}

function normaliseTask(t) {
  return {
    id: t.id,
    taskNo: t.task_no,
    incidentId: t.incident_id ?? t.incidentId,
    incidentTitle: t.incident_title ?? t.incidentTitle ?? "",
    incidentPriority: t.incident_priority ?? t.incidentPriority ?? "P2",
    title: t.title,
    note: t.note ?? "",
    priority: t.priority,
    status: t.status,
    createdById: t.created_by_id ?? null,
    createdByName: t.created_by_name ?? "",
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
    photos: (t.photos ?? []).map((p) => ({
      id: p.id,
      url: p.url,
      uploadedAt: new Date(p.uploaded_at ?? p.uploadedAt),
    })),
  };
}

export default function AppShell() {
  const { activeProject } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(
    searchParams.get("page") === "tasks" ? "taskqueue" : "incidents",
  );
  const [incidents, setIncidents] = useState([]);
  const [standaloneTasks, setStandaloneTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync page state when URL query param changes
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

  /* ── Fetch all incidents (list view) ── */
  const fetchIncidents = useCallback(async () => {
    try {
      const url = activeProject?.id
        ? `/incidents?project_id=${activeProject.id}`
        : `/incidents?open_only=true`;
      const res = await API.get(url);
      const data = res.data.data.map(normaliseIncident);
      setIncidents(data);
      return data;
    } catch (err) {
      console.error("fetchIncidents:", err);
      setError("Failed to load incidents");
    }
  }, []);

  /* ── Fetch users with their roles ── */
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

  /* ── Fetch all tasks assigned to current user and merge into incidents ── */
  const fetchAllTasks = useCallback(async () => {
    try {
      const url = activeProject?.id
        ? `/incidents/tasks?project_id=${activeProject.id}`
        : `/incidents/tasks?open_only=true`;
      const res = await API.get(url);
      const tasks = res.data.data.map(normaliseTask);

      setIncidents((prev) => {
        // Merge tasks into existing incidents
        const merged = prev.map((inc) => ({
          ...inc,
          tasks: tasks.filter((t) => t.incidentId === inc.id),
        }));

        // Find tasks whose incident is NOT in the current user's incident list
        const existingIds = new Set(prev.map((i) => i.id));
        const orphanTasks = tasks.filter(
          (t) => t.incidentId && !existingIds.has(t.incidentId),
        );
        // Group orphan tasks by incidentId
        const orphanGroups = orphanTasks.reduce((acc, t) => {
          if (!acc[t.incidentId]) acc[t.incidentId] = [];
          acc[t.incidentId].push(t);
          return acc;
        }, {});

        // Create placeholder incidents for orphan tasks
        const placeholders = Object.entries(orphanGroups).map(
          ([incId, incTasks]) => ({
            id: incId,
            incidentNo: incTasks[0]?.incidentId ?? incId,
            title: incTasks[0]?.incidentTitle ?? "External Incident",
            description: "",
            priority: incTasks[0]?.incidentPriority ?? "P2",
            status: "In Progress",
            assignedTo: "",
            assignedName: "",
            assignedId: null,
            createdById: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deadlineAt: null,
            resolvedAt: null,
            taskCount: incTasks.length,
            commentCount: 0,
            photoCount: 0,
            comments: [],
            tasks: incTasks,
            photos: [],
          }),
        );

        return [...merged, ...placeholders];
      });
    } catch (err) {
      console.error("fetchAllTasks:", err);
    }
  }, []);

  useEffect(() => {
    setIncidents([]);
    setLoading(true);
    setError(null);

    const projectId = activeProject?.id ?? null;

    const load = async () => {
      try {
        const incUrl = projectId
          ? `/incidents?project_id=${projectId}`
          : `/incidents?open_only=true`;
        const taskUrl = projectId
          ? `/incidents/tasks?project_id=${projectId}`
          : `/incidents/tasks?open_only=true`;

        const [incRes, usersRes] = await Promise.all([
          API.get(incUrl),
          API.get("/users"),
        ]);

        const normalisedInc = incRes.data.data.map(normaliseIncident);
        setIncidents(normalisedInc);

        const normalisedUsers = (
          Array.isArray(usersRes.data) ? usersRes.data : []
        ).map((u) => ({
          id: u.id,
          name: u.name,
          roleId: u.role_id,
          roleName: u.role ?? "",
        }));
        setUsers(normalisedUsers);

        const taskRes = await API.get(taskUrl);
        const tasks = taskRes.data.data.map(normaliseTask);
        setStandaloneTasks(tasks.filter((t) => !t.incidentId));

        setIncidents((prev) => {
          const merged = prev.map((inc) => ({
            ...inc,
            tasks: tasks.filter((t) => t.incidentId === inc.id),
          }));
          const existingIds = new Set(prev.map((i) => i.id));
          const orphanTasks = tasks.filter(
            (t) => t.incidentId && !existingIds.has(t.incidentId),
          );
          const orphanGroups = orphanTasks.reduce((acc, t) => {
            if (!acc[t.incidentId]) acc[t.incidentId] = [];
            acc[t.incidentId].push(t);
            return acc;
          }, {});
          const placeholders = Object.entries(orphanGroups).map(
            ([incId, incTasks]) => ({
              id: incId,
              incidentNo: incTasks[0]?.incidentId ?? incId,
              title: incTasks[0]?.incidentTitle ?? "External Incident",
              description: "",
              priority: incTasks[0]?.incidentPriority ?? "P2",
              status: "In Progress",
              assignedTo: "",
              assignedName: "",
              assignedId: null,
              createdById: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              deadlineAt: null,
              resolvedAt: null,
              taskCount: incTasks.length,
              commentCount: 0,
              photoCount: 0,
              comments: [],
              tasks: incTasks,
              photos: [],
            }),
          );
          return [...merged, ...placeholders];
        });
      } catch (err) {
        console.error("load error:", err);
        setError("Failed to load incidents");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [activeProject?.id]);

  /* ── Re-fetch a single incident after mutation and merge it in ── */
  const refreshIncident = useCallback(
    async (incidentId) => {
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
    },
    [activeProject],
  );

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
              Promise.all([
                fetchIncidents(),
                fetchUsers(),
                fetchAllTasks(),
              ]).finally(() => setLoading(false));
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
          activeProject={activeProject}
        />
      ) : (
        <TaskQueue
          incidents={incidents}
          setIncidents={setIncidents}
          standaloneTasks={standaloneTasks}
          users={users}
          refreshIncident={refreshIncident}
          onNavigateBack={navigateToIncidents}
          refreshAllTasks={fetchAllTasks}
          activeProject={activeProject}
        />
      )}
    </>
  );
}
