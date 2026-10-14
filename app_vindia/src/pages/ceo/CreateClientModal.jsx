// src/pages/ceo/CreateClientModal.jsx
// CEO-only "Create Client" form. Rendered by ClientManagement.jsx.
// Validation mirrors backend/controllers/ceoClientCreateController.js — the
// server remains the source of truth and its field errors are shown inline.
import { useEffect, useRef, useState } from "react";
import { X, UserPlus, AlertTriangle, CheckCircle2, Copy, Loader2 } from "lucide-react";
import { createClient } from "../../services/ceoClientService";
import "./CreateClientModal.css";

const EMAIL_RE =
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const EMPTY = {
  name: "",
  contact_person: "",
  email: "",
  phone: "",
  company_name: "",
  gstin: "",
  address: "",
  notes: "",
};

const MAX = { name: 150, contact_person: 100, email: 254, company_name: 150, address: 500, notes: 1000 };

const isValidPhone = (raw) => {
  const compact = String(raw).replace(/[\s\-().]/g, "");
  return /^(?:\+?91|0)?[6-9][0-9]{9}$/.test(compact) || /^\+[1-9][0-9]{7,14}$/.test(compact);
};

/** Returns { field: message } — empty object when the form is valid. */
const validate = (f) => {
  const e = {};
  const name = f.name.trim();
  const contact = f.contact_person.trim();
  const email = f.email.trim();
  const gstin = f.gstin.replace(/\s+/g, "").toUpperCase();

  if (!name) e.name = "Client / company name is required.";
  else if (name.length < 2) e.name = "Enter at least 2 characters.";
  else if (name.length > MAX.name) e.name = `Keep this under ${MAX.name} characters.`;

  if (!contact) e.contact_person = "Contact person name is required.";
  else if (contact.length < 2) e.contact_person = "Enter at least 2 characters.";

  if (!email) e.email = "Email address is required.";
  else if (email.length > MAX.email || !EMAIL_RE.test(email)) e.email = "Enter a valid email address.";

  if (!f.phone.trim()) e.phone = "Phone number is required.";
  else if (!isValidPhone(f.phone)) e.phone = "Enter a valid phone number (10-digit mobile, or +country code).";

  if (gstin && !GSTIN_RE.test(gstin)) e.gstin = "Enter a valid 15-character GSTIN.";
  if (f.company_name.length > MAX.company_name) e.company_name = `Keep this under ${MAX.company_name} characters.`;
  if (f.address.length > MAX.address) e.address = `Keep this under ${MAX.address} characters.`;
  if (f.notes.length > MAX.notes) e.notes = `Keep this under ${MAX.notes} characters.`;
  return e;
};

