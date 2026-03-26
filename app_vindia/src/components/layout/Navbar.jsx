import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../context/useAuth";

import "../../styles/layout/Navbar.css";

import logo from "../../assets/logo.png.png";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleLogout = () => {
    setIsProfileOpen(false);
    logout();
    navigate("/");
  };

  return (
    <nav className="navbar">
      {/* Left Section - Logo */}
      <div className="navbar-left">
        <div className="logo-wrapper" onClick={() => navigate("/")}>
          <img src={logo} alt="Vindia Logo" className="logo-image" />
        </div>
      </div>

      {/* Center Section - Search */}
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

    

      {/* Right Section - User Menu */}
      <div className="navbar-right">
        {/* Quick Add Button */}
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
            <button
              className="quick-add-item"
              onClick={() => navigate("/hr/add-employee")}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Add Employee
            </button>
            <button className="quick-add-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              Create Project
            </button>
            <button className="quick-add-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Add Lead
            </button>
            <button className="quick-add-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                <polyline points="13 2 13 9 20 9"></polyline>
              </svg>
              Submit Expense
            </button>
          </div>
        </div>

        {/* Notification Icon */}
        <button className="navbar-icon-btn">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="notification-dot"></span>
        </button>

        {/* Profile Dropdown */}
        <div
          className="profile-dropdown-wrapper"
          onMouseEnter={() => setIsProfileOpen(true)}
          onMouseLeave={() => setIsProfileOpen(false)}
        >
          <button className="profile-btn" title="Profile Menu">
            <div className="avatar">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
          </button>

          {/* Dropdown Menu */}
          <div className={`dropdown-menu ${isProfileOpen ? "show" : ""}`}>
            <div className="dropdown-header">
              <div className="dropdown-avatar">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <p className="dropdown-name">{user?.name || "User"}</p>
                <p className="dropdown-email">{user?.email || "No email"}</p>
              </div>
            </div>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              Profile
            </button>
            <button className="dropdown-item">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="1"></circle>
                <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m2.12 2.12l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m2.12-2.12l4.24-4.24M19.78 19.78l-4.24-4.24m-2.12-2.12l-4.24-4.24"></path>
              </svg>
              Settings
            </button>
            <button className="dropdown-item">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"></path>
                <path d="M12 1v6m0 6v6"></path>
              </svg>
              Change Password
            </button>
            <div className="dropdown-divider"></div>
            <button className="dropdown-item logout" onClick={handleLogout}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
