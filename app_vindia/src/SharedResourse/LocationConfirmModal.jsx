import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCurrentLocation, reverseGeocodeShort, geocodeSearch } from "../utils/geolocation";
import "./LocationConfirmModal.css";

// Leaflet's default marker icon breaks under most bundlers (Vite/webpack
// can't resolve its relative image paths). Pointing at the CDN copies is
// the standard workaround — no extra asset config needed.
const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/* ══════════════════════════════════════════════════════════
   LOCATION CONFIRM MODAL
   Shown before a check-in/check-out is actually saved — mirrors
   PagarBook's "Mark Attendance" flow: auto-detect a starting point,
   show it on a map, let the employee drag the pin or search for their
   real address if it's wrong, then require an explicit Submit before
   anything is sent to the backend.

   Props:
     title      — "Check In" | "Check Out" (shown in the subtitle)
     onCancel   — () => void, closes without saving anything
     onConfirm  — (lat, lng, address) => Promise<void> | void
                  called once the employee hits Submit
══════════════════════════════════════════════════════════ */
const LocationConfirmModal = ({ title, onCancel, onConfirm }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [coords, setCoords] = useState(null); // { lat, lng }
  const [address, setAddress] = useState("");
  const [searchText, setSearchText] = useState("");

  const [locating, setLocating] = useState(true);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const now = new Date();
  const timeLabel = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const dateLabel = now.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });

  // Move the pin/map to a new point and resolve its short address.
  const applyCoords = async (lat, lng, recenter = false) => {
    setCoords({ lat, lng });

    if (recenter && mapRef.current) {
      mapRef.current.setView([lat, lng], mapRef.current.getZoom() || 16);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    }

    setResolvingAddress(true);
    const resolved = await reverseGeocodeShort(lat, lng);
    setResolvingAddress(false);
    setAddress(resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setSearchText("");
  };

  // Grab the browser's best-guess location (GPS / Wi-Fi / IP fallback).
  const locateMe = async () => {
    setLocating(true);
    const loc = await getCurrentLocation();
    setLocating(false);
    if (loc) {
      await applyCoords(loc.lat, loc.lng, true);
    }
  };

  useEffect(() => {
    locateMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize the Leaflet map once we have a first coordinate.
  useEffect(() => {
    if (!coords || mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [coords.lat, coords.lng],
      zoom: 16,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([coords.lat, coords.lng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    marker.on("dragend", async () => {
      const pos = marker.getLatLng();
      await applyCoords(pos.lat, pos.lng, false);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Modals often mount with a zero-size container for one frame —
    // this forces Leaflet to recalculate its dimensions once it's
    // actually visible, or the map renders blank/grey.
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords !== null]);

  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    const result = await geocodeSearch(searchText);
    setSearching(false);

    if (result) {
      await applyCoords(result.lat, result.lng, true);
    } else {
      alert("Couldn't find that location. Try a more specific search.");
    }
  };

  const handleSubmit = async () => {
    if (!coords) return;
    setSubmitting(true);
    try {
      await onConfirm(coords.lat, coords.lng, address);
    } finally {
      setSubmitting(false);
    }
  };

  // Rendered via a portal straight onto document.body — this is
  // deliberate. If ANY ancestor between this component and the page
  // root has a CSS `transform`, `filter`, `perspective`, or
  // `will-change: transform` (common on card-hover / entrance
  // animations, like the Coordinator dashboard's panel-enter
  // animation), that ancestor becomes the positioning context for our
  // `position: fixed` overlay — instead of the actual viewport — and
  // the modal renders squeezed into the page layout instead of
  // centered over everything. Portaling to document.body sidesteps
  // that class of bug entirely, regardless of what CSS the dashboard
  // this button lives on does elsewhere.
  return ReactDOM.createPortal(
    <div className="lcm-overlay" onClick={onCancel}>
      <div className="lcm-modal" onClick={(e) => e.stopPropagation()}>

        <div className="lcm-header">
          <h3 className="lcm-title">Mark Attendance</h3>
          <button className="lcm-close" onClick={onCancel} aria-label="Close">
            ✕
          </button>
        </div>

        <p className="lcm-subtitle">
          {title} at: {timeLabel} | {dateLabel}
        </p>

        <div className="lcm-map-wrap">
          {locating && !coords && (
            <div className="lcm-map-loading">Getting your location…</div>
          )}
          <div ref={mapContainerRef} className="lcm-map" />

          <button
            type="button"
            className="lcm-locate-btn"
            onClick={locateMe}
            title="Use my current location"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="8" />
              <circle cx="12" cy="12" r="2" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </button>
        </div>

        <div className="lcm-address-row">
          <svg className="lcm-address-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0Z" />
            <circle cx="12" cy="10" r="3" />
          </svg>

          <input
            className="lcm-address-input"
            value={resolvingAddress ? "Locating address…" : searchText || address}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for your location"
            disabled={resolvingAddress}
          />

          <button
            type="button"
            className="lcm-search-btn"
            onClick={handleSearch}
            disabled={searching || !searchText.trim()}
            title="Search this address"
          >
            {searching ? (
              "…"
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
          </button>
        </div>

        <div className="lcm-actions">
          <button className="lcm-cancel-btn" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            className="lcm-submit-btn"
            onClick={handleSubmit}
            disabled={!coords || submitting || resolvingAddress}
          >
            {submitting ? "Saving…" : "Submit"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LocationConfirmModal;