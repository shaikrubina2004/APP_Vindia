import React, { useEffect, useRef, useState } from "react";
import feather from "feather-icons";
import { NavLink } from "react-router-dom";
import "../../styles/layout/Sidebar.css";

export default function Sidebar({
  menuItems = [],
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const sidebarRef = useRef(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        if (sidebarRef.current) {
          feather.replace({
            root: sidebarRef.current,
          });
        }
      } catch (error) {
        console.error("Failed to load sidebar icons:", error);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [menuItems, open]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    function onDocumentClick(event) {
      if (!open) return;

      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onDocumentClick);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="sidebar-toggle"
        aria-expanded={open}
        aria-controls="app-sidebar"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((current) => !current)}
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
        aria-label="Main navigation"
      >
        <ul className="sidebar__menu" role="menu">
          {menuItems.map((item, index) => (
            <li key={item.path || index} role="none">
              <NavLink
                to={item.path}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? "sidebar__link active"
                    : "sidebar__link"
                }
                aria-label={item.name}
              >
                <i
                  data-feather={item.icon || "circle"}
                  aria-hidden="true"
                />

                <span>{item.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}