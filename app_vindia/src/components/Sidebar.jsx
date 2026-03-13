import { useEffect, useState } from "react";
import feather from "feather-icons";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {

  const [open, setOpen] = useState(false);

  useEffect(() => {
    feather.replace();
  }, []);

  return (
    <>
      {/* Mobile toggle button */}
      <button className="sidebar-toggle" onClick={() => setOpen(!open)}>
        ☰
      </button>

      <nav className={`sidebar ${open ? "open" : ""}`}>
        <ul className="sidebar__menu">

          <li className="sidebar__item">
            <Link to="/dashboard" className="sidebar__link">
              <i data-feather="home"></i>
              <span>Dashboard</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/hr" className="sidebar__link">
              <i data-feather="users"></i>
              <span>HR Management</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/finance" className="sidebar__link">
              <i data-feather="dollar-sign"></i>
              <span>Finance</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/projects" className="sidebar__link">
              <i data-feather="folder"></i>
              <span>Projects</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/wbs" className="sidebar__link">
              <i data-feather="layers"></i>
              <span>WBS Cost Tracking</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/attendance" className="sidebar__link">
              <i data-feather="calendar"></i>
              <span>Attendance</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/payroll" className="sidebar__link">
              <i data-feather="credit-card"></i>
              <span>Payroll</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/reports" className="sidebar__link">
              <i data-feather="file-text"></i>
              <span>Reports</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/leads" className="sidebar__link">
              <i data-feather="target"></i>
              <span>Leads / CRM</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/analytics" className="sidebar__link">
              <i data-feather="bar-chart-2"></i>
              <span>Analytics</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/users" className="sidebar__link">
              <i data-feather="user"></i>
              <span>User Management</span>
            </Link>
          </li>

          <li className="sidebar__item">
            <Link to="/settings" className="sidebar__link">
              <i data-feather="settings"></i>
              <span>Settings</span>
            </Link>
          </li>

        </ul>
      </nav>
    </>
  );
}

export default Sidebar;