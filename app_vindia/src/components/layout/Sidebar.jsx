import { useEffect, useState } from "react";
import feather from "feather-icons";
import { NavLink } from "react-router-dom";
import "../../styles/layout/Sidebar.css";

function Sidebar({ menuItems }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    feather.replace();
  }, []);

  return (
    <>
      {/* ================= TOGGLE BUTTON ================= */}
      <button className="sidebar-toggle" onClick={() => setOpen(!open)}>
        ☰
      </button>

      {/* ================= OVERLAY ================= */}
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)}></div>
      )}

      {/* ================= SIDEBAR ================= */}
      <nav className={`sidebar ${open ? "open" : ""}`}>
        <ul className="sidebar__menu">
          {menuItems?.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.path}
                onClick={() => setOpen(false)} // ✅ closes on click
                className={({ isActive }) =>
                  isActive ? "sidebar__link active" : "sidebar__link"
                }
              >
                <i data-feather={item.icon}></i>
                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export default Sidebar;
