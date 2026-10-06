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
import CEONotificationBell from "../notifications/CEONotificationBell";
import SiteEngineerNotificationBell from "../notifications/SiteEngineerNotificationBell";
import ClientNotificationBell from "../notifications/ClientNotificationBell";
import ThreeDVisualizerNotificationBell from "../notifications/ThreeDVisualizerNotificationBell";
import DigitalMarketingNotificationBell from "../notifications/DigitalMarketingNotificationBell";
import "../../styles/layout/Navbar.css";
import logo from "../../assets/logo.png.png";

// ✅ Role-based quick-add menu items
const QUICK_ADD_ITEMS = {
  client: [
    { label: "Raise RFI", path: "/client/rfi" },
    { label: "Raise Incident", path: "/client/incidents" },
  ],
  ceo: [
    { label: "Reports", path: "/reports" },
    { label: "Analytics", path: "/analytics" },
  ],
  project_manager: [
    { label: "Daily Update", path: "/pm/daily-updates" },
    { label: "Incident", path: "/pm/incidents" },
    { label: "Project Approval", path: "/pm/project-approvals" },
  ],
  project_coordinator: [
    { label: "Add Milestone", path: "/project-coordinator/milestone" },
    { label: "View Incident", path: "/project-coordinator/incidents" },
    { label: "View Task", path: "/project-coordinator/incidents?page=tasks" },
  ],
  site_engineer: [
    { label: "Daily Diary", path: "/site-engineer/daily-diary" },
    { label: "Site Measurement", path: "/site-engineer/qs-measurements" },
    { label: "Incident", path: "/site-engineer/incidents" },
  ],
  quantity_surveyor: [
    { label: "Measurement", path: "/quantity-surveyor/measurement" },
    { label: "Quantity Report", path: "/quantity-surveyor/quantity-report" },
    { label: "RFI", path: "/quantity-surveyor/rfi" },
    { label: "Incident", path: "/quantity-surveyor/incident" },
  ],
  structural_engineer: [
    { label: "Daily Update", path: "/structural-engineer/daily-updates" },
    { label: "RFI", path: "/structural-engineer/rfi" },
    { label: "Incident", path: "/structural-engineer/incidents" },
  ],
  mep_engineer: [
    { label: "Daily Log", path: "/mep/daily-log" },
    { label: "RFI", path: "/mep/rfi" },
    { label: "Incident", path: "/mep/incidents" },
  ],
  architect: [
    { label: "Projects", path: "/architect/projects" },
    { label: "RFI", path: "/architect/rfi" },
    { label: "Incident", path: "/architect/incidents" },
  ],
  bda: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  bda1: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  bda2: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  BDA: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  business_development: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  business_development_analyst: [
    { label: "Add Lead", path: "/bda/add-lead" },
    { label: "Add Follow-up", path: "/bda/follow-up" },
  ],
  logistics_coordinator: [
    { label: "New Delivery", path: "/operations/logistics/deliveries" },
    { label: "Daily Update", path: "/operations/logistics/daily-update" },
    { label: "Incident", path: "/operations/logistics/incidents" },
  ],
  inventory_controller: [
    { label: "Stock In", path: "/operations/inventory/stock-in" },
    { label: "Stock Out", path: "/operations/inventory/stock-out" },
    { label: "Daily Update", path: "/operations/inventory/daily-update" },
    { label: "Incident", path: "/operations/inventory/incidents" },
  ],
  procurement_officer: [
    { label: "Purchase Requests", path: "/operations/procurement/purchase-requests" },
    { label: "Purchase Orders", path: "/operations/procurement/purchase-orders" },
    { label: "Daily Report", path: "/operations/procurement/daily-report" },
  ],
  operations_manager: [
    { label: "Material Requests", path: "/operations/manager/material-requests" },
    { label: "Approvals", path: "/operations/manager/approvals" },
    { label: "Purchase Orders", path: "/operations/procurement/purchase-orders" },
    { label: "Daily Updates", path: "/operations/manager/daily-updates" },
  ],
  office_administrator: [
    { label: "Office Request", path: "/operations/administrator/requests" },
    { label: "Visitor", path: "/operations/administrator/visitors" },
    { label: "Asset", path: "/operations/administrator/assets" },
    { label: "Daily Update", path: "/operations/administrator/daily-update" },
  ],
  accountant: [
    { label: "Invoice", path: "/accountant/invoices" },
    { label: "Expense", path: "/accountant/expenses" },
    { label: "Payment", path: "/accountant/payments" },
    { label: "Journal Entry", path: "/accountant/journal-entries" },
  ],
  finance_manager: [
    { label: "Invoice", path: "/finance-manager/invoices" },
    { label: "Expense", path: "/finance-manager/expenses" },
    { label: "Payment", path: "/finance-manager/payments" },
    { label: "Daily Update", path: "/finance-manager/daily-update" },
  ],
  hr_manager: [
    { label: "Add Employee", path: "/hr/add-employee" },
    { label: "New Job Opening", path: "/hr/recruitment/job-openings" },
    { label: "View Incident", path: "/hr/incidents" },
  ],
};

