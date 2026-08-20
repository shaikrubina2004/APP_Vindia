import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { isCEO } from "../utils/geolocation";
import LocationConfirmModal from "./LocationConfirmModal";
// This file lives at src/SharedResourse/CheckInButton.jsx — one level
// under src/ — so "../utils/geolocation" reaches src/utils/geolocation.js,
// and "./LocationConfirmModal" is a sibling file in the same folder.

const API = "http://localhost:5000/api";

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  return `${hh % 12 || 12}:${m} ${hh >= 12 ? "PM" : "AM"}`;
};

/* ══════════════════════════════════════════════════════════
   SHARED CHECK-IN / CHECK-OUT BUTTON
   Used by every dashboard (BDA, Project Coordinator, HR, etc).

   Location flow now mirrors PagarBook: clicking Check In / Check Out
   opens a confirm modal with a map + editable address (see
   LocationConfirmModal.jsx). The employee can drag the pin or search
   for their real address before hitting Submit — nothing is saved to
   the backend until they confirm. CEOs skip this entirely: no modal,
   no prompt, no location captured at all.

   Props:
     employeeId  — users.id of the logged-in employee (required)
     designation — employee's designation, used only to decide
                   whether to skip location capture for the CEO
══════════════════════════════════════════════════════════ */
const CheckInButton = ({ employeeId, designation }) => {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);
  const [elapsed, setElapsed]       = useState("");
  const [modalAction, setModalAction] = useState(null); // "checkin" | "checkout" | null
  const timerRef = useRef(null);

  const skipLocation = isCEO(designation);

  useEffect(() => {
    fetchTodayAttendance();
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    clearInterval(timerRef.current);
    if (attendance?.check_in && !attendance?.check_out) {
      const tick = () => {
        const [h, m, s] = attendance.check_in.split(":").map(Number);
        const inMs  = (h * 3600 + m * 60 + s) * 1000;
        const nowMs = new Date() - new Date().setHours(0, 0, 0, 0);
        const diff  = Math.max(0, nowMs - inMs);
        const th = String(Math.floor(diff / 3600000)).padStart(2, "0");
        const tm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
        const ts = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
        setElapsed(`${th}:${tm}:${ts}`);
      };
      tick();
      timerRef.current = setInterval(tick, 1000);
    } else {
      setElapsed("");
    }
  }, [attendance]);

  const fetchTodayAttendance = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `${API}/attendance/today?employee_id=${employeeId}`
      );
      setAttendance(res.data || null);
    } catch (err) {
      if (err.response?.status !== 404) console.error(err);
      setAttendance(null);
    } finally {
      setLoading(false);
    }
  };

  // ── Actually saves a check-in, given confirmed (or null) location ──
  const performCheckIn = async (lat, lng, address) => {
    setBusy(true);
    try {
      const now         = new Date();
      const timeStr     = now.toTimeString().slice(0, 8);
      const dateStr     = now.toISOString().slice(0, 10);
      const shiftStart  = new Date();
      shiftStart.setHours(9, 0, 0, 0);
      const lateMinutes = Math.floor(Math.max(0, now - shiftStart) / 60000);

      const res = await axios.post(`${API}/attendance`, {
        employee_id:      employeeId,
        date:             dateStr,
        check_in:         timeStr,
        status:           "Present",
        shift:            "morning",
        late_minutes:     lateMinutes,
        remarks:          lateMinutes > 0 ? `Late by ${lateMinutes} min` : "",
        check_in_lat:     lat,
        check_in_lng:     lng,
        check_in_address: address,
      });
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      alert("Check-in failed. Please try again.");
    } finally {
      setBusy(false);
      setModalAction(null);
    }
  };

  // ── Actually saves a check-out, given confirmed (or null) location ──
  const performCheckOut = async (lat, lng, address) => {
    if (!attendance?.id) return;
    setBusy(true);
    try {
      const timeStr = new Date().toTimeString().slice(0, 8);

      const res = await axios.put(`${API}/attendance/${attendance.id}`, {
        check_out:         timeStr,
        check_out_lat:     lat,
        check_out_lng:     lng,
        check_out_address: address,
      });
      setAttendance(res.data);
      clearInterval(timerRef.current);
    } catch (err) {
      console.error(err);
      alert("Check-out failed. Please try again.");
    } finally {
      setBusy(false);
      setModalAction(null);
    }
  };

  // ── Button click handlers — CEO skips the modal entirely ──
  const triggerCheckIn = () => {
    if (skipLocation) {
      performCheckIn(null, null, null);
    } else {
      setModalAction("checkin");
    }
  };

  const triggerCheckOut = () => {
    if (skipLocation) {
      performCheckOut(null, null, null);
    } else {
      setModalAction("checkout");
    }
  };

  const isCheckedIn  = attendance?.check_in && !attendance?.check_out;
  const isCheckedOut = attendance?.check_in && attendance?.check_out;

  let buttonContent;

  if (loading) {
    buttonContent = (
      <button disabled style={{
        padding: "8px 18px", borderRadius: 10, border: "1.5px solid #e2e8f0",
        background: "#f8fafc", color: "#94a3b8", fontSize: 13, fontWeight: 600,
        cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1", display: "inline-block" }} />
        Loading…
      </button>
    );
  } else if (isCheckedOut) {
    buttonContent = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button disabled style={{
          padding: "8px 18px", borderRadius: 10, border: "1.5px solid #86efac",
          background: "#f0fdf4", color: "#16a34a", fontSize: 13, fontWeight: 700,
          cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
          ✓ Done for Today
        </button>
        <span style={{ fontSize: 10, color: "#64748b" }}>
          {fmtTime(attendance.check_in)} – {fmtTime(attendance.check_out)}
        </span>
      </div>
    );
  } else if (isCheckedIn) {
    buttonContent = (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
        <button
          onClick={triggerCheckOut}
          disabled={busy}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none",
            background: busy ? "#fca5a5" : "#dc2626",
            color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: busy ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all .2s",
            boxShadow: "0 2px 8px rgba(220,38,38,0.3)",
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: "#fff",
            display: "inline-block",
            animation: "bda-pulse 1.2s ease-in-out infinite",
          }} />
          {busy ? "Saving…" : "Check Out"}
        </button>
        <span style={{ fontSize: 10, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
          In: {fmtTime(attendance.check_in)}
          {elapsed && <> &nbsp;·&nbsp; <strong style={{ color: "#2563eb" }}>{elapsed}</strong></>}
        </span>
      </div>
    );
  } else {
    buttonContent = (
      <button
        onClick={triggerCheckIn}
        disabled={busy}
        style={{
          padding: "8px 18px", borderRadius: 10, border: "none",
          background: busy ? "#86efac" : "#16a34a",
          color: "#fff", fontSize: 13, fontWeight: 700,
          cursor: busy ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", gap: 6,
          transition: "all .2s",
          boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
        {busy ? "Saving…" : "Check In"}
      </button>
    );
  }

  return (
    <>
      {buttonContent}

      {modalAction && (
        <LocationConfirmModal
          title={modalAction === "checkin" ? "Check In" : "Check Out"}
          onCancel={() => setModalAction(null)}
          onConfirm={(lat, lng, address) =>
            modalAction === "checkin"
              ? performCheckIn(lat, lng, address)
              : performCheckOut(lat, lng, address)
          }
        />
      )}
    </>
  );
};

export default CheckInButton;