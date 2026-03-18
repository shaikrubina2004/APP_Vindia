import { useNavigate } from "react-router-dom";

function QuickActions(){

  const navigate = useNavigate(); 

  return(

    <div className="quick-actions">

      <h3>Quick Actions</h3>

      <button onClick={() => navigate("/hr/add-employee")}>
        Add Employee
      </button>

      <button>Approve Leave</button>
      <button>Upload Document</button>
      <button>Generate HR Letter</button>

    </div>

  )

}

export default QuickActions;