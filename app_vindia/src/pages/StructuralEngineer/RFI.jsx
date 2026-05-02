import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { fetchRFIs, updateRFIStatus, ROLE_LABELS } from "../../api/rfiApi";
import CreateRFIModal from "./CreateRFI";
import "./RFI.css";
// console.log("🚀 RFI PAGE LOADED");

const STATUS_STYLE = {
  open: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  responded: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  closed: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
};

const PRIORITY_COLOR = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#ca8a04",
  low: "#16a34a",
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

export default function RFIPage() {
  console.log("🚀 RFI COMPONENT RENDERED"); // ✅ move here

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = getUser();
  const myRole = user.role || "";

  const [view, setView] = useState("all");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const [rfis, setRfis] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        console.log("🔥 FETCHING RFIs...");
        const data = await fetchRFIs(view);
        console.log("✅ DATA:", data);

setRfis(Array.isArray(data?.rfis) ? data.rfis : []);
      } catch (err) {
        console.error("❌ ERROR:", err);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [view]);
  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => updateRFIStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rfis"] }),
  });

  const visible = rfis.filter((r) => {
    const matchStatus = filter === "all" || r.status === filter;
    const matchSearch =
      r.subject?.toLowerCase().includes(search.toLowerCase()) ||
      r.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      ROLE_LABELS[r.raised_by_role]
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      ROLE_LABELS[r.assigned_to_role]
        ?.toLowerCase()
        .includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const total = rfis.length;
  const open = rfis.filter((r) => r.status === "open").length;
  const responded = rfis.filter((r) => r.status === "responded").length;
  const closed = rfis.filter((r) => r.status === "closed").length;

  return (
    <div className="rfi-page">
      <div className="rfi-page-header">
        <div>
          <h1 className="rfi-page-title">RFI Management</h1>
          <p className="rfi-page-sub">
            Requests for Information across all roles
          </p>
        </div>
        <button className="rfi-btn-primary" onClick={() => setShowModal(true)}>
          + Raise RFI
        </button>
      </div>

      <div className="rfi-stats">
        {[
          { label: "Total", value: total, color: "#6366f1" },
          { label: "Open", value: open, color: "#f59e0b" },
          { label: "Responded", value: responded, color: "#3b82f6" },
          { label: "Closed", value: closed, color: "#10b981" },
        ].map((s) => (
          <div
            className="rfi-stat-card"
            key={s.label}
            style={{ borderLeft: `4px solid ${s.color}` }}
          >
            <span className="rfi-stat-label">{s.label}</span>
            <span className="rfi-stat-value" style={{ color: s.color }}>
              {s.value}
            </span>
          </div>
        ))}
      </div>

      <div className="rfi-view-tabs">
        {["all", "sent", "received"].map((v) => (
          <button
            key={v}
            className={`rfi-view-tab ${view === v ? "active" : ""}`}
            onClick={() => setView(v)}
          >
            {v === "all"
              ? "All RFIs"
              : v === "sent"
                ? "Raised by Me"
                : "Assigned to Me"}
          </button>
        ))}
      </div>

      <div className="rfi-controls">
        <div className="rfi-search-box">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            placeholder="Search subject, project, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="rfi-filter-tabs">
          {["all", "open", "responded", "closed"].map((f) => (
            <button
              key={f}
              className={`rfi-filter-tab ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="rfi-table-wrap">
        {isLoading && <p className="rfi-msg">Loading RFIs…</p>}
        {isError && (
          <p className="rfi-msg error">
            ⚠️ Failed to load RFIs. Check server connection.
          </p>
        )}
        {!isLoading && !isError && visible.length === 0 && (
          <p className="rfi-msg">
            No RFIs found. Click &quot;+ Raise RFI&quot; to create one.
          </p>
        )}
        {!isLoading && visible.length > 0 && (
          <table className="rfi-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>From</th>
                <th>To</th>
                <th>Project</th>
                <th>Priority</th>
                <th>Replies</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const isMyRFI = r.raised_by_role === myRole;
                const ss = STATUS_STYLE[r.status] || STATUS_STYLE.open;
                return (
                  <tr
                    key={r.id}
                    className={`rfi-row ${isMyRFI ? "mine" : "incoming"}`}
                    onClick={() => navigate(`/structural-engineer/rfi/${r.id}`)}
                  >
                    <td className="rfi-id">#{r.id}</td>
                    <td className="rfi-subject">{r.subject}</td>
                    <td>
                      <span
                        className={`rfi-role-chip ${isMyRFI ? "chip-me" : ""}`}
                      >
                        {ROLE_LABELS[r.raised_by_role] || r.raised_by_role}
                        {isMyRFI && " (me)"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`rfi-role-chip ${!isMyRFI ? "chip-me" : ""}`}
                      >
                        {ROLE_LABELS[r.assigned_to_role] || r.assigned_to_role}
                        {!isMyRFI && " (me)"}
                      </span>
                    </td>
                    <td>{r.project_name || "—"}</td>
                    <td>
                      <span
                        className="rfi-priority"
                        style={{
                          color: PRIORITY_COLOR[r.priority] || "#64748b",
                        }}
                      >
                        ● {r.priority}
                      </span>
                    </td>
                    <td className="rfi-replies">
                      {r.response_count > 0 ? (
                        <span className="reply-badge">{r.response_count}</span>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        className="rfi-status-select"
                        style={{
                          background: ss.bg,
                          color: ss.color,
                          borderColor: ss.border,
                        }}
                        value={r.status}
                        onChange={(e) =>
                          statusMutation.mutate({
                            id: r.id,
                            status: e.target.value,
                          })
                        }
                      >
                        <option value="open">Open</option>
                        <option value="responded">Responded</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    <td className="rfi-date">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CreateRFIModal
          myRole={myRole}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["rfis"] });
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
