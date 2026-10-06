import { useEffect, useState } from "react";
import { useAuth } from "../../context/useAuth";
import API from "../../services/authService";
import { getTheme, setTheme } from "../../utils/theme";
import { cap } from "../../services/ceoService";
import "./CEOTheme.css";
import "./CEOSettings.css";

const TABS = [
  { key: "account", icon: "👤", label: "Account" },
  { key: "appearance", icon: "🎨", label: "Appearance" },
  { key: "security", icon: "🔒", label: "Security" },
  { key: "system", icon: "⚙️", label: "System" },
];

function Account({ user }) {
  const initials = (user?.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="cst-card">
      <h3>Account</h3><div className="cst-sub">Your profile details.</div>
      <div className="cs-profile">
        <div className="cs-avatar">{initials}</div>
        <div><b>{user?.employee_name || user?.name || "—"}</b><span>{user?.employee_email || user?.email || "—"}</span><em className="cst-badge info">{user?.role_name || cap(user?.role)}</em></div>
      </div>
      <dl className="cs-info">
        <dt>Name</dt><dd>{user?.employee_name || user?.name || "—"}</dd>
        <dt>Email</dt><dd>{user?.employee_email || user?.email || "—"}</dd>
        <dt>Department</dt><dd>{user?.department_name || user?.employee_department || "—"}</dd>
        <dt>Designation</dt><dd>{user?.designation || "—"}</dd>
        <dt>Role</dt><dd>{user?.role_name || cap(user?.role)}</dd>
      </dl>
    </div>
  );
}

function Appearance() {
  const [theme, setT] = useState(getTheme());
  const choose = (t) => { setTheme(t); setT(t); };
  return (
    <div className="cst-card">
      <h3>Appearance</h3><div className="cst-sub">Choose light or dark mode. Saved on this device.</div>
      <div className="cs-themes">
        {[["light", "☀️ Light", "Bright and clean"], ["dark", "🌙 Dark", "Easy on the eyes"]].map(([k, l, d]) => (
          <button key={k} type="button" className={`cs-theme ${theme === k ? "active" : ""}`} onClick={() => choose(k)}>
            <span className={`cs-preview ${k}`} /><b>{l}</b><small>{d}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Password() {
  const [f, setF] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const strength = Math.min(4, [f.next.length >= 8, /[A-Z]/.test(f.next), /\d/.test(f.next), /[^A-Za-z0-9]/.test(f.next)].filter(Boolean).length);

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
    } catch (e) { setMsg({ t: "err", m: e.response?.data?.message || "Could not update password." }); }
    finally { setBusy(false); }
  };

  return (
    <div className="cst-card">
      <h3>Change password</h3><div className="cst-sub">Use at least 8 characters.</div>
      <div className="cs-form">
        <label>Current password<input className="cst-input" type="password" autoComplete="current-password" value={f.current} onChange={set("current")} /></label>
        <label>New password<input className="cst-input" type="password" autoComplete="new-password" value={f.next} onChange={set("next")} /></label>
        {f.next && <div className="cs-strength"><i className={`s${strength}`} style={{ width: `${strength * 25}%` }} /><small>{["", "Weak", "Fair", "Good", "Strong"][strength]}</small></div>}
        <label>Confirm new password<input className="cst-input" type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></label>
        <button className="cst-btn" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Update password"}</button>
        {msg && <div className={`cst-msg ${msg.t}`}>{msg.m}</div>}
      </div>
    </div>
  );
}

function SystemSettings() {
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    API.get("/settings/system").then((r) => setS(r.data)).catch(() => setMsg({ t: "err", m: "Could not load system settings." }));
  }, []);
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await API.put("/settings/system", s); setMsg({ t: "ok", m: "Saved. Takes effect on the next daily run." }); }
    catch (e) { setMsg({ t: "err", m: e.response?.data?.message || "Could not save." }); }
    finally { setBusy(false); }
  };
  return (
    <div className="cst-card">
      <h3>Lead follow-up escalation</h3>
      <div className="cst-sub">When a BDA misses a follow-up, the lead is automatically reassigned to the BDA with the lightest workload.</div>
      {!s ? (msg ? <div className={`cst-msg ${msg.t}`}>{msg.m}</div> : <div className="cst-skeleton" style={{ height: 80 }} />) : (
        <div className="cs-form">
          <label className="cs-switch">
            <input type="checkbox" checked={!!s.escalation_enabled} onChange={(e) => setS({ ...s, escalation_enabled: e.target.checked })} />
            <span className="cs-slider" />Automatically reassign overdue leads
          </label>
          <label>Days overdue before reassigning
            <input className="cst-input" type="number" min="0" max="30" value={s.escalation_grace_days} onChange={(e) => setS({ ...s, escalation_grace_days: e.target.value })} /></label>
          <button className="cst-btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          {msg && <div className={`cst-msg ${msg.t}`}>{msg.m}</div>}
        </div>
      )}
    </div>
  );
}

export default function CEOSettings() {
  const { user } = useAuth();
  const [tab, setTab] = useState("account");
  return (
    <div className="cst-page">
      <div className="cst-hero"><div><h1>Settings</h1><p>Manage your account, appearance and company preferences.</p></div></div>
      <div className="cs-layout">
        <nav className="cs-nav">
          {TABS.map((t) => (
            <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => setTab(t.key)}><span>{t.icon}</span>{t.label}</button>
          ))}
        </nav>
        <div className="cs-panel">
          {tab === "account" && <Account user={user} />}
          {tab === "appearance" && <Appearance />}
          {tab === "security" && <Password />}
          {tab === "system" && <SystemSettings />}
        </div>
      </div>
    </div>
  );
}