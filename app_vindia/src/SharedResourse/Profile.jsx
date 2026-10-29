// src/SharedResourse/Profile.jsx
//
// "Profile" and "Settings" used to both navigate to the exact same /settings
// page — same content, two menu items, no actual difference. That's almost
// certainly why the password-change feature (which lives in Settings) felt
// hidden: a person clicking "Profile" would see an identical page and have
// no reason to think "Settings" held anything different.
//
// This gives Profile its own identity: a quick, read-only look at who you
// are in the system, with a clear link to Settings for anything you can
// actually change (appearance, password). Settings itself is untouched.
import { useAuth } from "../context/useAuth";
import { Link } from "react-router-dom";
import "../styles/portalPages.css";

const cap = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function Profile() {
  const { user } = useAuth();
  const initials = (user?.employee_name || user?.name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="pp-page">
      <div className="pp-head">
        <h1>Profile</h1>
        <p>Your identity in Vindia.</p>
      </div>

      <div className="pp-card">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "var(--primary, #0A4174)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>
              {user?.employee_name || user?.name || "—"}
            </div>
            <div style={{ fontSize: 13, color: "var(--c-text-3, #7D9AB5)" }}>
              {user?.role_name || cap(user?.role)}
            </div>
          </div>
        </div>

        <dl className="pp-info">
          <dt>Email</dt><dd>{user?.employee_email || user?.email || "—"}</dd>
          <dt>Department</dt><dd>{user?.department_name || user?.employee_department || "—"}</dd>
          <dt>Designation</dt><dd>{user?.designation || "—"}</dd>
          <dt>Role</dt><dd>{user?.role_name || cap(user?.role)}</dd>
        </dl>

        <div className="pp-sub" style={{ marginTop: 16 }}>
          Need to change your password or appearance?{" "}
          <Link to="/settings" style={{ fontWeight: 600 }}>Go to Settings →</Link>
        </div>
      </div>
    </div>
  );
}
