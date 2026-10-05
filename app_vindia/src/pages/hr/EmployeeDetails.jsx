import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { deleteEmployee, getEmployeeById } from "../../services/employeeService";
import employeeDocumentService from "../../services/employeeDocumentService";
import "./EmployeeDetails.css";
function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

     const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

    const [additionalDocs, setAdditionalDocs] = useState([]);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docCategory, setDocCategory] = useState("");
  const [docFiles, setDocFiles] = useState([]);
  const [docUploading, setDocUploading] = useState(false);
  const [docUploadProgress, setDocUploadProgress] = useState("");
  const [docError, setDocError] = useState(null);

  useEffect(() => {
    fetchEmployee();
    fetchAdditionalDocs();
  }, [id]);

  const fetchAdditionalDocs = async () => {
    try {
      const res = await employeeDocumentService.getByEmployee(id);
      setAdditionalDocs(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(id);
      setEmployee(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

    const handleDelete = async () => {
    if (window.confirm("Delete this employee?")) {
      await deleteEmployee(employee.id);
      navigate("/hr/employees");
    }
  };

    // Supports picking files multiple times (e.g. browse → pick 2 → browse
  // again → pick 3 more) — each round adds to the staged list rather than
  // replacing it, with simple de-dup by name+size so re-picking the same
  // file twice doesn't queue it twice.
  const handleDocFileChange = (e) => {
    const picked = Array.from(e.target.files || []);
    setDocFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const newOnes = picked.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newOnes];
    });
    e.target.value = ""; // allow re-selecting the same file later if removed
  };

  const removeStagedFile = (index) => {
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const stripExtension = (filename) => filename.replace(/\.[^/.]+$/, "");

  const handleUploadDoc = async () => {
    setDocError(null);
    if (docFiles.length === 0) {
      setDocError("Select at least one file.");
      return;
    }
    setDocUploading(true);
    const failures = [];
    try {
      for (let i = 0; i < docFiles.length; i++) {
        const file = docFiles[i];
        setDocUploadProgress(`Uploading ${i + 1} of ${docFiles.length}…`);
        try {
          const formData = new FormData();
          formData.append("employee_id", employee.id);
          formData.append("title", stripExtension(file.name));
          formData.append("category", docCategory.trim());
          formData.append("file", file);
          await employeeDocumentService.upload(formData);
        } catch (err) {
          failures.push(file.name);
        }
      }
      if (failures.length > 0) {
        setDocError(`Failed to upload: ${failures.join(", ")}`);
      } else {
        setDocCategory("");
        setDocFiles([]);
        setShowDocUpload(false);
      }
      await fetchAdditionalDocs();
    } finally {
      setDocUploading(false);
      setDocUploadProgress("");
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try {
      await employeeDocumentService.delete(docId);
      setAdditionalDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="ed-loading"><div className="ed-spinner" /></div>;
  if (!employee) return <div className="ed-not-found">Employee not found</div>;

  const FILE_BASE = "http://localhost:5000/uploads/";
  const DEFAULTS = ["default-profile.png", "default-id.pdf", "default-offer.pdf", "default-cert.pdf"];
  const hasFile = (val) => val && !DEFAULTS.includes(val);

  const profileSrc = hasFile(employee.profile_photo)
    ? `${FILE_BASE}${employee.profile_photo}`
    : null;

  const attrs = [
    { label: "Department",  value: employee.department },
    { label: "Emp. Type",   value: employee.employment_type },
    { label: "Location",    value: employee.work_location },
    { label: "Shift",       value: employee.shift_timing },
    { label: "Experience",  value: employee.experience ? `${employee.experience} yrs` : null },
    { label: "Prev. Co.",   value: employee.previous_company },
  ].filter(a => a.value);

  const docs = [
    { label: "ID Proof",     field: "id_proof" },
    { label: "Offer Letter", field: "offer_letter" },
    { label: "Certificates", field: "certificates" },
  ];

  return (
    <div className="ed-page">

      {/* ── TOP BAR ── */}
      <div className="ed-topbar">
        <div>
          <h1 className="ed-title">Employee Profile</h1>
          
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div className="ed-main-card">

        {/* LEFT: info */} 
        <div className="ed-left">

          <div className="ed-name-row">
            <h2 className="ed-name">{employee.name}</h2>
            <span className={`ed-badge ed-badge--${employee.status}`}>{employee.status}</span>
          </div>
          <p className="ed-role">{employee.designation} • {employee.department}</p>

          <div className="ed-code-row">
            <span className="ed-code-label">Employee Code</span>
            <span className="ed-code-val">{employee.employee_code || "—"}</span>
            {employee.employee_code && (
              <button className="ed-copy-btn" onClick={() => handleCopy(employee.employee_code)}>
                {copied ? "✓ Copied" : "⎘ Copy"}
              </button>
            )}
          </div>

          <div className="ed-divider" />

          <div className="ed-info-grid">
            {[
              { label: "Email",   value: employee.email },
              { label: "Phone",   value: employee.phone },
              { label: "Manager", value: employee.manager_name || "N/A" },
              { label: "Joined",  value: new Date(employee.join_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
              { label: "DOB",     value: employee.dob ? new Date(employee.dob).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A" },
              { label: "Salary",  value: `₹${Number(employee.salary).toLocaleString("en-IN")}`, bold: true },
            ].map(({ label, value, bold }) => (
              <div key={label} className="ed-info-item">
                <span className="ed-info-label">{label}</span>
                <span className={`ed-info-val${bold ? " ed-salary" : ""}`}>{value}</span>
              </div>
            ))}
          </div>

          <div className="ed-divider" />

          {attrs.length > 0 && (
            <div className="ed-attrs-section">
              <p className="ed-section-label">Attributes</p>
              <div className="ed-attrs-grid">
                {attrs.map((a) => (
                  <div key={a.label} className="ed-attr-chip">
                    <span className="ed-attr-label">{a.label}</span>
                    <span className="ed-attr-val">{a.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="ed-actions">
            <button className="ed-btn ed-btn--edit" onClick={() => navigate("/hr/add-employee", { state: employee })}>
               Edit
            </button>
            <button className="ed-btn ed-btn--delete" onClick={handleDelete}>
               Delete
            </button>
          </div>
        </div>

        {/* RIGHT: profile photo */}
        <div className="ed-right">
          <div className="ed-photo-wrap">
            {profileSrc ? (
              <img src={profileSrc} alt={employee.name} className="ed-photo" />
            ) : (
              <div className="ed-photo-placeholder">
                <span>{employee.name?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOTTOM CARDS ROW ── */}
      <div className="ed-bottom-row">

        <div className="ed-bottom-card">
          <div className="ed-bottom-card-header">
            <span className="ed-bottom-card-icon"></span>
            <h4>Finance Details</h4>
          </div>
          <div className="ed-finance-grid">
            {[
              { label: "Account No", value: employee.account_no },
              { label: "IFSC",       value: employee.ifsc },
              { label: "ID Type",    value: employee.gov_id_type,   cap: true },
              { label: "ID Number",  value: employee.gov_id_number },
            ].map(({ label, value, cap }) => (
              <div key={label} className="ed-finance-item">
                <span className="ed-finance-label">{label}</span>
                <span className="ed-finance-val" style={cap ? { textTransform: "capitalize" } : {}}>{value || "N/A"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ed-bottom-card">
          <div className="ed-bottom-card-header">
            <span className="ed-bottom-card-icon"></span>
            <h4>Address</h4>
          </div>
          <p className="ed-address-text">{employee.address || "No address on record"}</p>
          <div className="ed-bottom-card-header" style={{ marginTop: "1.1rem" }}>
            <span className="ed-bottom-card-icon"></span>
            <h4>Personal</h4>
          </div>
          <div className="ed-finance-grid">
            {[
              { label: "Gender",      value: employee.gender },
              { label: "Marital",     value: employee.marital_status },
              { label: "Nationality", value: employee.nationality },
            ].map(({ label, value }) => (
              <div key={label} className="ed-finance-item">
                <span className="ed-finance-label">{label}</span>
                <span className="ed-finance-val">{value || "N/A"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="ed-bottom-card">
          <div className="ed-bottom-card-header">
            <span className="ed-bottom-card-icon"></span>
            <h4>Documents</h4>
          </div>
                    <div className="ed-docs-list">
            {docs.map(({ label, field }) => (
              <div key={field} className="ed-doc-row">
                <span className="ed-doc-label">{label}</span>
                {hasFile(employee[field]) ? (
                  <a href={`${FILE_BASE}${employee[field]}`} target="_blank" rel="noreferrer" className="ed-doc-view-btn">View</a>
                ) : (
                  <span className="ed-doc-none">Not uploaded</span>
                )}
              </div>
            ))}
          </div>

          <div className="ed-bottom-card-header" style={{ marginTop: "1.1rem" }}>
            <h4>Additional Documents</h4>
          </div>

          {additionalDocs.length === 0 ? (
            <p className="ed-doc-none" style={{ marginBottom: "0.75rem" }}>None uploaded yet</p>
          ) : (
            <div className="ed-docs-list">
              {additionalDocs.map((d) => (
                <div key={d.id} className="ed-doc-row">
                  <span className="ed-doc-label">
                    {d.title}
                    {d.category ? ` · ${d.category}` : ""}
                  </span>
                  <span>
                    <a href={`http://localhost:5000${d.file_url}`} target="_blank" rel="noreferrer" className="ed-doc-view-btn">View</a>
                    {" "}
                    <button
                      className="ed-doc-view-btn"
                      style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
                      onClick={() => handleDeleteDoc(d.id)}
                    >
                      Delete
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}

          {!showDocUpload ? (
            <button className="ed-btn ed-btn--edit" style={{ marginTop: "0.5rem" }} onClick={() => setShowDocUpload(true)}>
              + Upload Document
            </button>
          ) : (
                        <div style={{ marginTop: "0.5rem" }}>
              <input
                type="text"
                placeholder="Category (optional, applies to all files below)"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.4rem" }}
              />

              {docFiles.length > 0 && (
                <div style={{ marginBottom: "0.5rem" }}>
                  {docFiles.map((f, i) => (
                    <div
                      key={`${f.name}_${f.size}`}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.3rem 0", fontSize: "0.85rem" }}
                    >
                      <span>📄 {f.name}</span>
                      <button
                        type="button"
                        onClick={() => removeStagedFile(i)}
                        disabled={docUploading}
                        style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                multiple
                onChange={handleDocFileChange}
                disabled={docUploading}
                style={{ marginBottom: "0.5rem" }}
              />
              <p style={{ fontSize: "0.78rem", color: "#6b7280", margin: "0 0 0.5rem" }}>
                Select multiple files at once, or click again to add more — each is titled from its own filename.
              </p>

              {docError && <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{docError}</p>}
              {docUploadProgress && <p style={{ fontSize: "0.85rem", color: "#0A4174" }}>{docUploadProgress}</p>}

              <div>
                <button className="ed-btn ed-btn--delete" onClick={() => { setShowDocUpload(false); setDocFiles([]); }} disabled={docUploading}>
                  Cancel
                </button>{" "}
                <button className="ed-btn ed-btn--edit" onClick={handleUploadDoc} disabled={docUploading || docFiles.length === 0}>
                  {docUploading ? "Uploading…" : `Upload ${docFiles.length > 0 ? `(${docFiles.length})` : ""}`}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default EmployeeDetails;