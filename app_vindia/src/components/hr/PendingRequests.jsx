import { useEffect, useState } from "react";
import { FaClipboardList } from "react-icons/fa";
import { fetchAllLeaves } from "../../services/leaveService";

function PendingRequests() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadPending = async () => {
      try {
        const res = await fetchAllLeaves(); // gets only Pending from backend
        setCount(res.data.length);
      } catch (err) {
        console.error("Error fetching pending leaves", err);
      }
    };

    loadPending();
  }, []);

  return (
    <div className="dashboard-card">
      <h3>
        <FaClipboardList className="card-icon" /> Pending Requests
      </h3>

      <ul>
        <li>Leave Requests : {count}</li>
        <li>Travel Requests : 1</li>
        <li>Document Verification : 2</li>
      </ul>
    </div>
  );
}

export default PendingRequests;