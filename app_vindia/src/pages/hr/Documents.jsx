import React, { useState } from "react";
import "./Documents.css";

function Documents() {
  const [documents, setDocuments] = useState([
    {
      id: 1,
      name: "Employee Handbook 2024",
      type: "PDF",
      category: "Policies",
      uploadedBy: "HR Admin",
      uploadedDate: "2024-01-15",
      size: "2.5 MB",
      status: "Active",
      content: `
        EMPLOYEE HANDBOOK 2024
        
        Welcome to our organization. This handbook provides you with information about our company, its policies, procedures, and the rules of conduct expected from all employees.
        
        SECTION 1: COMPANY OVERVIEW
        Our company was founded in 2015 and has grown to become a leading organization in our industry. We have offices across multiple cities and employ over 500 professionals.
        
        SECTION 2: EMPLOYMENT POLICIES
        • At-Will Employment: Employment with our company is on an at-will basis.
        • Equal Opportunity: We are committed to equal employment opportunity.
        • Non-Discrimination: We do not discriminate based on race, color, religion, sex, national origin, age, disability, or any other protected status.
        
        SECTION 3: CODE OF CONDUCT
        All employees are expected to maintain professional conduct and treat colleagues with respect. Violations of this code may result in disciplinary action up to and including termination of employment.
        
        SECTION 4: ATTENDANCE AND PUNCTUALITY
        Regular attendance is essential to our operations. Employees are expected to arrive on time and work their scheduled hours.
        
        SECTION 5: CONFIDENTIALITY
        Employees are required to maintain confidentiality of all company information, trade secrets, and client data obtained during employment.
      `,
    },
    {
      id: 2,
      name: "Leave Policy Document",
      type: "PDF",
      category: "Policies",
      uploadedBy: "HR Manager",
      uploadedDate: "2024-01-10",
      size: "1.2 MB",
      status: "Active",
      content: `
        LEAVE POLICY 2024
        
        This policy outlines the leave entitlements and procedures for all employees.
        
        1. ANNUAL LEAVE
        • All full-time employees are entitled to 20 days of annual leave per calendar year.
        • Leave should be requested at least 2 weeks in advance.
        • Unused leave cannot be carried over to the next year.
        
        2. SICK LEAVE
        • Employees are entitled to 10 days of sick leave per year.
        • Medical certificate required for absences exceeding 3 consecutive days.
        
        3. CASUAL LEAVE
        • 5 days of casual leave available for personal reasons.
        • Notice period: minimum 1 week.
        
        4. MATERNITY LEAVE
        • Female employees are entitled to 6 months of maternity leave.
        • Paternity leave: 15 days for male employees.
        
        5. LEAVE APPLICATION PROCESS
        • Submit applications through the HR portal.
        • Manager approval required.
        • Final approval from HR department.
        
        6. LEAVE DURING HOLIDAYS
        • Leave taken immediately before or after company holidays may require additional documentation.
      `,
    },
    {
      id: 3,
      name: "Salary Structure 2024",
      type: "Excel",
      category: "Compensation",
      uploadedBy: "Finance Team",
      uploadedDate: "2024-01-20",
      size: "890 KB",
      status: "Active",
      content: `
        SALARY STRUCTURE 2024
        
        DESIGNATION-WISE SALARY RANGES:
        
        Executive Level:
        • Chief Executive Officer: ₹25,00,000 - ₹35,00,000
        • Chief Financial Officer: ₹20,00,000 - ₹28,00,000
        • Chief Technology Officer: ₹20,00,000 - ₹28,00,000
        
        Senior Management:
        • Senior Manager: ₹12,00,000 - ₹18,00,000
        • Senior Consultant: ₹10,00,000 - ₹15,00,000
        
        Middle Management:
        • Manager: ₹8,00,000 - ₹12,00,000
        • Consultant: ₹6,00,000 - ₹10,00,000
        
        Junior Level:
        • Associate: ₹4,00,000 - ₹6,00,000
        • Executive: ₹3,00,000 - ₹5,00,000
        
        BENEFITS PACKAGE:
        • Health Insurance: Covered for employee and family
        • Retirement Benefits: 5% employer contribution
        • Performance Bonus: Up to 2 months salary
        • Stock Options: Eligible after 1 year
      `,
    },
    {
      id: 4,
      name: "Code of Conduct",
      type: "PDF",
      category: "Policies",
      uploadedBy: "HR Admin",
      uploadedDate: "2024-01-05",
      size: "1.8 MB",
      status: "Active",
      content: `
        CODE OF CONDUCT
        
        PURPOSE:
        This Code of Conduct establishes the ethical standards and professional expectations for all employees.
        
        CORE VALUES:
        • Integrity: Act with honesty and transparency in all dealings.
        • Respect: Treat all individuals with dignity and professionalism.
        • Excellence: Maintain high standards in all work.
        • Accountability: Take responsibility for your actions.
        
        PROFESSIONAL BEHAVIOR:
        1. Workplace Conduct
           - Maintain a professional demeanor at all times.
           - Avoid harassment, bullying, or discrimination.
           - Respect the dignity and privacy of colleagues.
        
        2. Conflicts of Interest
           - Disclose any potential conflicts to your manager.
           - Recuse yourself from decisions involving conflicts.
        
        3. Use of Company Resources
           - Use company property only for business purposes.
           - Protect company assets and information.
        
        4. Violations and Disciplinary Action
           - Minor violations may result in warnings.
           - Serious violations may result in suspension or termination.
      `,
    },
    {
      id: 5,
      name: "Training Schedule Q1",
      type: "Word",
      category: "Training",
      uploadedBy: "L&D Team",
      uploadedDate: "2024-01-18",
      size: "560 KB",
      status: "Active",
      content: `
        TRAINING SCHEDULE - Q1 2024
        
        JANUARY:
        Week 1: Leadership Development Program
        - Duration: 3 days
        - Participant: All managers and above
        - Venue: Corporate Office
        
        Week 2: Technical Skills Workshop
        - Focus: Latest technologies and tools
        - Duration: 5 days
        - Open for all interested employees
        
        FEBRUARY:
        Week 1: Communication Skills Training
        - Duration: 2 days
        - Target: Customer-facing teams
        
        Week 3: Project Management Certification
        - Duration: 4 weeks
        - Certification: PMP/CAPM
        
        MARCH:
        Week 1: Compliance and Ethics Training
        - Mandatory for all employees
        - Duration: 1 day
        
        Week 2: Advanced Excel Workshop
        - Duration: 3 days
        - Target: Finance and operations teams
        
        Week 4: Team Building Event
        - Off-site activity
        - All departments
      `,
    },
    {
      id: 6,
      name: "Performance Appraisal Form",
      type: "PDF",
      category: "Forms",
      uploadedBy: "HR Manager",
      uploadedDate: "2024-01-12",
      size: "730 KB",
      status: "Active",
      content: `
        PERFORMANCE APPRAISAL FORM
        
        EMPLOYEE INFORMATION:
        Name: ________________
        Employee ID: ________________
        Department: ________________
        Position: ________________
        Appraisal Period: ________________
        
        PERFORMANCE METRICS:
        
        1. Job Knowledge & Skills (1-5 scale)
           Rating: _____
           Comments: ___________________________________________
        
        2. Quality of Work (1-5 scale)
           Rating: _____
           Comments: ___________________________________________
        
        3. Productivity & Efficiency (1-5 scale)
           Rating: _____
           Comments: ___________________________________________
        
        4. Communication & Teamwork (1-5 scale)
           Rating: _____
           Comments: ___________________________________________
        
        5. Initiative & Creativity (1-5 scale)
           Rating: _____
           Comments: ___________________________________________
        
        OVERALL RATING: _____/5
        
        STRENGTHS:
        ________________________________________________________
        
        AREAS FOR IMPROVEMENT:
        ________________________________________________________
        
        GOALS FOR NEXT PERIOD:
        ________________________________________________________
        
        Manager Signature: ________________  Date: ____________
        Employee Signature: ________________  Date: ____________
      `,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    category: "Policies",
    description: "",
    file: null,
  });

  const categories = [
    "All",
    "Policies",
    "Compensation",
    "Training",
    "Forms",
    "Compliance",
  ];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Download functionality
  const handleDownload = (doc) => {
    // Create a blob from the document content
    const element = document.createElement("a");
    const file = new Blob([doc.content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${doc.name}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file: file,
      });
    }
  };

  // Handle form input change
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setUploadForm({
      ...uploadForm,
      [name]: value,
    });
  };

  // Upload new document
  const handleUpload = () => {
    if (!uploadForm.title || !uploadForm.category || !uploadForm.file) {
      alert("Please fill all fields and select a file");
      return;
    }

    // Create new document object
    const newDoc = {
      id: documents.length + 1,
      name: uploadForm.title,
      type: uploadForm.file.name.split(".").pop().toUpperCase(),
      category: uploadForm.category,
      uploadedBy: "Current User",
      uploadedDate: new Date().toISOString().split("T")[0],
      size: (uploadForm.file.size / 1024 / 1024).toFixed(2) + " MB",
      status: "Active",
      content: uploadForm.description,
    };

    // Add to documents list
    setDocuments([...documents, newDoc]);

    // Reset form and close modal
    setUploadForm({
      title: "",
      category: "Policies",
      description: "",
      file: null,
    });
    setShowUploadModal(false);

    alert(`Document "${uploadForm.title}" uploaded successfully!`);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this document?")) {
      setDocuments(documents.filter((doc) => doc.id !== id));
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case "PDF":
        return "📄";
      case "EXCEL":
      case "XLS":
      case "XLSX":
        return "📊";
      case "WORD":
      case "DOC":
      case "DOCX":
        return "📝";
      case "TXT":
        return "📋";
      default:
        return "📎";
    }
  };

  return (
    <div className="documents-page">
      {/* Header */}
      <div className="documents-header">
        <div>
          <h1>HR Documents</h1>
          <p>Manage and organize all HR-related documents</p>
        </div>
        <button className="upload-btn" onClick={() => setShowUploadModal(true)}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          Upload Document
        </button>
      </div>

      {/* Search and Filter */}
      <div className="documents-controls">
        <div className="search-box">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category}
              className={`filter-btn ${selectedCategory === category ? "active" : ""}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="documents-grid">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="doc-header">
                <div className="doc-icon">{getFileIcon(doc.type)}</div>
                <span className="doc-type">{doc.type}</span>
              </div>

              <div className="doc-content">
                <h3>{doc.name}</h3>
                <p className="doc-category">{doc.category}</p>
              </div>

              <div className="doc-meta">
                <div className="meta-item">
                  <span className="meta-label">Uploaded By</span>
                  <span className="meta-value">{doc.uploadedBy}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Date</span>
                  <span className="meta-value">{doc.uploadedDate}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Size</span>
                  <span className="meta-value">{doc.size}</span>
                </div>
              </div>

              <div className="doc-status">
                <span className={`status-badge ${doc.status.toLowerCase()}`}>
                  {doc.status}
                </span>
              </div>

              <div className="doc-actions">
                <button
                  className="action-btn download"
                  onClick={() => handleDownload(doc)}
                  title="Download"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>
                <button
                  className="action-btn view"
                  onClick={() => setViewingDocument(doc)}
                  title="View"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(doc.id)}
                  title="Delete"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-documents">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <p>No documents found</p>
            <span>Try adjusting your search or filters</span>
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="modal-overlay" onClick={() => setViewingDocument(null)}>
          <div className="viewer-modal" onClick={(e) => e.stopPropagation()}>
            <div className="viewer-header">
              <div>
                <h2>{viewingDocument.name}</h2>
                <p>{viewingDocument.category}</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setViewingDocument(null)}
              >
                ×
              </button>
            </div>

            <div className="viewer-content">
              <div className="document-preview">
                <pre>{viewingDocument.content}</pre>
              </div>
            </div>

            <div className="viewer-footer">
              <div className="doc-info">
                <span>📁 {viewingDocument.type}</span>
                <span>👤 {viewingDocument.uploadedBy}</span>
                <span>📅 {viewingDocument.uploadedDate}</span>
                <span>💾 {viewingDocument.size}</span>
              </div>
              <button
                className="download-btn"
                onClick={() => {
                  handleDownload(viewingDocument);
                  setViewingDocument(null);
                }}
              >
                Download Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowUploadModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Document</h2>
              <button
                className="modal-close"
                onClick={() => setShowUploadModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="upload-area">
                <input
                  type="file"
                  id="file-input"
                  onChange={handleFileChange}
                  className="file-input-hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.ppt,.pptx"
                />
                <label htmlFor="file-input" className="upload-label">
                  <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  <p>Drag and drop your file here</p>
                  <span>or click to browse</span>
                  {uploadForm.file && (
                    <div className="file-selected">
                      ✓ Selected: {uploadForm.file.name}
                    </div>
                  )}
                </label>
              </div>

              <div className="upload-form">
                <div className="form-group">
                  <label>Document Title *</label>
                  <input
                    type="text"
                    name="title"
                    placeholder="Enter document title"
                    value={uploadForm.title}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={uploadForm.category}
                    onChange={handleFormChange}
                  >
                    <option value="Policies">Policies</option>
                    <option value="Compensation">Compensation</option>
                    <option value="Training">Training</option>
                    <option value="Forms">Forms</option>
                    <option value="Compliance">Compliance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    placeholder="Enter document description (optional)"
                    rows="4"
                    value={uploadForm.description}
                    onChange={handleFormChange}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button className="btn-upload" onClick={handleUpload}>
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Documents;
