import { useEffect } from "react";
import feather from "feather-icons";
import { Link } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {

  useEffect(() => {
    feather.replace();
  }, []);

  return (
   <nav className="sidebar">
  <ul className="sidebar__menu">

    <li className="sidebar__item">
      <Link to="/dashboard" className="sidebar__link">
        <i data-feather="home"></i>
        <span>Dashboard</span>
      </Link>
    </li>

    <li className="sidebar__item">
      <Link to="/projects" className="sidebar__link">
        <i data-feather="folder"></i>
        <span>Projects</span>
      </Link>
    </li>

    <li className="sidebar__item">
      <Link to="/finance" className="sidebar__link">
        <i data-feather="dollar-sign"></i>
        <span>Finance</span>
      </Link>
    </li>

    <li className="sidebar__item">
      <Link to="/leads" className="sidebar__link">
        <i data-feather="target"></i>
        <span>Leads</span>
      </Link>
    </li>

    <li className="sidebar__item">
      <Link to="/hr" className="sidebar__link">
        <i data-feather="users"></i>
        <span>HR</span>
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
        <span>Users</span>
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
  );
}

export default Sidebar;