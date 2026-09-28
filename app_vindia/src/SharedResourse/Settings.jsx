import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import API from "../services/authService";
import { getTheme, setTheme } from "../utils/theme";
import "../styles/portalPages.css";

const cap = (s) => String(s || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function Appearance() {
  const [theme, setT] = useState(getTheme());
  const choose = (t) => { setTheme(t); setT(t); };
  return (
    <div className="pp-card">
      <h3>Appearance</h3>
      <div className="pp-sub">Choose light or dark mode. Saved on this device.</div>
      <div className="pp-seg">
        <button className={theme === "light" ? "active" : ""} onClick={() => choose("light")}>☀ Light</button>
        <button className={theme === "dark" ? "active" : ""} onClick={() => choose("dark")}>🌙 Dark</button>
      </div>
    </div>
  );
}

function Account({ user }) {
  return (
    <div className="pp-card">
      <h3>Account</h3>
      <div className="pp-sub">Your details. Contact the CEO to change your name, email or role.</div>
      <dl className="pp-info">
        <dt>Name</dt><dd>{user?.name || "—"}</dd>
        <dt>Email</dt><dd>{user?.email || "—"}</dd>
        <dt>Role</dt><dd>{cap(user?.role)}</dd>
      </dl>
    </div>
  );
}

function Password() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async () => {
    setMsg(null);
    if (!f.current || !f.next) return setMsg({ t: "err", m: "Fill in all fields." });
    if (f.next.length < 8) return setMsg({ t: "err", m: "New password must be at least 8 characters." });
    if (f.next !== f.confirm) return setMsg({ t: "err", m: "New passwords don't match." });
    setBusy(true);
    try {
      await API.post("/settings/change-password", { current_password: f.current, new_password: f.next });
      setF({ current: "", next: "", confirm: "" });
      setMsg({ t: "ok", m: "Password updated." });
    } catch (e) {
      setMsg({ t: "err", m: e.response?.data?.message || "Could not update password." });
    } finally { setBusy(false); }
  };

  return (
    <div className="pp-card">
      <h3>Change password</h3>
      <div className="pp-sub">Use at least 8 characters.</div>
      <div style={{ maxWidth: 380 }}>
        <div className="pp-field"><label>Current password</label>
          <input type="password" autoComplete="current-password" value={f.current} onChange={set("current")} /></div>
        <div className="pp-field"><label>New password</label>
          <input type="password" autoComplete="new-password" value={f.next} onChange={set("next")} /></div>
        <div className="pp-field"><label>Confirm new password</label>
          <input type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></div>
        <button className="pp-btn" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
        {msg && <div className={`pp-msg ${msg.t}`}>{msg.m}</div>}
      </div>
    </div>
  );
}

function SystemSettings() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    API.get("/settings/system").then((r) => setS(r.data))
      .catch(() => setMsg({ t: "err", m: "Could not load system settings." }));
  }, []);

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      await API.put("/settings/system", s);
      setMsg({ t: "ok", m: "Saved. Takes effect on the next daily run." });
    } catch (e) {
      setMsg({ t: "err", m: e.response?.data?.message || "Could not save." });
    } finally { setBusy(false); }
  };

  return (
    <div className="pp-card">
      <h3>Lead follow-up escalation</h3>
      <div className="pp-sub">
        When a BDA misses a follow-up, the lead is automatically reassigned to the BDA with the lightest workload.
      </div>
      {!s ? (msg ? <div className={`pp-msg ${msg.t}`}>{msg.m}</div> : <div className="pp-empty">Loading…</div>) : (
        <div style={{ maxWidth: 380 }}>
          <label className="pp-toggle">
            <input type="checkbox" checked={s.escalation_enabled}
              onChange={(e) => setS({ ...s, escalation_enabled: e.target.checked })} />
            Automatically reassign overdue leads
          </label>
          <div className="pp-field"><label>Days overdue before reassigning</label>
            <input type="number" min="0" max="30" value={s.escalation_grace_days}
              onChange={(e) => setS({ ...s, escalation_grace_days: e.target.value })} /></div>
          <button className="pp-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          {msg && <div className={`pp-msg ${msg.t}`}>{msg.m}</div>}
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  return (
    <div className="pp-page">
      <div className="pp-head"><h1>Settings</h1><p>Manage your account and preferences.</p></div>
      <Appearance />
      <Account user={user} />
      <Password />
      {user?.role === "ceo" && <SystemSettings />}
    </div>
  );
}