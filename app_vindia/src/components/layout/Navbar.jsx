import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

import NotificationBell from "../../components/notifications/NotificationBell";
import SENotificationBell from "../../components/notifications/SENotificationBell";
import QSNotificationBell from "../../components/notifications/QSNotificationBell";
import MEPNotificationBell from "../notifications/MepNotificationBell";
import BDANotificationBell from "../../components/notifications/BDANotificationBell";
import ArchitectNotificationBell from "../../components/notifications/ArchitectNotificationBell";
import OperationsNotificationBell from "../notifications/OperationsNotificationBell";
import SiteEngineerNotificationBell from "../notifications/SiteEngineerNotificationBell";
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
  logistics_coordinator: [
    { label: "New Delivery",   path: "/operations/logistics/deliveries" },
    { label: "View Incident",  path: "/operations/logistics/incidents" },
  ],
  inventory_controller: [
    { label: "Stock In",       path: "/operations/inventory/stock-in" },
    { label: "Stock Out",      path: "/operations/inventory/stock-out" },
    { label: "View Incident",  path: "/operations/inventory/incidents" },
  ],
};

// Fallback for unknown roles
const DEFAULT_QUICK_ADD = [
  { label: "Submit Expense", path: "/expenses/submit" },
];

/* ── Where each Operations role's notifications should navigate to ── */
const LOGISTICS_ROUTES = {
  default:  "/operations/logistics/dashboard",
  delivery: "/operations/logistics/deliveries",
  delay:    "/operations/logistics/deliveries",
  receipt:  "/operations/logistics/deliveries",
  incident: "/operations/logistics/incidents",
  task:     "/operations/logistics/incidents?page=tasks",
};

const INVENTORY_ROUTES = {
  default:   "/operations/inventory/dashboard",
  delivery:  "/operations/inventory/stock-in",
  low_stock: "/operations/inventory/stock-out",
  receipt:   "/operations/inventory/stock-in",
  incident:  "/operations/inventory/incidents",
  task:      "/operations/inventory/incidents?page=tasks",
};

const FINANCE_ROUTES = {
  default:  "/finance-manager/dashboard",
  incident: "/finance-manager/incidents",
  task:     "/finance-manager/incidents?page=tasks",
};

const PROCUREMENT_ROUTES = {
  default:  "/operations/procurement/dashboard",
  receipt:  "/operations/procurement/purchase-orders",
  delay:    "/operations/procurement/purchase-orders",
  incident: "/operations/procurement/incidents",
  task:     "/operations/procurement/incidents?page=tasks",
};

const ProcurementBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="procurement_officer"
    routes={PROCUREMENT_ROUTES}
  />
);
/* ── Where the Site Engineer's notifications should navigate to ──
   (no rfi / si entries — Site Engineer no longer has those modules) */
const SITE_ENGINEER_ROUTES = {
  default:     "/site-engineer/dashboard",
  incident:    "/site-engineer/incidents",
  task:        "/site-engineer/activity",
  approval:    "/site-engineer/approvals",
  material:    "/site-engineer/materials",
  snag:        "/site-engineer/snag-list",
  work:        "/site-engineer/daily-diary",
  measurement: "/site-engineer/qs-measurements",
};


const LogisticsBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="logistics_coordinator"
    routes={LOGISTICS_ROUTES}
  />
);

const InventoryBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="inventory_controller"
    routes={INVENTORY_ROUTES}
  />
);



const FinanceBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="finance_manager"
    routes={FINANCE_ROUTES}
  />
);

const SiteEngineerBell = ({ userId }) => (
  <SiteEngineerNotificationBell
    userId={userId}
    routes={SITE_ENGINEER_ROUTES}
  />
);


const BdaBell = ({ userId }) => <BDANotificationBell bdaEmail={userId} />;

/* ✅ Role-based notification mapping.
   Defined at module scope on purpose — when this lived inside Navbar()
   every render created brand-new component functions, so React unmounted
   and remounted the bell on each render, wiping its state and re-fetching. */
const NOTIFICATION_COMPONENTS = {
  project_coordinator: NotificationBell,
  structural_engineer: SENotificationBell,
  quantity_surveyor:   QSNotificationBell,
  mep_engineer:        MEPNotificationBell,
  architect:           ArchitectNotificationBell,
  bda:                            BdaBell,
  bda1:                           BdaBell,
  bda2:                           BdaBell,
  BDA:                            BdaBell,
  business_development:           BdaBell,
  business_development_analyst:   BdaBell,
  logistics_coordinator: LogisticsBell,
  inventory_controller:  InventoryBell,
  finance_manager:  FinanceBell,
  
  site_engineer:         SiteEngineerBell,
};

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