// Fallback for unknown roles
const DEFAULT_QUICK_ADD = [
  { label: "Submit Expense", path: "/expenses/submit" },
];

/* ── Where each Operations role's notifications should navigate to ── */
const LOGISTICS_ROUTES = {
  default: "/operations/logistics/dashboard",
  delivery: "/operations/logistics/deliveries",
  daily_update: "/operations/logistics/daily-update",
  delay: "/operations/logistics/deliveries",
  receipt: "/operations/logistics/deliveries",
  incident: "/operations/logistics/incidents",
  task: "/operations/logistics/incidents?page=tasks",
};
const HR_ROUTES = {
  default: "/hr",
  incident: "/hr/incidents",
  task: "/hr/incidents?page=tasks",
};

const HRBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="hr_manager"
    routes={HR_ROUTES}
  />
);

const INVENTORY_ROUTES = {
  default: "/operations/inventory/dashboard",
  delivery: "/operations/inventory/stock-in",
  daily_update: "/operations/inventory/daily-update",
  low_stock: "/operations/inventory/stock-out",
  receipt: "/operations/inventory/stock-in",
  incident: "/operations/inventory/incidents",
  task: "/operations/inventory/incidents?page=tasks",
};

const FINANCE_ROUTES = {
  default: "/finance-manager/dashboard",
  incident: "/finance-manager/incidents",
  task: "/finance-manager/incidents?page=tasks",
};

const PROCUREMENT_ROUTES = {
  default: "/operations/procurement/dashboard",
  receipt: "/operations/procurement/purchase-orders",
  delay: "/operations/procurement/purchase-orders",
  incident: "/operations/procurement/incidents",
  task: "/operations/procurement/incidents?page=tasks",
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
  default: "/site-engineer/dashboard",
  incident: "/site-engineer/incidents",
  task: "/site-engineer/activity",
  approval: "/site-engineer/approvals",
  material: "/site-engineer/materials",
  snag: "/site-engineer/snag-list",
  work: "/site-engineer/daily-diary",
  measurement: "/site-engineer/qs-measurements",
};

const OPERATIONS_MANAGER_ROUTES = {
  default: "/operations/manager/dashboard",
  daily_update: "/operations/manager/daily-updates",
  approval: "/operations/manager/approvals",
  delay: "/operations/manager/logistics",
  receipt: "/operations/manager/inventory",
  low_stock: "/operations/manager/inventory",
  incident: "/operations/manager/incidents",
  task: "/operations/manager/incidents?page=tasks",
};

const OFFICE_ADMIN_ROUTES = {
  default: "/operations/administrator/dashboard",
  request: "/operations/administrator/requests",
  daily_update: "/operations/administrator/daily-update",
  incident: "/operations/administrator/incidents",
  task: "/operations/administrator/incidents?page=tasks",
};

const OperationsManagerBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="operations_manager"
    routes={OPERATIONS_MANAGER_ROUTES}
  />
);

