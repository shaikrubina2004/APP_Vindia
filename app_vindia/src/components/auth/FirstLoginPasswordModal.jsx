import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import "./FirstLoginPasswordModal.css";

// Shown to an employee who is still on the temporary password they were
// emailed (the login response sets user.must_change_password = true).
// Changing it is their choice: "Remind me later" hides the pop-up for this
// visit and leaves a small reminder button. Only the PASSWORD can be changed —
// the login ID (email) and employee ID never change.

const SNOOZE_KEY = "pwd_prompt_snoozed";

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

const rulesOf = (pw) => ({
  length: pw.length >= 8,
  letter: /[A-Za-z]/.test(pw),
  number: /\d/.test(pw),
});

const strengthOf = (pw) => {
  if (!pw) return { level: 0, label: "" };
  const points = [
    pw.length >= 8,
    pw.length >= 12,
    /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    /\d/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ].filter(Boolean).length;
  if (points <= 2) return { level: 1, label: "Weak" };
  if (points <= 3) return { level: 2, label: "Okay" };
  return { level: 3, label: "Strong" };
};

export default function FirstLoginPasswordModal() {
  const [needs, setNeeds] = useState(() => readUser()?.must_change_password === true);
  const [open, setOpen] = useState(
    () =>
      readUser()?.must_change_password === true &&
      sessionStorage.getItem(SNOOZE_KEY) !== "1"
  );

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const remindLater = useCallback(() => {
    sessionStorage.setItem(SNOOZE_KEY, "1");
    setOpen(false);
  }, []);

  // Esc = "Remind me later"
  useEffect(() => {
    if (!open || busy || done) return;
    const onKey = (e) => e.key === "Escape" && remindLater();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, done, remindLater]);

  if (!needs) return null;

  const rules = rulesOf(next);
  const strength = strengthOf(next);
  const matches = confirm.length > 0 && next === confirm;
  const canSubmit =
    current && rules.length && rules.letter && rules.number && matches && !busy;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });

      // remember locally that the temporary password has been replaced
      const user = readUser();
      if (user) {
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, must_change_password: false })
        );
      }
      sessionStorage.removeItem(SNOOZE_KEY);
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        setNeeds(false);
      }, 1800);
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not change the password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  /* ── small reminder button after "Remind me later" ── */
  if (!open) {
    return (
      <button
        type="button"
        className="flp-pill"
        onClick={() => setOpen(true)}
        title="You are still using the temporary password from your email"
      >
        🔒 Set your own password
      </button>
    );
  }

  return (
    <div className="flp-overlay" role="presentation">
      <div
        className="flp-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flp-title"
      >
        {done ? (
          <div className="flp-success">
            <div className="flp-success-icon">✓</div>
            <h2 id="flp-title">Password updated</h2>
            <p>You can now sign in with your new password next time.</p>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <div className="flp-icon">🔐</div>
            <h2 id="flp-title">Welcome to Vindia!</h2>
            <p className="flp-sub">
              You signed in with the temporary password from your email. For your
              security, we recommend choosing your own password now.
            </p>
            <p className="flp-note">
              Your login ID and employee ID stay the same. Only the password changes.
            </p>

            <label className="flp-label" htmlFor="flp-current">
              Temporary password (from the email)
            </label>
            <input
              id="flp-current"
              className="flp-input"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoFocus
            />

            <label className="flp-label" htmlFor="flp-new">
              New password
            </label>
            <input
              id="flp-new"
              className="flp-input"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />

            {next && (
              <div className="flp-strength" aria-live="polite">
                <div className="flp-bars">
                  {[1, 2, 3].map((n) => (
                    <span
                      key={n}
                      className={`flp-bar ${strength.level >= n ? `on-${strength.level}` : ""}`}
                    />
                  ))}
                </div>
                <span className={`flp-strength-text s-${strength.level}`}>
                  {strength.label}
                </span>
              </div>
            )}

            <ul className="flp-rules">
              <li className={rules.length ? "ok" : ""}>At least 8 characters</li>
              <li className={rules.letter ? "ok" : ""}>One letter</li>
              <li className={rules.number ? "ok" : ""}>One number</li>
            </ul>

            <label className="flp-label" htmlFor="flp-confirm">
              Confirm new password
            </label>
            <input
              id="flp-confirm"
              className={`flp-input ${confirm && !matches ? "flp-bad" : ""}`}
              type={show ? "text" : "password"}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {confirm && !matches && (
              <div className="flp-hint">Passwords do not match yet</div>
            )}

            <label className="flp-show">
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
              />
              Show passwords
            </label>

            {error && (
              <div className="flp-error" role="alert">
                {error}
              </div>
            )}

            <div className="flp-actions">
              <button
                type="button"
                className="flp-btn flp-btn-ghost"
                onClick={remindLater}
                disabled={busy}
              >
                Remind me later
              </button>
              <button
                type="submit"
                className="flp-btn flp-btn-primary"
                disabled={!canSubmit}
              >
                {busy ? "Saving…" : "Change password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}