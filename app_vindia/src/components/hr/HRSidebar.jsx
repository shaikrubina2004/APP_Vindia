import { useNavigate, useLocation } from "react-router-dom";
import "./HRSidebar.css";

function HRSidebar() {

  const navigate = useNavigate();
  const location = useLocation();

  const menu = [
    { name: "HR Dashboard", path: "/hr" },
    { name: "Employees", path: "/hr/employees" },
    { name: "Attendance", path: "/hr/attendance" },
    { name: "Leaves", path: "/hr/leaves" },
    { name: "Payroll", path: "/hr/payroll" },
    { name: "Documents", path: "/hr/documents" },
    { name: "Travel Requests", path: "/hr/travel" }
  ];

  return (

    <aside className="hr-sidebar">

      <div className="sidebar-header">
        <h2>HR Panel</h2>
      </div>

      <ul>

        {menu.map((item) => (

          <li
            key={item.path}
            className={
              location.pathname === item.path
                ? "sidebar-item active"
                : "sidebar-item"
            }
            onClick={() => navigate(item.path)}
          >

            {item.name}

          </li>

        ))}

      </ul>

    </aside>

  );

}

export default HRSidebar;