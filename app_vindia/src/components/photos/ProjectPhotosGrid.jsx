// src/components/photos/ProjectPhotosGrid.jsx
//
// Read-only grid of a project's Photo Gallery uploads. GET /api/photos has
// no role restriction — any logged-in user can already fetch project
// photos — but before this, only the Site Engineer (who uploads) and the
// Client (via a separate endpoint) had any page that actually called it.
// Project Manager/CEO got their own tab built directly into
// ProjectManagement.jsx; this component is the same grid, extracted so any
// other role (Architect, Structural Engineer, MEP, QS, ...) can drop it
// into their own dashboard the same way.
//
// Usage: <ProjectPhotosGrid projectId={selectedProject?.id} />
import React, { useEffect, useState } from "react";

const BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/+$/, "");

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function ProjectPhotosGrid({ projectId, limit = 60 }) {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!projectId) { setPhotos([]); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${BASE}/api/photos?project_id=${projectId}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with status code ${res.status}`);
        return res.json();
      })
      .then((body) => { if (alive) setPhotos(Array.isArray(body) ? body : []); })
      .catch((err) => { if (alive) { setError(err.message); setPhotos([]); } })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [projectId, limit]);

  if (!projectId) return <p style={{ color: "#94a3b8" }}>Select a project to see its site photos.</p>;
  if (loading) return <p style={{ color: "#94a3b8" }}>Loading photos…</p>;
  if (error) return <p style={{ color: "#dc2626" }}>Couldn't load photos: {error}</p>;
  if (!photos.length) return <p style={{ color: "#94a3b8" }}>No photos uploaded for this project yet.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {photos.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            overflow: "hidden",
            background: "#fff",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ aspectRatio: "4/3", background: "#f1f5f9" }}>
            {p.url && (
              <img
                src={p.url}
                alt={p.activity || p.zone || "Site photo"}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            )}
          </div>
          <div style={{ padding: "8px 10px" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
              {p.activity || p.phase || p.zone || "Site photo"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              {p.submitted_by_name || "Site Engineer"} · {fmtDate(p.date || p.created_at)}
            </div>
            {p.visibility && p.visibility !== "internal" && (
              <span
                style={{
                  display: "inline-block",
                  marginTop: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 5,
                  background: "#ecfdf5",
                  color: "#047857",
                }}
              >
                Visible to client
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}
