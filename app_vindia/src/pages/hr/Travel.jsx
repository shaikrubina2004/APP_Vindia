import React, { useState, useRef } from "react";
//import "./Travel.css";
import {
  MoreHorizontal,
  Bell,
  Search,
  Plane,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  FileText,
  Briefcase,
  CreditCard,
  Building2,
  User,
  Utensils,
  BedDouble,
  Upload,
  X,
} from "lucide-react";

// paymentMode: "hr"   → HR books everything, HR enters the amounts
// paymentMode: "self" → Employee paid out of pocket, just uploads receipts
const requests = [
  {
    id: 1,
    employee: "Sarah Johnson",
    department: "Marketing",
    amount: "$1,240",
    trip: "New York Business Summit",
    status: "Pending",
    date: "12 Feb 2026",
    budgetType: "company",
    paymentMode: "self",
    expenses: {
      travel: { amount: "$620" },
      food: { amount: "$180" },
      accommodation: { amount: "$440" },
    },
    receipts: ["receipt-ny-summit-1.jpg", "receipt-ny-summit-2.pdf"],
    color: "card-yellow",
  },
  {
    id: 2,
    employee: "Daniel Smith",
    department: "Finance",
    amount: "$890",
    trip: "Client Meeting - Chicago",
    status: "Approved",
    date: "09 Feb 2026",
    budgetType: "project",
    paymentMode: "hr",
    expenses: {
      travel: { amount: "$490" },
      food: { amount: "$150" },
      accommodation: { amount: "$250" },
    },
    receipts: null,
    color: "card-purple",
  },
  {
    id: 3,
    employee: "Emma Brown",
    department: "HR",
    amount: "$540",
    trip: "Training Program",
    status: "Rejected",
    date: "07 Feb 2026",
    budgetType: "company",
    paymentMode: "self",
    expenses: {
      travel: { amount: "$200" },
      food: { amount: "$90" },
      accommodation: { amount: "$250" },
    },
    receipts: ["training-receipt.pdf"],
    color: "card-light",
  },
  {
    id: 4,
    employee: "Michael Lee",
    department: "Operations",
    amount: "$1,760",
    trip: "Operations Conference",
    status: "Pending",
    date: "14 Feb 2026",
    budgetType: "project",
    paymentMode: "hr",
    expenses: {
      travel: { amount: "$860" },
      food: { amount: "$300" },
      accommodation: { amount: "$600" },
    },
    receipts: null,
    color: "card-purple",
  },
  {
    id: 5,
    employee: "Sophia Walker",
    department: "Sales",
    amount: "$980",
    trip: "Sales Expo 2026",
    status: "Approved",
    date: "10 Feb 2026",
    budgetType: "company",
    paymentMode: "self",
    expenses: {
      travel: { amount: "$380" },
      food: { amount: "$200" },
      accommodation: { amount: "$400" },
    },
    receipts: ["expo-tickets.jpg"],
    color: "card-yellow",
  },
  {
    id: 6,
    employee: "James Wilson",
    department: "Tech",
    amount: "$2,100",
    trip: "Developer Conference",
    status: "Pending",
    date: "15 Feb 2026",
    budgetType: "project",
    paymentMode: "hr",
    expenses: {
      travel: { amount: "$900" },
      food: { amount: "$400" },
      accommodation: { amount: "$800" },
    },
    receipts: null,
    color: "card-light",
  },
];

const getStatusIcon = (status) => {
  switch (status) {
    case "Approved":
      return <CheckCircle size={13} />;
    case "Rejected":
      return <XCircle size={13} />;
    default:
      return <Clock size={13} />;
  }
};

const expenseConfig = {
  travel: { icon: Plane, label: "Travel", iconClass: "travel" },
  food: { icon: Utensils, label: "Food & Meals", iconClass: "food" },
  accommodation: {
    icon: BedDouble,
    label: "Accommodation",
    iconClass: "accommodation",
  },
};

// ─── Upload zone ─────────────────────────────────────────────────────────────

