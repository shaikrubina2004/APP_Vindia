import { useState } from "react";
import axios from "axios";

export default function SEtoQSHandover() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleHandover = async () => {
    try {
      setLoading(true);

      const projectId = localStorage.getItem("projectId"); // or from context

      await axios.put(`/api/boq/${projectId}/submit-to-qs`);

      setMessage("✅ Successfully submitted to Quantity Surveyor");
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to submit");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>SE → QS Handover</h2>

      <p>
        Ensure all drawings, analysis, and BOQ are completed before submission.
      </p>

      <button onClick={handleHandover} disabled={loading}>
        {loading ? "Submitting..." : "Submit to QS"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}