const OfficeAdministratorBell = ({ userId }) => (
  <OperationsNotificationBell
    userId={userId}
    role="office_administrator"
    routes={OFFICE_ADMIN_ROUTES}
  />
);

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
  <SiteEngineerNotificationBell userId={userId} routes={SITE_ENGINEER_ROUTES} />
);

const BdaBell = ({ userId }) => <BDANotificationBell bdaEmail={userId} />;

/* ✅ Role-based notification mapping.
   Defined at module scope on purpose — when this lived inside Navbar()
   every render created brand-new component functions, so React unmounted
   and remounted the bell on each render, wiping its state and re-fetching. */
const NOTIFICATION_COMPONENTS = {
  project_coordinator: NotificationBell,
  structural_engineer: SENotificationBell,
  quantity_surveyor: QSNotificationBell,
  mep_engineer: MEPNotificationBell,
  architect: ArchitectNotificationBell,
  bda: BdaBell,
  bda1: BdaBell,
  bda2: BdaBell,
  BDA: BdaBell,
  business_development: BdaBell,
  business_development_analyst: BdaBell,
  logistics_coordinator: LogisticsBell,
  operations_manager: OperationsManagerBell,
  office_administrator: OfficeAdministratorBell,
  inventory_controller: InventoryBell,
  finance_manager: FinanceBell,
  ceo: CEONotificationBell,
  procurement_officer: ProcurementBell,
  site_engineer: SiteEngineerBell,
  "3d_visualizer": ThreeDVisualizerNotificationBell,
  digital_marketing: DigitalMarketingNotificationBell,
  hr_manager: HRBell,
  client: ClientNotificationBell,
};

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

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
          <svg
            className="search-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
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
        {user?.role !== "client" && (
        <button
          className="navbar-icon-btn timesheet-btn"
          onClick={() => navigate("/timesheet")}
          title="Timesheet"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Timesheet</span>
        </button>
        )}

        {/* ✅ Role-based Quick Add */}
        <div
          className="quick-add-wrapper"
          onMouseEnter={() => setIsQuickAddOpen(true)}
          onMouseLeave={() => setIsQuickAddOpen(false)}
        >
          <button className="quick-add-btn">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
        {RoleNotification &&
          ([
            "bda",
            "bda1",
            "bda2",
            "BDA",
            "business_development",
            "business_development_analyst",
          ].includes(user?.role) ? (
            <RoleNotification userId={user.email} />
          ) : (
            <RoleNotification userId={user.id} />
          ))}

        <div
          className="profile-dropdown-wrapper"
          onMouseEnter={() => setIsProfileOpen(true)}
          onMouseLeave={() => setIsProfileOpen(false)}
        >
          <button
            className="profile-btn"
            aria-label="Open profile menu"
            onClick={() => setIsProfileOpen((open) => !open)}
          >
            <div className="avatar">
              {user?.profile_photo ? (
                <img
                  src={`${(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, "")}/uploads/${user.profile_photo}`}
                  alt=""
                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                />
              ) : (
                <span>{(user?.name || "?").split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}</span>
              )}
            </div>
          </button>
          <div className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
            <div className="dropdown-header">
              <div className="dropdown-avatar">
                {user?.profile_photo ? (
                  <img
                    src={`${(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, "")}/uploads/${user.profile_photo}`}
                    alt=""
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <span>{(user?.name || "?").split(" ").map((part) => part[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}</span>
                )}
              </div>
              <div className="dropdown-user-copy">
                <p className="dropdown-name">{user?.name || "Employee"}</p>
                <small className="dropdown-role">{user?.role_name || user?.role || "Employee"}</small>
                {user?.department_name || user?.employee_department ? (
                  <small className="dropdown-department">{user?.department_name || user?.employee_department}</small>
                ) : null}
                <small className="dropdown-email">{user?.email || user?.employee_email}</small>
              </div>
            </div>
            <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); navigate("/settings"); }}>Profile</button>
            <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); navigate("/timesheet"); }}>My Timesheet</button>
            <button className="dropdown-item" onClick={() => { setIsProfileOpen(false); navigate("/settings"); }}>Settings</button>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
