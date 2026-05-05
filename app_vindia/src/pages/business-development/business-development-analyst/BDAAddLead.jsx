import React, { useState, useRef } from "react";
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
  const [tab, setTab]   = useState("manual"); // manual | excel | justdial
  const [form, setForm] = useState({ ...INIT });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(null);

  /* Excel / JustDial import state */
  const [file, setFile]           = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError]   = useState(null);
  const fileRef = useRef();

  const set = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: null }));
  };

  /* ── Validate ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim())  e.name  = "Name is required";
    if (!form.phone.trim()) e.phone = "Phone is required";
    else if (!/^\d{7,15}$/.test(form.phone.trim())) e.phone = "Enter a valid phone number";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── Submit manual form ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSuccess(null);
    try {
      const payload = {
        ...form,
        whatsapp: form.whatsapp || form.phone,
        budget:   form.budget   ? Number(form.budget)  : null,
        sqft:     form.sqft     ? Number(form.sqft)    : null,
        designs_sent: Number(form.designs_sent) || 0,
      };
      await axios.post(`${API}/leads`, payload);
      setSuccess("Lead added successfully!");
      setForm({ ...INIT });
      setErrors({});
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
              <Field label="Full Name" required>
                <input className={`al-input ${errors.name ? "al-input--err" : ""}`}
                  placeholder="e.g. Rajesh Kumar"
                  value={form.name} onChange={e => set("name", e.target.value)} />
                {errors.name && <p className="al-err">{errors.name}</p>}
              </Field>

              <Field label="Phone Number" required>
                <input className={`al-input ${errors.phone ? "al-input--err" : ""}`}
                  placeholder="10-digit mobile" type="tel"
                  value={form.phone} onChange={e => set("phone", e.target.value)} />
                {errors.phone && <p className="al-err">{errors.phone}</p>}
              </Field>

              <Field label="WhatsApp Number">
                <input className="al-input" placeholder="Same as phone if blank" type="tel"
                  value={form.whatsapp} onChange={e => set("whatsapp", e.target.value)} />
              </Field>

              <Field label="Email Address">
                <input className={`al-input ${errors.email ? "al-input--err" : ""}`}
                  placeholder="example@email.com" type="email"
                  value={form.email} onChange={e => set("email", e.target.value)} />
                {errors.email && <p className="al-err">{errors.email}</p>}
              </Field>

              <Field label="City">
                <input className="al-input" placeholder="e.g. Bangalore"
                  value={form.city} onChange={e => set("city", e.target.value)} />
              </Field>

              <Field label="Area / Locality">
                <input className="al-input" placeholder="e.g. Whitefield"
                  value={form.area} onChange={e => set("area", e.target.value)} />
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
                <select className="al-input" value={form.source} onChange={e => set("source", e.target.value)}>
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Lead Status">
                <select className="al-input" value={form.status} onChange={e => set("status", e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Call Status">
                <select className="al-input" value={form.call_status} onChange={e => set("call_status", e.target.value)}>
                  <option value="">— Select —</option>
                  {CALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Assigned To">
                <input className="al-input" placeholder="BDA name or email"
                  value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} />
              </Field>

              <Field label="Search Category">
                <input className="al-input" placeholder="e.g. Home construction"
                  value={form.search_category} onChange={e => set("search_category", e.target.value)} />
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
                <select className="al-input" value={form.building_type} onChange={e => set("building_type", e.target.value)}>
                  <option value="">— Select —</option>
                  {BUILDING_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>

              <Field label="Floors">
                <select className="al-input" value={form.floors} onChange={e => set("floors", e.target.value)}>
                  <option value="">— Select —</option>
                  {FLOOR_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </Field>

              <Field label="Plot Measurement">
                <input className="al-input" placeholder="e.g. 30 x 40"
                  value={form.measurement} onChange={e => set("measurement", e.target.value)} />
              </Field>

              <Field label="Sq. Ft">
                <input className="al-input" placeholder="e.g. 1200" type="number" min="0"
                  value={form.sqft} onChange={e => set("sqft", e.target.value)} />
              </Field>

              <Field label="Budget (₹)">
                <input className="al-input" placeholder="e.g. 2500000" type="number" min="0"
                  value={form.budget} onChange={e => set("budget", e.target.value)} />
              </Field>

              <Field label="Designs Sent">
                <input className="al-input" placeholder="0" type="number" min="0"
                  value={form.designs_sent} onChange={e => set("designs_sent", e.target.value)} />
              </Field>
            </div>

            {/* Quotation toggle */}
            <div className="al-toggle-row">
              <label className="al-toggle">
                <input type="checkbox" checked={form.quotation_sent}
                  onChange={e => set("quotation_sent", e.target.checked)} />
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
              <textarea className="al-input al-textarea" rows={3}
                placeholder="Any additional details about the lead…"
                value={form.description} onChange={e => set("description", e.target.value)} />
            </Field>
          </div>

          {/* ACTIONS */}
          <div className="al-footer">
            <button className="bda-btn-outline" onClick={() => { setForm({...INIT}); setErrors({}); }}>
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
              // build a sample Excel template hint
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