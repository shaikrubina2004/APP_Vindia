import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import "./RFI.css";

export default function RFIDetails() {
  const { id } = useParams();

  const [rfi, setRfi] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ FETCH
  useEffect(() => {
    const fetchRFI = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/rfis/${id}`);
        setRfi(res.data);
        setAnswer(res.data.response || "");
      } catch (err) {
        console.error(err);
      }
    };

    fetchRFI();
  }, [id]);

  // ✅ SUBMIT ANSWER
  const submitAnswer = async () => {
    if (!answer.trim()) return alert("Please enter response");

    setLoading(true);

    try {
      const res = await axios.put(
        `http://localhost:5000/rfis/${id}/answer`,
        { response: answer }
      );

      setRfi(res.data); // 🔥 instant UI update
      alert("✅ Answer submitted");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to submit");
    }

    setLoading(false);
  };

  if (!rfi) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="rfi-details">
      {/* HEADER */}
      <div className="rfi-details-header">
        <h2>{rfi.rfi_code || `RFI-${rfi.id}`}</h2>

        <span className={`status-badge ${rfi.status.toLowerCase()}`}>
          {rfi.status}
        </span>
      </div>

      {/* INFO */}
      <div className="rfi-details-info">
        <p><strong>Project:</strong> {rfi.project}</p>
        <p><strong>Subject:</strong> {rfi.subject}</p>
        <p><strong>Priority:</strong> {rfi.priority}</p>
        <p><strong>Raised By:</strong> {rfi.raised_by || "You"}</p>
        <p><strong>Date:</strong> {new Date(rfi.date).toLocaleDateString()}</p>
      </div>

      {/* ✨ RESPONSE SECTION */}
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

            <button onClick={submitAnswer} disabled={loading}>
              {loading ? "Saving..." : "Submit Answer"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}