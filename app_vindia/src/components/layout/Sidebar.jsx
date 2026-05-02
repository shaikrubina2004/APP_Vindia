import React, { useEffect, useRef, useState } from "react";
import feather from "feather-icons";
import { NavLink } from "react-router-dom";
import "../../styles/layout/Sidebar.css";

export default function Sidebar({ menuItems = [], defaultOpen = false }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const sidebarRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        feather.replace();
      } catch (e) {}
    });
    return () => cancelAnimationFrame(raf);
  }, [menuItems, open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (!open) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setOpen(false); // ✅ FIXED
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <>
      <button
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="app-sidebar"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <div
          className="sidebar-backdrop"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        id="app-sidebar"
        ref={sidebarRef}
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={false}
      >
        <ul className="sidebar__menu" role="menu" aria-label="Main navigation">
          {menuItems.map((item, index) => ( // ✅ FIXED
            <li key={item.path || index} role="none">
              <NavLink
                to={item.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  isActive ? "sidebar__link active" : "sidebar__link"
                }
                aria-label={item.name} // ✅ FIXED
              >
                <i data-feather={item.icon || "circle"} aria-hidden="true" />
                <span aria-hidden="true">{item.name}</span> {/* ✅ FIXED */}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}