const UploadZone = ({ label, uploadedFiles, onUpload }) => {
  const inputRef = useRef();

  const handleFiles = (files) => {
    const valid = Array.from(files).filter((f) => f.size < 10 * 1024 * 1024);
    if (valid.length) onUpload(valid);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      <label
        className="receipt-upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="upload-icon">
          <Upload size={15} />
        </div>
        <div className="upload-text">
          <p>Attach receipt for {label}</p>
          <small>JPG, PNG or PDF · max 10MB each</small>
        </div>
      </label>

      {uploadedFiles.length > 0 && (
        <div className="receipts-list">
          {uploadedFiles.map((file, i) => (
            <div key={i} className="receipt-item">
              <FileText size={14} />
              <span className="receipt-name">{file.name}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Modal ───────────────────────────────────────────────────────────────────

const RequestDetailModal = ({ request, onClose }) => {
  const isHR = request.paymentMode === "hr";
  const isSelf = request.paymentMode === "self";

  // HR mode: editable amounts pre-filled from data
  const [hrAmounts, setHrAmounts] = useState(() => {
    const init = {};
    Object.entries(request.expenses).forEach(([key, info]) => {
      init[key] = info.amount.replace(/[^0-9.]/g, "");
    });
    return init;
  });

  // Self mode: per-expense uploaded files
  const [uploads, setUploads] = useState({
    travel: [],
    food: [],
    accommodation: [],
  });
  const addUpload = (key, files) =>
    setUploads((prev) => ({ ...prev, [key]: [...prev[key], ...files] }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-head">
          <div>
            <h3>{request.trip}</h3>
            <p>
              #{String(request.id).padStart(4, "0")} · {request.date}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Employee */}
          <div>
            <div className="section-label">Employee</div>
            <div className="employee-row">
              <div className="avatar-lg">{request.employee.charAt(0)}</div>
              <div>
                <div className="name">{request.employee}</div>
                <div className="dept">{request.department}</div>
              </div>
            </div>
          </div>

          {/* Amount + Status */}
          <div>
            <div className="section-label">Total Amount</div>
            <div className="amount-row">
              <span className="amount-lg">{request.amount}</span>
              <span className={`status-lg ${request.status.toLowerCase()}`}>
                {getStatusIcon(request.status)}
                {request.status}
              </span>
            </div>
          </div>

          {/* Budget Type */}
          <div>
            <div className="section-label">Budget Type</div>
            <div className="type-tabs">
              <div
                className={`type-tab ${request.budgetType === "company" ? "active company" : ""}`}
              >
                <CreditCard size={14} /> Company Expense
              </div>
              <div
                className={`type-tab ${request.budgetType === "project" ? "active project" : ""}`}
              >
                <Briefcase size={14} /> Project Budget
              </div>
            </div>
          </div>

          {/* Payment Mode Banner */}
          <div
            className={`payment-mode-banner ${isHR ? "mode-hr" : "mode-self"}`}
          >
            {isHR ? (
              <>
                <Building2 size={15} />
                <span>HR / Company books &amp; pays for all expenses</span>
              </>
            ) : (
              <>
                <User size={15} />
                <span>
                  Employee self-paid — upload receipts for reimbursement
                </span>
              </>
            )}
          </div>

          {/* Expense Breakdown */}
          <div>
            <div className="section-label">Expense Breakdown</div>
            <div className="expense-breakdown">
              {Object.entries(request.expenses).map(([key, info]) => {
                const cfg = expenseConfig[key];
                const IconComp = cfg.icon;

                return (
                  <div key={key} className="expense-row">
                    <div className="expense-row-header">
                      <div className="expense-label">
                        <div className={`expense-icon ${cfg.iconClass}`}>
                          <IconComp size={14} />
                        </div>
                        {cfg.label}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.625rem",
                        }}
                      >
                        {/* HR → editable input. Self → static amount */}
                        {isHR ? (
                          <div className="amount-input-wrap">
                            <span className="amount-input-prefix">$</span>
                            <input
                              className="amount-input"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              value={hrAmounts[key] ?? ""}
                              onChange={(e) =>
                                setHrAmounts((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        ) : (
                          <span className="expense-amount-static">
                            {info.amount}
                          </span>
                        )}

                        <span
                          className={`payment-pill ${isHR ? "company-paid" : "self"}`}
                        >
                          {isHR ? (
                            <>
                              <Building2 size={10} /> HR / Company
                            </>
                          ) : (
                            <>
                              <User size={10} /> Self-paid
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Upload only for self-paid */}
                    {isSelf && (
                      <UploadZone
                        label={cfg.label}
                        uploadedFiles={uploads[key]}
                        onUpload={(files) => addUpload(key, files)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Previously attached receipts (self-paid only) */}
          {isSelf && request.receipts && request.receipts.length > 0 && (
            <div>
              <div className="section-label">
                Previously Attached ({request.receipts.length})
              </div>
              <div className="receipts-list">
                {request.receipts.map((receipt, i) => (
                  <div key={i} className="receipt-item">
                    <FileText size={14} />
                    <span className="receipt-name">{receipt}</span>
                    <button className="receipt-download">
                      <Download size={11} /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <div className="action-group">
            <button className="btn-primary">Approve</button>
            <button className="btn-danger">Reject</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

const TravelExpenseDashboard = () => {
  const [selectedRequest, setSelectedRequest] = useState(null);

  return (
    <div className="dashboard-container">
      <div className="top-bar">
        <div>
          <h1>Travel Expense Requests</h1>
          <p>Manage employee travel reimbursements</p>
        </div>
        <div className="top-actions">
          <div className="search-box">
            <Search size={15} />
            <input type="text" placeholder="Search requests..." />
          </div>
          <button className="icon-btn" aria-label="Notifications">
            <Bell size={16} />
          </button>
        </div>
      </div>

      <div className="stats-grid">
        {[
          { label: "Total Requests", value: "132" },
          { label: "Pending Approval", value: "34" },
          { label: "Approved", value: "76" },
          { label: "Rejected", value: "22" },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <h2>{s.value}</h2>
          </div>
        ))}
      </div>

      <div className="requests-grid">
        {requests.map((request) => (
          <div
            className={`request-card ${request.color}`}
            key={request.id}
            onClick={() => setSelectedRequest(request)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && setSelectedRequest(request)}
            aria-label={`View details for ${request.trip}`}
          >
            <div className="card-top">
              <Plane size={16} />
              <MoreHorizontal size={16} />
            </div>
            <h3>{request.trip}</h3>
            <div className="amount">{request.amount}</div>
            <div className="employee-info">
              <div className="avatar">{request.employee.charAt(0)}</div>
              <div>
                <h4>{request.employee}</h4>
                <p>{request.department}</p>
              </div>
            </div>
            <div className="card-footer">
              <span className={`status ${request.status.toLowerCase()}`}>
                {getStatusIcon(request.status)}
                {request.status}
              </span>
              <small>{request.date}</small>
            </div>
          </div>
        ))}
      </div>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
    </div>
  );
};

export default TravelExpenseDashboard;
