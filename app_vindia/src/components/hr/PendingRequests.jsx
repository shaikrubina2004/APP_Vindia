import { FaClipboardList } from "react-icons/fa";

function PendingRequests({ data }) {
  if (!data) {
    return (
      <div className="dashboard-card">
        <h3>
          <FaClipboardList className="card-icon" /> Pending Requests
        </h3>
        <p>Loading...</p>
      </div>
    );
  }

  // Convert array → object for easy access
  const counts = {
    leave: 0,
    travel: 0,
    document: 0,
  };

  data.forEach(item => {
    if (item.type?.toLowerCase() === "leave") {
      counts.leave = parseInt(item.count);
    }
    if (item.type?.toLowerCase() === "travel") {
      counts.travel = parseInt(item.count);
    }
    if (item.type?.toLowerCase() === "document") {
      counts.document = parseInt(item.count);
    }
  });

  return (
    <div className="dashboard-card">
      <h3>
        <FaClipboardList className="card-icon" /> Pending Requests
      </h3>

      <ul>
        <li>Leave Requests : {counts.leave}</li>
        <li>Travel Requests : {counts.travel}</li>
        <li>Document Verification : {counts.document}</li>
      </ul>
    </div>
  );
}

export default PendingRequests;