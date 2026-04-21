
import { useState , useEffect} from "react";
import "./RFI.css";
import axios from "axios";
import CreateRFI from "./CreateRFI";
import { useNavigate } from "react-router-dom";

export default function RFI() {
  const [rfiData, setRfiData] = useState([]);
  const [filter, setFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);

  const navigate = useNavigate();

  // ✅ FIXED EFFECT (NO WARNING)
  useEffect(() => {
    const loadRFIs = async () => {
      try {
        const res = await axios.get("http://localhost:5000/rfis");
        setRfiData(res.data);
      } catch (err) {
        console.error("Error fetching RFIs:", err);
      }
    };

    loadRFIs();
  }, []);

  // FILTER
  const filteredData =
    filter === "All"
      ? rfiData
      : rfiData.filter(
          (rfi) =>
            rfi.status &&
            rfi.status.toLowerCase() === filter.toLowerCase()
        );

  // COUNTS
  const total = rfiData.length;
  const pending = rfiData.filter((r) => r.status === "Pending").length;
  const answered = rfiData.filter((r) => r.status === "Answered").length;
  const open = pending;
  const closed = answered;

  // CREATE
  const addRFI = async (newRFI) => {
    try {
      const res = await axios.post("http://localhost:5000/rfis", newRFI);
      setRfiData((prev) => [res.data, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  // UPDATE STATUS
  const updateStatus = async (id, status) => {
    try {
      const res = await axios.put(
        `http://localhost:5000/rfis/${id}/status`,
        { status }
      );

      setRfiData((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: res.data.status } : r
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rfi-wrapper">
      {/* HEADER */}
      <div className="rfi-header">
        <h2 className="rfi-title">RFI Management</h2>

        <button className="rfi-add-btn" onClick={() => setShowModal(true)}>
          + Add RFI
        </button>
      </div>

      {/* CARDS */}
      <div className="rfi-cards">
        <div className="rfi-card total">
          Total RFIs <strong>{total}</strong>
        </div>

        <div className="rfi-card open">
          Open <strong>{open}</strong>
        </div>

        <div className="rfi-card pending">
          Pending <strong>{pending}</strong>
        </div>

        <div className="rfi-card closed">
          Closed <strong>{closed}</strong>
        </div>
      </div>

      {/* FILTER */}
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

      {/* TABLE */}
      <div className="rfi-table-container">
        <table className="rfi-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Project</th>
              <th>Subject</th>
              <th>Raised By</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((rfi) => (
              <tr
                key={rfi.id}
                onClick={() =>
                  navigate(`/structural-engineer/rfi/${rfi.id}`)
                }
              >
                <td>{rfi.id}</td>
                <td>{rfi.project}</td>
                <td className="text-wrap">{rfi.subject}</td>
                <td>{rfi.raised_by}</td>

                <td className={`priority ${rfi.priority.toLowerCase()}`}>
                  {rfi.priority}
                </td>

                {/* STATUS */}
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    className="status-dropdown"
                    value={rfi.status}
                    onChange={(e) =>
                      updateStatus(rfi.id, e.target.value)
                    }
                  >
                    <option>Pending</option>
                    <option>Answered</option>
                    <option>Closed</option>
                  </select>
                </td>

                <td>
                  {rfi.date
                    ? new Date(rfi.date).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showModal && (
        <CreateRFI
          onClose={() => setShowModal(false)}
          onCreate={addRFI}
        />
      )}
    </div>
  );
}