import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./BDAAddLead.css";

const API = "http://localhost:5000/api";

const SOURCES       = ["JustDial","Facebook/Meta","Manual","Website","Walk-in","Referral","Excel"];
const STATUSES      = ["New","Interested","Follow Up","Converted","Not Interested","Contacted"];
const CALL_STATUSES = ["Connected","Not Connected","Busy","Switch Off","Call Back"];
const BUILDING_TYPES= ["Residential","Commercial","Industrial","Institutional","Mixed Use"];
const FLOOR_OPTIONS = ["G","G+1","G+2","G+3","G+4","G+5","Above G+5"];

const INIT = {
  name:"", phone:"", whatsapp:"", email:"", city:"", area:"",
  source:"Manual", status:"New", call_status:"", building_type:"",
  floors:"", measurement:"", sqft:"", budget:"", assigned_to:"",
  quotation_sent:false, description:"", search_category:"", designs_sent:0,
};

/* ─── small helpers ─── */
const Field = ({ label, required, children }) => (
  <div className="al-field">
    <label className="al-label">{label}{required && <span className="al-req">*</span>}</label>
    {children}
  </div>
);

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
const BDAAddLead = () => {
  const navigate  = useNavigate();
  const [tab, setTab]   = useState("manual");
  const [form, setForm] = useState({ ...INIT });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  // WhatsApp same-as-phone toggle
  const [whatsappSame, setWhatsappSame] = useState(false);

  // Logged-in user info
  const [loggedInUser, setLoggedInUser] = useState(null);

  /* Excel / JustDial import state */
  const [file, setFile]           = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError]   = useState(null);
  const fileRef = useRef();

  /* ── Load logged-in user from localStorage/sessionStorage on mount ── */
  useEffect(() => {
    // Try to get user info from localStorage (adjust key names to match your auth setup)
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setLoggedInUser(user);
        // Auto-fill assigned_to with logged-in user's name or email
        setForm(f => ({ ...f, assigned_to: user.name || user.email || "" }));
      } catch (_) {}
    } else {
      // Fallback: try token decode or individual keys
      const userName  = localStorage.getItem("userName")  || sessionStorage.getItem("userName");
      const userEmail = localStorage.getItem("userEmail") || sessionStorage.getItem("userEmail");
      if (userName || userEmail) {
        setLoggedInUser({ name: userName, email: userEmail });
        setForm(f => ({ ...f, assigned_to: userName || userEmail || "" }));
      }
    }
  }, []);

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  /* ── Handle phone change — sync whatsapp if checkbox ticked ── */
  const handlePhoneChange = (v) => {
    set("phone", v);
    if (whatsappSame) {
      setForm(f => ({ ...f, phone: v, whatsapp: v }));
      if (errors.phone)    setErrors(e => ({ ...e, phone: null }));
      if (errors.whatsapp) setErrors(e => ({ ...e, whatsapp: null }));
    }
  };

  /* ── Handle WhatsApp same toggle ── */
  const handleWhatsappSameToggle = (checked) => {
    setWhatsappSame(checked);
    if (checked) {
      setForm(f => ({ ...f, whatsapp: f.phone }));
      if (errors.whatsapp) setErrors(e => ({ ...e, whatsapp: null }));
    } else {
      setForm(f => ({ ...f, whatsapp: "" }));
    }
  };

  /* ── Validate ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";

    if (!form.phone.trim()) {
      e.phone = "Phone number is required";
    } else if (!/^\d{7,15}$/.test(form.phone.trim())) {
      e.phone = "Enter a valid phone number (7–15 digits)";
    }

    if (!whatsappSame) {
      if (!form.whatsapp.trim()) {
        e.whatsapp = "WhatsApp number is required";
      } else if (!/^\d{7,15}$/.test(form.whatsapp.trim())) {
        e.whatsapp = "Enter a valid WhatsApp number (7–15 digits)";
      }
    }

    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) {
      e.email = "Invalid email address";
    }

    if (form.budget && isNaN(Number(form.budget))) {
      e.budget = "Budget must be a number";
    }

    if (form.sqft && isNaN(Number(form.sqft))) {
      e.sqft = "Sq. Ft must be a number";
    }

    if (!form.source) e.source = "Lead source is required";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit manual form ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSuccess(null);
    try {
      const resolvedWhatsapp = whatsappSame ? form.phone : form.whatsapp;
      const payload = {
        ...form,
        whatsapp: resolvedWhatsapp,
        budget:   form.budget   ? Number(form.budget)  : null,
        sqft:     form.sqft     ? Number(form.sqft)    : null,
        designs_sent: Number(form.designs_sent) || 0,
      };
      await axios.post(`${API}/leads`, payload);
      setSuccess("Lead added successfully!");
      setForm({ ...INIT, assigned_to: loggedInUser?.name || loggedInUser?.email || "" });
      setErrors({});
      setWhatsappSame(false);
      setTimeout(() => navigate("/bda/leads"), 1500);
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || "Failed to save lead" });
    } finally {
      setSaving(false);
    }
  };

  /* ── Excel / JustDial import ── */
  const handleImport = async (endpoint) => {
    if (!file) { setImportError("Please select a file first"); return; }
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API}/leads/${endpoint}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setImportResult(res.data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setImportError(err.response?.data?.error || err.response?.data?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="al-page">

      {/* ── HEADER ── */}
      <div className="bda-header">
        <div>
          <p className="bda-breadcrumb">Business Development Analyst</p>
          <h1 className="bda-title">Add Lead</h1>
        </div>
        <button className="bda-btn-outline" onClick={() => navigate("/bda/leads")}>
          ← Back to Leads
        </button>
      </div>

      {/* ── TAB SWITCHER ── */}
      <div className="al-tabs">
        {[
          { key:"manual",   label:"✏️  Manual Entry" },
          { key:"excel",    label:"📊  Excel Import" },
          { key:"justdial", label:"📋  JustDial Import" },
        ].map(t => (
          <button
            key={t.key}
            className={`al-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => { setTab(t.key); setImportResult(null); setImportError(null); setFile(null); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════
          MANUAL FORM
      ════════════════════════ */}
      {tab === "manual" && (
        <div className="al-card">

          {success && (
            <div className="al-alert al-alert--success">✅ {success}</div>
          )}
          {errors._global && (
            <div className="al-alert al-alert--error">⚠ {errors._global}</div>
          )}

          {/* SECTION 1 — Basic Info */}
          <div className="al-section">
            <div className="al-section-title">
              <span className="al-section-num">1</span> Basic Information
            </div>
            <div className="al-grid">

              {/* Full Name */}
              <Field label="Full Name" required>
                <input
                  className={`al-input ${errors.name ? "al-input--err" : ""}`}
                  placeholder="e.g. Rajesh Kumar"
                  value={form.name}
                  onChange={e => set("name", e.target.value)}
                />
                {errors.name && <p className="al-err">{errors.name}</p>}
              </Field>

              {/* Phone Number */}
              <Field label="Phone Number" required>
                <input
                  className={`al-input ${errors.phone ? "al-input--err" : ""}`}
                  placeholder="10-digit mobile"
                  type="tel"
                  value={form.phone}
                  onChange={e => handlePhoneChange(e.target.value)}
                />
                {errors.phone && <p className="al-err">{errors.phone}</p>}
              </Field>

              {/* WhatsApp — checkbox + conditional field */}
              <div className="al-field">
                <label className="al-label">
                  WhatsApp Number<span className="al-req">*</span>
                </label>

                {/* Checkbox: same as phone */}
                <label className="al-wa-same-label">
                  <input
                    type="checkbox"
                    className="al-wa-checkbox"
                    checked={whatsappSame}
                    onChange={e => handleWhatsappSameToggle(e.target.checked)}
                  />
                  <span className="al-wa-same-text">Same as phone number</span>
                </label>

                {/* Show WhatsApp input only when NOT same */}
                {!whatsappSame && (
                  <>
                    <input
                      className={`al-input al-wa-input ${errors.whatsapp ? "al-input--err" : ""}`}
                      placeholder="WhatsApp number"
                      type="tel"
                      value={form.whatsapp}
                      onChange={e => set("whatsapp", e.target.value)}
                    />
                    {errors.whatsapp && <p className="al-err">{errors.whatsapp}</p>}
                  </>
                )}

                {/* When same, show a read-only preview */}
                {whatsappSame && form.phone && (
                  <div className="al-wa-preview">
                    <span className="al-wa-preview-icon">✅</span>
                    <span className="al-wa-preview-num">{form.phone}</span>
                  </div>
                )}
              </div>

              {/* Email */}
              <Field label="Email Address">
                <input
                  className={`al-input ${errors.email ? "al-input--err" : ""}`}
                  placeholder="example@email.com"
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                />
                {errors.email && <p className="al-err">{errors.email}</p>}
              </Field>

              {/* City */}
              <Field label="City">
                <input
                  className="al-input"
                  placeholder="e.g. Bangalore"
                  value={form.city}
                  onChange={e => set("city", e.target.value)}
                />
              </Field>

              {/* Area */}
              <Field label="Area / Locality">
                <input
                  className="al-input"
                  placeholder="e.g. Whitefield"
                  value={form.area}
                  onChange={e => set("area", e.target.value)}
                />
              </Field>

            </div>
          </div>

          {/* SECTION 2 — Lead Details */}
          <div className="al-section">
            <div className="al-section-title">
              <span className="al-section-num">2</span> Lead Details
            </div>
            <div className="al-grid">

              <Field label="Lead Source" required>
                <select
                  className={`al-input ${errors.source ? "al-input--err" : ""}`}
                  value={form.source}
                  onChange={e => set("source", e.target.value)}
                >
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.source && <p className="al-err">{errors.source}</p>}
              </Field>

              <Field label="Lead Status">
                <select
                  className="al-input"
                  value={form.status}
                  onChange={e => set("status", e.target.value)}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Call Status">
                <select
                  className="al-input"
                  value={form.call_status}
                  onChange={e => set("call_status", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              {/* ── ASSIGNED TO — auto-filled, read-only ── */}
              <Field label="Assigned To">
                <div className="al-assigned-wrapper">
                  <input
                    className="al-input al-assigned-input"
                    value={form.assigned_to}
                    readOnly
                    placeholder="Loading user..."
                    title="Auto-filled from your login"
                  />
                  {loggedInUser && (
                    <span className="al-assigned-badge" title="Auto-filled from your login">
                      🔒 Auto
                    </span>
                  )}
                </div>

              </Field>

              <Field label="Search Category">
                <input
                  className="al-input"
                  placeholder="e.g. Home construction"
                  value={form.search_category}
                  onChange={e => set("search_category", e.target.value)}
                />
              </Field>

            </div>
          </div>

          {/* SECTION 3 — Project Details */}
          <div className="al-section">
            <div className="al-section-title">
              <span className="al-section-num">3</span> Project Details
            </div>
            <div className="al-grid">

              <Field label="Building Type">
                <select
                  className="al-input"
                  value={form.building_type}
                  onChange={e => set("building_type", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {BUILDING_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="Floors">
                <select
                  className="al-input"
                  value={form.floors}
                  onChange={e => set("floors", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>

              <Field label="Plot Measurement">
                <input
                  className="al-input"
                  placeholder="e.g. 30 x 40"
                  value={form.measurement}
                  onChange={e => set("measurement", e.target.value)}
                />
              </Field>

              <Field label="Sq. Ft">
                <input
                  className={`al-input ${errors.sqft ? "al-input--err" : ""}`}
                  placeholder="e.g. 1200"
                  type="number"
                  min="0"
                  value={form.sqft}
                  onChange={e => set("sqft", e.target.value)}
                />
                {errors.sqft && <p className="al-err">{errors.sqft}</p>}
              </Field>

              <Field label="Budget (₹)">
                <input
                  className={`al-input ${errors.budget ? "al-input--err" : ""}`}
                  placeholder="e.g. 2500000"
                  type="number"
                  min="0"
                  value={form.budget}
                  onChange={e => set("budget", e.target.value)}
                />
                {errors.budget && <p className="al-err">{errors.budget}</p>}
              </Field>

              <Field label="Designs Sent">
                <input
                  className="al-input"
                  placeholder="0"
                  type="number"
                  min="0"
                  value={form.designs_sent}
                  onChange={e => set("designs_sent", e.target.value)}
                />
              </Field>

            </div>

            {/* Quotation toggle */}
            <div className="al-toggle-row">
              <label className="al-toggle">
                <input
                  type="checkbox"
                  checked={form.quotation_sent}
                  onChange={e => set("quotation_sent", e.target.checked)}
                />
                <span className="al-toggle__track" />
                <span className="al-toggle__label">Quotation Sent</span>
              </label>
            </div>
          </div>

          {/* SECTION 4 — Notes */}
          <div className="al-section">
            <div className="al-section-title">
              <span className="al-section-num">4</span> Additional Notes
            </div>
            <Field label="Description / Notes">
              <textarea
                className="al-input al-textarea"
                rows={3}
                placeholder="Any additional details about the lead…"
                value={form.description}
                onChange={e => set("description", e.target.value)}
              />
            </Field>
          </div>

          {/* ACTIONS */}
          <div className="al-footer">
            <button
              className="bda-btn-outline"
              onClick={() => {
                setForm({ ...INIT, assigned_to: loggedInUser?.name || loggedInUser?.email || "" });
                setErrors({});
                setWhatsappSame(false);
              }}
            >
              Clear Form
            </button>
            <button className="bda-btn-outline" onClick={() => navigate("/bda/leads")}>
              Cancel
            </button>
            <button className="bda-btn-primary" onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : "➕ Add Lead"}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════
          EXCEL IMPORT
      ════════════════════════ */}
      {tab === "excel" && (
        <div className="al-card">
          <div className="al-import-info">
            <h3 className="al-import-title">📊 Import Leads from Excel</h3>
            <p className="al-import-desc">
              Upload an <strong>.xlsx</strong> file with columns:<br />
              <code>name, phone, email, city, source, status, assigned_to, building_type, floors, budget, description</code>
            </p>
            <a className="al-dl-link" href="#" onClick={e => {
              e.preventDefault();
              alert("Required columns: name, phone\nOptional: email, city, source, status, call_status, building_type, floors, measurement, sqft, budget, assigned_to, description");
            }}>
              📥 View required columns
            </a>
          </div>

          <div
            className={`al-dropzone ${file ? "al-dropzone--has-file" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setFile(f); }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:"none" }}
              onChange={e => { setFile(e.target.files[0]); setImportResult(null); setImportError(null); }} />
            {file ? (
              <>
                <div className="al-dz-icon">📄</div>
                <p className="al-dz-name">{file.name}</p>
                <p className="al-dz-sub">{(file.size/1024).toFixed(1)} KB — Click to change</p>
              </>
            ) : (
              <>
                <div className="al-dz-icon">📂</div>
                <p className="al-dz-name">Drop your Excel file here</p>
                <p className="al-dz-sub">or click to browse (.xlsx, .xls)</p>
              </>
            )}
          </div>

          {importError  && <div className="al-alert al-alert--error">⚠ {importError}</div>}
          {importResult && (
            <div className="al-alert al-alert--success">
              ✅ Import successful! {importResult.affectedRows || ""} rows added.
              <button className="al-alert-link" onClick={() => navigate("/bda/leads")}>View Leads →</button>
            </div>
          )}

          <div className="al-footer">
            <button className="bda-btn-outline" onClick={() => navigate("/bda/leads")}>Cancel</button>
            <button className="bda-btn-primary" disabled={!file || importing}
              onClick={() => handleImport("import-excel")}>
              {importing ? "Importing…" : "📤 Import Excel"}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════
          JUSTDIAL IMPORT
      ════════════════════════ */}
      {tab === "justdial" && (
        <div className="al-card">
          <div className="al-import-info">
            <h3 className="al-import-title">📋 Import from JustDial</h3>
            <p className="al-import-desc">
              Upload the JustDial export file (<strong>.xlsx</strong> or <strong>.pdf</strong>).<br />
              Expected columns: <code>Customer Name, User Number, User Email, City, Date and Time, Search Category, Area</code>
            </p>
            <div className="al-jd-badge">All imported leads will be tagged as source: <strong>JustDial</strong></div>
          </div>

          <div
            className={`al-dropzone ${file ? "al-dropzone--has-file" : ""}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setFile(f); }}
          >
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf" style={{ display:"none" }}
              onChange={e => { setFile(e.target.files[0]); setImportResult(null); setImportError(null); }} />
            {file ? (
              <>
                <div className="al-dz-icon">{file.name.endsWith(".pdf") ? "📕" : "📄"}</div>
                <p className="al-dz-name">{file.name}</p>
                <p className="al-dz-sub">{(file.size/1024).toFixed(1)} KB — Click to change</p>
              </>
            ) : (
              <>
                <div className="al-dz-icon">📋</div>
                <p className="al-dz-name">Drop JustDial file here</p>
                <p className="al-dz-sub">or click to browse (.xlsx, .xls, .pdf)</p>
              </>
            )}
          </div>

          {importError  && <div className="al-alert al-alert--error">⚠ {importError}</div>}
          {importResult && (
            <div className="al-alert al-alert--success">
              ✅ JustDial import successful!
              <button className="al-alert-link" onClick={() => navigate("/bda/leads")}>View Leads →</button>
            </div>
          )}

          <div className="al-footer">
            <button className="bda-btn-outline" onClick={() => navigate("/bda/leads")}>Cancel</button>
            <button className="bda-btn-primary" disabled={!file || importing}
              onClick={() => handleImport("import-justdial")}>
              {importing ? "Importing…" : "📤 Import JustDial"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BDAAddLead;