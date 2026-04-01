import { useNavigate } from "react-router-dom";
import { FaUserPlus, FaCheckCircle, FaFileUpload } from "react-icons/fa";

function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="card quick-actions-card">
      <h3>⚡ Quick Actions</h3>

      <div className="actions-grid">

        <button onClick={() => navigate("/hr/add-employee")}>
          <FaUserPlus />
          <span>Add Employee</span>
        </button>

        <button onClick={() => navigate("/hr/leaves")}>
          <FaCheckCircle />
          <span>Approve Leave</span>
        </button>

       

      </div>
    </div>
  );
}

export default QuickActions;