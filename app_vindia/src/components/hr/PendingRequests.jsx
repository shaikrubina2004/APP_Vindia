import { FaClipboardList } from "react-icons/fa";

function PendingRequests({ data = [] }) {
  console.log("Pending Requests Data:", data);

  const counts = {
    leave: 0,
    travel: 0,
    document: 0,
  };

  (data || []).forEach((item) => {
    const type = item.type?.toLowerCase();
    const status = item.status?.toLowerCase();

    if (status === "pending") {
      if (type?.includes("leave")) counts.leave += 1;
      if (type?.includes("travel")) counts.travel += 1;
      if (type?.includes("document")) counts.document += 1;
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