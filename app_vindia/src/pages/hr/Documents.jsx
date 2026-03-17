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
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  const handleDownload = (docName) => {
    alert(`Downloading: ${docName}`);
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
      case "Excel":
        return "📊";
      case "Word":
        return "📝";
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
                  onClick={() => handleDownload(doc.name)}
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
                <button className="action-btn view" title="View">
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
                <p>Drag and drop your files here</p>
                <span>or click to browse</span>
              </div>

              <div className="upload-form">
                <div className="form-group">
                  <label>Document Title</label>
                  <input type="text" placeholder="Enter document title" />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select>
                    <option>Select Category</option>
                    <option>Policies</option>
                    <option>Compensation</option>
                    <option>Training</option>
                    <option>Forms</option>
                    <option>Compliance</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Enter document description"
                    rows="4"
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
              <button
                className="btn-upload"
                onClick={() => {
                  alert("Document uploaded successfully!");
                  setShowUploadModal(false);
                }}
              >
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
