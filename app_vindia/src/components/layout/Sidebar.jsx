// src/components/layout/Sidebar.jsx
import React, { useEffect, useRef, useState } from "react";
import feather from "feather-icons";
import { NavLink } from "react-router-dom";
import "../../styles/layout/Sidebar.css";

export default function Sidebar({ menuItems = [], defaultOpen = false }) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const sidebarRef = useRef(null);

  // Replace feather icons after DOM paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        feather.replace();
      } catch (e) {
        // ignore
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [menuItems, open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Close when clicking outside (mobile/overlay)
  useEffect(() => {
    function onClick(e) {
      if (!open) return;
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="app-sidebar"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Backdrop for mobile */}
      {open && <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <nav
        id="app-sidebar"
        ref={sidebarRef}
        className={`sidebar ${open ? "open" : ""}`}
        aria-hidden={false}
      >
        <ul className="sidebar__menu" role="menu" aria-label="Main navigation">
          {menuItems.map((item, index) => (
            <li key={item.path || index} role="none">
              <NavLink
                to={item.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) => (isActive ? "sidebar__link active" : "sidebar__link")}
                aria-label={item.name}
              >
                {/* Icon (feather) */}
                <i data-feather={item.icon || "circle"} aria-hidden="true" />
                {/* Tooltip / label (desktop shows tooltip; mobile shows inline text) */}
                <span aria-hidden="true">{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
