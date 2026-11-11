import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API } from "../../services/authService";

const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const fmtClock = (t) => {
  if (!t) return "—";
  const [h, m] = String(t).split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

const fmtTime = (iso) => {
  if (!iso) return "—";
  // Postgres often returns timestamps without a timezone marker, which
  // JS then misreads as local time instead of UTC. Appending "Z" forces
  // correct UTC parsing so it converts properly to the viewer's local time.
  const withZ = iso.endsWith("Z") ? iso : `${iso}Z`;
  return new Date(withZ).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

/* ══════════════════════════════════════════════════════════
   TRACK PATH MODAL
   Read-only. Shows the trail of periodic location pings recorded
   between check-in and check-out for a single attendance record.
   CEO-only — the backend withholds raw points for anyone else, so
   this modal only makes sense to open from a CEO-viewer session.

   Props:
     attendanceId — attendance.id to fetch the track for
     employeeName — shown in the header
     onClose      — () => void
══════════════════════════════════════════════════════════ */
const TrackPathModal = ({ attendanceId, employeeName, onClose }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [track, setTrack] = useState(null); // { count, points, first_recorded_at, last_recorded_at }

  useEffect(() => {
    let cancelled = false;

    API.get(`/attendance/${attendanceId}/track`, {
      params: { viewer_designation: "ceo" },
    })
      .then((res) => {
        if (!cancelled) setTrack(res.data);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Failed to load location history.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attendanceId]);

  useEffect(() => {
    if (!track || !track.points?.length || mapRef.current || !mapContainerRef.current) return;

    const latlngs = track.points
      .map((p) => [Number(p.lat), Number(p.lng)])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    if (!latlngs.length) return;

    const map = L.map(mapContainerRef.current, { attributionControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const line = L.polyline(latlngs, { color: "#2563eb", weight: 3 }).addTo(map);

    // Small dots for the in-between pings
    track.points.forEach((p) => {
      if (p.type === "ping") {
        L.circleMarker([Number(p.lat), Number(p.lng)], {
          radius: 4, color: "#2563eb", fillColor: "#fff", fillOpacity: 1, weight: 2,
        }).addTo(map);
      }
    });

    const hasOut = track.points[track.points.length - 1]?.type === "checkout";
    L.marker(latlngs[0], { icon: pinIcon }).addTo(map).bindPopup("Check-in");
    if (latlngs.length > 1) {
      L.marker(latlngs[latlngs.length - 1], { icon: pinIcon })
        .addTo(map)
        .bindPopup(hasOut ? "Check-out" : "Latest location");
    }

    if (latlngs.length > 1) {
      map.fitBounds(line.getBounds(), { padding: [30, 30], maxZoom: 17 });
    } else {
      // A single point has no bounds to fit — just centre on it.
      map.setView(latlngs[0], 16);
    }
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [track]);

  // Same document.body portal pattern as LocationConfirmModal — avoids
  // being squeezed into layout by an ancestor's transform/filter CSS.
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 14, width: 560, maxWidth: "92vw",
          padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>{employeeName}'s Movement</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ border: "none", background: "transparent", fontSize: 16, cursor: "pointer", color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {loading && <p style={{ color: "#64748b", fontSize: 13 }}>Loading location history…</p>}
        {error && <p style={{ color: "#dc2626", fontSize: 13 }}>{error}</p>}

        {!loading && !error && track && track.count === 0 && (
          <p style={{ color: "#64748b", fontSize: 13 }}>
            No location was recorded for this attendance — location permission may have been
            denied, or this record was created before path tracking was enabled.
          </p>
        )}

        {!loading && !error && track && track.count > 0 && (
          <>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, marginBottom: 10 }}>
              {track.count} point{track.count !== 1 ? "s" : ""} ·{" "}
              Check-in {fmtClock(track.check_in)} – Check-out {fmtClock(track.check_out)}
              {track.ping_count > 0 && <> · {track.ping_count} live ping{track.ping_count !== 1 ? "s" : ""}</>}
            </p>
            <div
              ref={mapContainerRef}
              style={{ width: "100%", height: 320, borderRadius: 10, overflow: "hidden", background: "#f1f5f9" }}
            />
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default TrackPathModal;