function Field({ id, label, required, error, hint, children }) {
  return (
    <div className={`ccm-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id} className="ccm-label">
        {label}
        {required && <span className="ccm-req" aria-hidden="true"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="ccm-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ccm-hint">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * Props
 *  - onClose():           called when the modal should be dismissed
 *  - onCreated(data):     called once the API confirms creation ({ client, email_sent, temporary_password? })
 */
export default function CreateClientModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [created, setCreated] = useState(null); // API data when a one-time password must be shown
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  // Esc closes (but never while a request is in flight)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitting, onClose]);

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setServerError("");
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const blur = (key) => () => {
    // Don't flag an untouched empty field just because it was focused and left;
    // empty required fields are reported on submit instead.
    if (!form[key].trim() && !submitted) return;
    setTouched((t) => ({ ...t, [key]: true }));
    const msg = validate(form)[key];
    setErrors((er) => ({ ...er, [key]: msg }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    const found = validate(form);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, true])));
    if (Object.keys(found).length) {
      document.getElementById(`ccm-${Object.keys(found)[0]}`)?.focus();
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      const data = await createClient({
        name: form.name,
        contact_person: form.contact_person,
        email: form.email,
        phone: form.phone,
        company_name: form.company_name,
        gstin: form.gstin,
        address: form.address,
        notes: form.notes,
      });
      onCreated?.(data);
      if (data?.temporary_password) setCreated(data);
      else onClose();
    } catch (err) {
      const res = err?.response;
      if (res?.data?.errors) setErrors((er) => ({ ...er, ...res.data.errors }));
      if (res?.status === 401) setServerError("Your session has expired. Please sign in again.");
      else if (res?.status === 403) setServerError("Only the CEO can create client accounts.");
      else if (err?.code === "ERR_NETWORK") setServerError("Cannot reach the server. Check your connection and try again.");
      else setServerError(res?.data?.message || "Could not create the client. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(created.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the password is visible and can be selected */
    }
  };

  /* ── success panel: only when the credential e-mail could not be delivered ── */
  if (created) {
    return (
      <div className="ccm-overlay" role="presentation">
        <div className="ccm-modal ccm-modal--narrow" role="dialog" aria-modal="true" aria-labelledby="ccm-done-title">
          <div className="ccm-success">
            <CheckCircle2 size={34} />
            <h2 id="ccm-done-title">Client account created</h2>
            <p>
              <strong>{created.client.name}</strong> was registered, but the login email could not be sent.
              Share this one-time password with <strong>{created.client.contact_person || created.client.email}</strong>{" "}
              through a secure channel.
            </p>
            <div className="ccm-secret">
              <span className="ccm-secret__label">Login: {created.client.email}</span>
              <code className="ccm-secret__value">{created.temporary_password}</code>
              <button type="button" className="cm-btn cm-btn--outline cm-btn--sm" onClick={copyPassword}>
                <Copy size={14} /> {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="ccm-warn">
              This password is shown only once and is not stored anywhere in readable form. The client should change it
              after their first sign-in.
            </p>
            <button type="button" className="cm-btn cm-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const err = (k) => (touched[k] || errors[k] ? errors[k] : undefined);

  return (
    <div className="ccm-overlay" role="presentation">
      <div className="ccm-modal" role="dialog" aria-modal="true" aria-labelledby="ccm-title">
        <header className="ccm-head">
          <div className="ccm-head__icon">
            <UserPlus size={20} />
          </div>
          <div>
            <h2 id="ccm-title">Create Client</h2>
            <p>Register a client account so projects can be linked to it.</p>
          </div>
          <button type="button" className="ccm-close" onClick={onClose} disabled={submitting} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <form onSubmit={submit} noValidate>
          <div className="ccm-body">
            {serverError && (
              <div className="ccm-alert" role="alert">
                <AlertTriangle size={16} />
                <span>{serverError}</span>
              </div>
            )}

            <div className="ccm-grid">
              <Field id="ccm-name" label="Client / Company Name" required error={err("name")}>
                <input
                  id="ccm-name"
                  ref={firstRef}
                  type="text"
                  className="ccm-input"
                  value={form.name}
                  onChange={set("name")}
                  onBlur={blur("name")}
                  maxLength={MAX.name + 20}
                  autoComplete="organization"
                  aria-invalid={Boolean(err("name"))}
                  aria-describedby={err("name") ? "ccm-name-err" : undefined}
                />
              </Field>

              <Field id="ccm-contact_person" label="Contact Person Name" required error={err("contact_person")}>
                <input
                  id="ccm-contact_person"
                  type="text"
                  className="ccm-input"
                  value={form.contact_person}
                  onChange={set("contact_person")}
                  onBlur={blur("contact_person")}
                  maxLength={MAX.contact_person + 20}
                  autoComplete="name"
                  aria-invalid={Boolean(err("contact_person"))}
                />
              </Field>

              <Field
                id="ccm-email"
                label="Email Address"
                required
                error={err("email")}
                hint="Used as the client's login. Login details are emailed here."
              >
                <input
                  id="ccm-email"
                  type="email"
                  className="ccm-input"
                  value={form.email}
                  onChange={set("email")}
                  onBlur={blur("email")}
                  autoComplete="email"
                  aria-invalid={Boolean(err("email"))}
                />
              </Field>

              <Field id="ccm-phone" label="Phone Number" required error={err("phone")}>
                <input
                  id="ccm-phone"
                  type="tel"
                  className="ccm-input"
                  value={form.phone}
                  onChange={set("phone")}
                  onBlur={blur("phone")}
                  placeholder="e.g. 9876543210"
                  autoComplete="tel"
                  aria-invalid={Boolean(err("phone"))}
                />
              </Field>

              <Field
                id="ccm-company_name"
                label="Company / Business Name"
                error={err("company_name")}
                hint="Only if different from the client name."
              >
                <input
                  id="ccm-company_name"
                  type="text"
                  className="ccm-input"
                  value={form.company_name}
                  onChange={set("company_name")}
                  onBlur={blur("company_name")}
                />
              </Field>

              <Field id="ccm-gstin" label="GSTIN / Tax ID" error={err("gstin")}>
                <input
                  id="ccm-gstin"
                  type="text"
                  className="ccm-input ccm-upper"
                  value={form.gstin}
                  onChange={set("gstin")}
                  onBlur={blur("gstin")}
                  placeholder="15-character GSTIN"
                  maxLength={20}
                  autoCapitalize="characters"
                  aria-invalid={Boolean(err("gstin"))}
                />
              </Field>
            </div>

            <Field id="ccm-address" label="Company Address" error={err("address")}>
              <textarea
                id="ccm-address"
                className="ccm-input ccm-textarea"
                rows={2}
                value={form.address}
                onChange={set("address")}
                onBlur={blur("address")}
              />
            </Field>

            <Field id="ccm-notes" label="Notes" error={err("notes")}>
              <textarea
                id="ccm-notes"
                className="ccm-input ccm-textarea"
                rows={2}
                value={form.notes}
                onChange={set("notes")}
                onBlur={blur("notes")}
              />
            </Field>

            <p className="ccm-info">
              A secure one-time password is generated and emailed to the client. No password is typed or stored in
              readable form.
            </p>
          </div>

          <footer className="ccm-foot">
            <button type="button" className="cm-btn cm-btn--outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="cm-btn cm-btn--primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={15} className="cm-spin" /> Creating…
                </>
              ) : (
                <>
                  <UserPlus size={15} /> Create Client
                </>
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}