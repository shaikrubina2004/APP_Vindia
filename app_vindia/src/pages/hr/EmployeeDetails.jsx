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
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("");
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
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

  const handleDocFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setDocFile(file);
  };

  const handleUploadDoc = async () => {
    setDocError(null);
    if (!docTitle.trim() || !docFile) {
      setDocError("Title and a file are both required.");
      return;
    }
    setDocUploading(true);
    try {
      const formData = new FormData();
      formData.append("employee_id", employee.id);
      formData.append("title", docTitle.trim());
      formData.append("category", docCategory.trim());
      formData.append("file", docFile);
      await employeeDocumentService.upload(formData);
      setDocTitle("");
      setDocCategory("");
      setDocFile(null);
      setShowDocUpload(false);
      await fetchAdditionalDocs();
    } catch (err) {
      setDocError(err.response?.data?.error || "Failed to upload document");
    } finally {
      setDocUploading(false);
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
                placeholder="Document title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.4rem" }}
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={docCategory}
                onChange={(e) => setDocCategory(e.target.value)}
                style={{ display: "block", width: "100%", marginBottom: "0.5rem", padding: "0.4rem" }}
              />
              <input type="file" onChange={handleDocFileChange} style={{ marginBottom: "0.5rem" }} />
              {docError && <p style={{ color: "#dc2626", fontSize: "0.85rem" }}>{docError}</p>}
              <div>
                <button className="ed-btn ed-btn--delete" onClick={() => setShowDocUpload(false)} disabled={docUploading}>
                  Cancel
                </button>{" "}
                <button className="ed-btn ed-btn--edit" onClick={handleUploadDoc} disabled={docUploading}>
                  {docUploading ? "Uploading…" : "Upload"}
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