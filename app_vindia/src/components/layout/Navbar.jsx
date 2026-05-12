import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

import NotificationBell from "../../components/notifications/NotificationBell";
import SENotificationBell from "../../components/notifications/SENotificationBell";
import QSNotificationBell from "../../components/notifications/QSNotificationBell";
import MEPNotificationBell from "../notifications/MepNotificationBell";
import BDANotificationBell from "../../components/notifications/BDANotificationBell";
import ArchitectNotificationBell from "../../components/notifications/ArchitectNotificationBell";
import "../../styles/layout/Navbar.css";
import logo from "../../assets/logo.png.png";

// ✅ Role-based quick-add menu items
const QUICK_ADD_ITEMS = {
  project_coordinator: [
    { label: "Add Milestone",    path: "/project-coordinator/milestone" },
    { label: "View Incident",  path: "/project-coordinator/incidents" },
    { label: "View Task",  path: "/project-coordinator/incidents?page=tasks" },
  ],
  structural_engineer: [
    { label: "Create Project",  path: "/projects/create" },
    { label: "Submit Expense",  path: "/expenses/submit" },
  ],
  quantity_surveyor: [
    { label: "Create Project",  path: "/projects/create" },
    { label: "Submit Expense",  path: "/expenses/submit" },
  ],
  mep_engineer: [
    { label: "Create Project",  path: "/projects/create" },
    { label: "Submit Expense",  path: "/expenses/submit" },
  ],
  architect: [
    { label: "Create Project",  path: "/projects/create" },
    { label: "Submit Expense",  path: "/expenses/submit" },
  ],
  // All BDA variants get only Add Lead + Add Follow-up
  bda:                           [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
  bda1:                          [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
  bda2:                          [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
  BDA:                           [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
  business_development:          [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
  business_development_analyst:  [
    { label: "Add Lead",        path: "/bda/add-lead" },
    { label: "Add Follow-up",   path: "/bda/follow-up" },
  ],
};

// Fallback for unknown roles
const DEFAULT_QUICK_ADD = [
  { label: "Submit Expense", path: "/expenses/submit" },
];

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    console.log("======= USER OBJECT =======");
    console.log(user);
    console.log("role:", user?.role);
    console.log("===========================");
  }, [user]);

  const [isSearchActive, setIsSearchActive]   = useState(false);
  const [isProfileOpen, setIsProfileOpen]     = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen]   = useState(false);

  // ✅ Role-based notification mapping
  const NOTIFICATION_COMPONENTS = {
    project_coordinator: NotificationBell,
    structural_engineer: SENotificationBell,
    quantity_surveyor:   QSNotificationBell,
    mep_engineer:        MEPNotificationBell,
    architect:           ArchitectNotificationBell,
    bda:                           ({ userId }) => <BDANotificationBell bdaEmail={userId} />,
    bda1:                          ({ userId }) => <BDANotificationBell bdaEmail={userId} />,
    bda2:                          ({ userId }) => <BDANotificationBell bdaEmail={userId} />,
    BDA:                           ({ userId }) => <BDANotificationBell bdaEmail={userId} />,
    "business_development":        ({ userId }) => <BDANotificationBell bdaEmail={userId} />,
    "business_development_analyst":({ userId }) => <BDANotificationBell bdaEmail={userId} />,
  };

  const RoleNotification = NOTIFICATION_COMPONENTS[user?.role];

  // ✅ Get quick-add items for current role
  const quickAddItems = QUICK_ADD_ITEMS[user?.role] || DEFAULT_QUICK_ADD;

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <div className="logo-wrapper" onClick={() => navigate("/")}>
          <img src={logo} alt="Vindia Logo" className="logo-image" />
        </div>
      </div>

      <div className={`navbar-center ${isSearchActive ? "active" : ""}`}>
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search modules, employees..."
            className="search-bar"
            onFocus={() => setIsSearchActive(true)}
            onBlur={() => setIsSearchActive(false)}
          />
          <div className="search-glow"></div>
        </div>
      </div>

      <div className="navbar-right">
        <button className="navbar-icon-btn timesheet-btn" onClick={() => navigate("/timesheet")} title="Timesheet">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Timesheet</span>
        </button>

        {/* ✅ Role-based Quick Add */}
        <div
          className="quick-add-wrapper"
          onMouseEnter={() => setIsQuickAddOpen(true)}
          onMouseLeave={() => setIsQuickAddOpen(false)}
        >
          <button className="quick-add-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add
          </button>
          <div className={`quick-add-menu ${isQuickAddOpen ? "show" : ""}`}>
            {quickAddItems.map((item) => (
              <button
                key={item.label}
                className="quick-add-item"
                onClick={() => {
                  setIsQuickAddOpen(false);
                  navigate(item.path);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 🔥 Role-Based Notifications */}
        {RoleNotification && (
          ["bda", "bda1", "bda2", "BDA", "business_development", "business_development_analyst"].includes(user?.role)
            ? <RoleNotification userId={user.email} />
            : <RoleNotification userId={user.id} />
        )}

        <div
          className="profile-dropdown-wrapper"
          onMouseEnter={() => setIsProfileOpen(true)}
          onMouseLeave={() => setIsProfileOpen(false)}
        >
          <button className="profile-btn">
            <div className="avatar">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </button>
          <div className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
            <div className="dropdown-header">
              <p>{user?.name}</p>
              <small>{user?.email}</small>
            </div>
            <button className="dropdown-item">Profile</button>
            <button className="dropdown-item">Settings</button>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;