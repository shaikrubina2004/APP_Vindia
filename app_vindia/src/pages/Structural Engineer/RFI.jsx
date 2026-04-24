// pages/structural-engineer/RFI.jsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import "./RFI.css";
import CreateRFI from "./CreateRFI";
import { fetchRFIs, createRFI, updateRFIStatus, QUERY_KEYS } from "../../api/structuralApi";

export default function RFI() {
  const [filter, setFilter]     = useState("All");
  const [showModal, setShowModal] = useState(false);
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();

  // ✅ useQuery — cached, no duplicate requests on re-mount
  const {
    data: rfiData = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.rfis,
    queryFn: fetchRFIs,
  });

  // ✅ useMutation: create RFI → prepend to cached list instantly
  const createMutation = useMutation({
    mutationFn: createRFI,
    onSuccess: (newRFI) => {
      // Optimistic: insert at top without full refetch
      queryClient.setQueryData(QUERY_KEYS.rfis, (old = []) => [newRFI, ...old]);
    },
  });

  // ✅ useMutation: update status → update only that row in cache
  const statusMutation = useMutation({
    mutationFn: updateRFIStatus,
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.rfis, (old = []) =>
        old.map((r) => (r.id === updated.id ? { ...r, status: updated.status } : r))
      );
    },
  });

  // ─── Derived values ─────────────────────────────────────────────────────
  const total    = rfiData.length;
  const pending  = rfiData.filter((r) => r.status === "Pending").length;
  const answered = rfiData.filter((r) => r.status === "Answered").length;

  const filteredData =
    filter === "All"
      ? rfiData
      : rfiData.filter(
          (rfi) => rfi.status?.toLowerCase() === filter.toLowerCase()
        );

  return (
    <div className="rfi-wrapper">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="rfi-header">
        <h2 className="rfi-title">RFI Management</h2>
        <button className="rfi-add-btn" onClick={() => setShowModal(true)}>
          + Add RFI
        </button>
      </div>

      {/* ── CARDS ───────────────────────────────────────────────────── */}
      <div className="rfi-cards">
        <div className="rfi-card total">Total RFIs  <strong>{total}</strong></div>
        <div className="rfi-card open">Open        <strong>{pending}</strong></div>
        <div className="rfi-card pending">Pending   <strong>{pending}</strong></div>
        <div className="rfi-card closed">Closed     <strong>{answered}</strong></div>
      </div>

      {/* ── FILTER TABS ─────────────────────────────────────────────── */}
      <div className="rfi-tabs">
        {["All", "Pending", "Answered"].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? "active" : ""}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── TABLE ───────────────────────────────────────────────────── */}
      <div className="rfi-table-container">
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af" }}>
            Loading RFIs...
          </div>
        ) : isError ? (
          <div style={{ padding: 40, textAlign: "center", color: "#ef4444" }}>
            ⚠️ Failed to load RFIs. Check server connection.
          </div>
        ) : (
          <table className="rfi-table">
            <thead>
              <tr>
                <th>ID</th><th>Project</th><th>Subject</th>
                <th>Raised By</th><th>Priority</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((rfi) => (
                <tr
                  key={rfi.id}
                  onClick={() => navigate(`/structural-engineer/rfi/${rfi.id}`)}
                >
                  <td>{rfi.id}</td>
                  <td>{rfi.project}</td>
                  <td className="text-wrap">{rfi.subject}</td>
                  <td>{rfi.raised_by}</td>
                  <td className={`priority ${rfi.priority?.toLowerCase()}`}>{rfi.priority}</td>

                  {/* ── Status dropdown — stop row click propagation ── */}
                  <td onClick={(e) => e.stopPropagation()}>
                    <select
                      className="status-dropdown"
                      value={rfi.status}
                      onChange={(e) =>
                        statusMutation.mutate({ id: rfi.id, status: e.target.value })
                      }
                    >
                      <option>Pending</option>
                      <option>Answered</option>
                      <option>Closed</option>
                    </select>
                  </td>

                  <td>{rfi.date ? new Date(rfi.date).toLocaleDateString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── MODAL ───────────────────────────────────────────────────── */}
      {showModal && (
        <CreateRFI
          onClose={() => setShowModal(false)}
          onCreate={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}