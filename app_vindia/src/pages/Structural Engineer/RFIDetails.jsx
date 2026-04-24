// pages/structural-engineer/RFIDetails.jsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchRFIById, submitRFIAnswer, QUERY_KEYS } from "../../api/structuralApi";
import "./RFI.css";

export default function RFIDetails() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState("");

  // ✅ useQuery — fetches & caches this specific RFI
  const {
    data: rfi,
    isLoading,
    isError,
  } = useQuery({
    queryKey: QUERY_KEYS.rfi(id),
    queryFn: () => fetchRFIById(id),
    onSuccess: (data) => {
      // Pre-fill textarea if answer already exists
      setAnswer(data.response || "");
    },
  });

  // ✅ useMutation — submit answer, update this RFI in cache + RFI list
  const answerMutation = useMutation({
    mutationFn: submitRFIAnswer,
    onSuccess: (updated) => {
      // Update this detail view
      queryClient.setQueryData(QUERY_KEYS.rfi(id), updated);
      // Also refresh the RFI list so status shows "Answered" there too
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.rfis });
      alert("✅ Answer submitted");
    },
    onError: () => alert("❌ Failed to submit"),
  });

  const submitAnswer = () => {
    if (!answer.trim()) { alert("Please enter response"); return; }
    answerMutation.mutate({ id, response: answer });
  };

  // ─── States ─────────────────────────────────────────────────────────────
  if (isLoading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (isError)   return <div style={{ padding: 20, color: "#ef4444" }}>⚠️ Failed to load RFI</div>;

  return (
    <div className="rfi-details">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div className="rfi-details-header">
        <h2>{rfi.rfi_code || `RFI-${rfi.id}`}</h2>
        <span className={`status-badge ${rfi.status?.toLowerCase()}`}>
          {rfi.status}
        </span>
      </div>

      {/* ── INFO ────────────────────────────────────────────────────── */}
      <div className="rfi-details-info">
        <p><strong>Project:</strong>    {rfi.project}</p>
        <p><strong>Subject:</strong>    {rfi.subject}</p>
        <p><strong>Priority:</strong>   {rfi.priority}</p>
        <p><strong>Raised By:</strong>  {rfi.raised_by || "You"}</p>
        <p><strong>Date:</strong>       {new Date(rfi.date).toLocaleDateString()}</p>
      </div>

      {/* ── RESPONSE SECTION ────────────────────────────────────────── */}
      <div className="rfi-response-box">
        <h3>Response</h3>

        {rfi.status === "Answered" ? (
          <div className="response-view">
            {rfi.response || "No response provided"}
          </div>
        ) : (
          <>
            <textarea
              placeholder="Write your response..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <button onClick={submitAnswer} disabled={answerMutation.isPending}>
              {answerMutation.isPending ? "Saving..." : "Submit Answer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}