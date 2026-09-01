import React, { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";

import "../../styles/ApprovalRequests.css";

const STATUS_LABELS = {
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  revision: "Revision Required",
};

const normalizeRole = (role) =>
  String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

/* =========================================================
   ATTACHMENT HELPERS
========================================================= */

const getBackendBaseUrl = () => {
  // If your axios baseURL is http://localhost:5000/api,
  // this removes /api and gives http://localhost:5000
  const base =
    api?.defaults?.baseURL ||
    "http://localhost:5000/api";

  return base.replace(/\/api\/?$/, "");
};

const buildFileUrl = (file) => {
  if (!file) return null;

  // String attachment
  if (typeof file === "string") {
    if (
      file.startsWith("http://") ||
      file.startsWith("https://")
    ) {
      return file;
    }

    if (file.startsWith("/")) {
      return `${getBackendBaseUrl()}${file}`;
    }

    return `${getBackendBaseUrl()}/uploads/${file}`;
  }

  // Object attachment
  const rawUrl =
    file.url ||
    file.file_url ||
    file.fileUrl ||
    file.path ||
    file.file_path ||
    file.filePath ||
    file.location ||
    file.src ||
    file.filename ||
    file.name;

  if (!rawUrl) return null;

  if (
    rawUrl.startsWith("http://") ||
    rawUrl.startsWith("https://")
  ) {
    return rawUrl;
  }

  if (rawUrl.startsWith("/")) {
    return `${getBackendBaseUrl()}${rawUrl}`;
  }

  return `${getBackendBaseUrl()}/uploads/${rawUrl}`;
};

const getFileName = (file) => {
  if (!file) return "Attachment";

  if (typeof file === "string") {
    return file.split("/").pop() || "Attachment";
  }

  return (
    file.originalname ||
    file.original_name ||
    file.filename ||
    file.name ||
    "Attachment"
  );
};

const getMimeType = (file) => {
  if (!file || typeof file === "string") return "";

  return (
    file.mimetype ||
    file.mime_type ||
    file.mimeType ||
    file.type ||
    ""
  ).toLowerCase();
};

const isImageFile = (file) => {
  const mime = getMimeType(file);
  const name = getFileName(file).toLowerCase();

  return (
    mime.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)
  );
};

const isVideoFile = (file) => {
  const mime = getMimeType(file);
  const name = getFileName(file).toLowerCase();

  return (
    mime.startsWith("video/") ||
    /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(name)
  );
};

const isPdfFile = (file) => {
  const mime = getMimeType(file);
  const name = getFileName(file).toLowerCase();

  return (
    mime === "application/pdf" ||
    name.endsWith(".pdf")
  );
};

const normalizeAttachments = (approval) => {
  if (!approval) return [];

  /*
    Backend may return attachments under any of these names.
  */

  const possible =
    approval.attachments ??
    approval.attachment ??
    approval.files ??
    approval.file_attachments ??
    approval.fileAttachments ??
    approval.attachment_urls ??
    approval.attachmentUrls ??
    approval.file_urls ??
    approval.fileUrls;

  if (!possible) return [];

  // Already an array
  if (Array.isArray(possible)) {
    return possible;
  }

  // JSON string from PostgreSQL
  if (typeof possible === "string") {
    try {
      const parsed = JSON.parse(possible);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      if (parsed) {
        return [parsed];
      }
    } catch {
      // Could simply be one filename/path
      return [possible];
    }
  }

  // Single object
  if (typeof possible === "object") {
    return [possible];
  }

  return [];
};

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ApprovalRequests() {
  const { user } = useAuth();

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  const currentUserRole = normalizeRole(user?.role);

  /* =========================================================
     WHO CAN REVIEW
  ========================================================= */

  const canReviewApproval = (approval) => {
    if (!user) return false;

    if (approval.status !== "pending") {
      return false;
    }

    const assignedRole = normalizeRole(
      approval.assign_to_role
    );

    return assignedRole === currentUserRole;
  };

  /* =========================================================
     LOAD APPROVALS
  ========================================================= */

  const loadApprovals = async () => {
    try {
      setLoading(true);

      const response = await api.get("/approvals");

      console.log(
        "APPROVAL REQUESTS RESPONSE:",
        response?.data
      );

      const data = Array.isArray(response?.data?.data)
        ? response.data.data
        : [];

      setApprovals(data);
    } catch (error) {
      console.error(
        "LOAD APPROVAL REQUESTS ERROR:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  /* =========================================================
     FILTER
  ========================================================= */

  const filteredApprovals = useMemo(() => {
    return approvals.filter(
      (approval) => approval.status === activeTab
    );
  }, [approvals, activeTab]);

  /* =========================================================
     COUNTS
  ========================================================= */

  const counts = {
    pending: approvals.filter(
      (a) => a.status === "pending"
    ).length,

    approved: approvals.filter(
      (a) => a.status === "approved"
    ).length,

    rejected: approvals.filter(
      (a) => a.status === "rejected"
    ).length,

    revision: approvals.filter(
      (a) => a.status === "revision"
    ).length,
  };

  /* =========================================================
     DECISION
  ========================================================= */

  const handleDecision = async (
    approval,
    status
  ) => {
    let rejectionReason = null;

    if (
      status === "rejected" ||
      status === "revision"
    ) {
      rejectionReason = window.prompt(
        status === "rejected"
          ? "Enter rejection reason:"
          : "Enter revision instructions:"
      );

      if (!rejectionReason?.trim()) {
        return;
      }
    }

    try {
      await api.patch(
        `/approvals/${approval.id}/review`,
        {
          status,
          rejection_reason:
            rejectionReason?.trim() || null,
        }
      );

      setSelectedApproval(null);

      await loadApprovals();
    } catch (error) {
      console.error(
        "APPROVAL DECISION ERROR:",
        error
      );

      alert(
        error?.response?.data?.message ||
          "Unable to update approval"
      );
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="approval-requests-page">

      {/* HEADER */}

      <div className="approval-requests-header">

        <div>
          <h1>Approval Requests</h1>

          <p>
            Review requests assigned to you and
            make a decision.
          </p>
        </div>

        <button
          className="approval-refresh-btn"
          onClick={loadApprovals}
        >
          ↻ Refresh
        </button>

      </div>


      {/* STATUS TABS */}

      <div className="approval-tabs">

        <button
          className={
            activeTab === "pending"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("pending")
          }
        >
          Pending
          <span>{counts.pending}</span>
        </button>


        <button
          className={
            activeTab === "approved"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("approved")
          }
        >
          Approved
          <span>{counts.approved}</span>
        </button>


        <button
          className={
            activeTab === "revision"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("revision")
          }
        >
          Revision
          <span>{counts.revision}</span>
        </button>


        <button
          className={
            activeTab === "rejected"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab("rejected")
          }
        >
          Rejected
          <span>{counts.rejected}</span>
        </button>

      </div>


      {/* CONTENT */}

      {loading ? (

        <div className="approval-loading">
          Loading approval requests...
        </div>

      ) : filteredApprovals.length === 0 ? (

        <div className="approval-empty">

          <div className="approval-empty-icon">
            ✓
          </div>

          <h3>
            No{" "}
            {STATUS_LABELS[
              activeTab
            ].toLowerCase()}
          </h3>

          <p>
            There are no approval requests
            in this section.
          </p>

        </div>

      ) : (

        <div className="approval-request-list">

          {filteredApprovals.map(
            (approval) => (

              <ApprovalCard
                key={approval.id}
                approval={approval}
                onOpen={() =>
                  setSelectedApproval(
                    approval
                  )
                }
                onDecision={handleDecision}
                canReview={canReviewApproval(
                  approval
                )}
              />

            )
          )}

        </div>

      )}


      {/* DETAILS MODAL */}

      {selectedApproval && (

        <ApprovalDetailsModal
          approval={selectedApproval}
          onClose={() =>
            setSelectedApproval(null)
          }
          onDecision={handleDecision}
          canReview={canReviewApproval(
            selectedApproval
          )}
        />

      )}

    </div>
  );
}


/* =========================================================
   APPROVAL CARD
========================================================= */

function ApprovalCard({
  approval,
  onOpen,
  onDecision,
  canReview,
}) {
  return (
    <div className="approval-request-card">

      <div className="approval-card-header">

        <div>

          <div className="approval-card-meta">

            <span className="approval-type">
              {approval.type}
            </span>

            <span>
              #{approval.id}
            </span>

          </div>

          <h2>
            {approval.title}
          </h2>

        </div>

        <StatusBadge
          status={approval.status}
        />

      </div>


      <div className="approval-summary">

        <Info
          label="Submitted By"
          value={
            approval.submitted_by_name ||
            `User #${approval.submitted_by}`
          }
        />

        <Info
          label="Zone"
          value={approval.zone || "—"}
        />

        <Info
          label="Activity"
          value={
            approval.activity || "—"
          }
        />

        <Info
          label="Quantity"
          value={
            approval.qty_completed != null
              ? `${approval.qty_completed} ${
                  approval.qty_unit || ""
                }`
              : "—"
          }
        />

      </div>


      {approval.description && (

        <div className="approval-card-description">

          <label>Description</label>

          <p>
            {approval.description}
          </p>

        </div>

      )}


      {/* SMALL ATTACHMENT INDICATOR */}

      {normalizeAttachments(approval).length >
        0 && (

        <div
          style={{
            marginTop: "12px",
            fontSize: "13px",
            color: "#64748b",
          }}
        >
          📎{" "}
          {normalizeAttachments(approval).length}{" "}
          attachment
          {normalizeAttachments(approval).length !==
          1
            ? "s"
            : ""}
        </div>

      )}


      <div className="approval-card-footer">

        <button
          className="approval-view-btn"
          onClick={onOpen}
        >
          View Details
        </button>


        {canReview && (

          <div className="approval-card-actions">

            <button
              className="reject-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "rejected"
                )
              }
            >
              Reject
            </button>


            <button
              className="revision-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "revision"
                )
              }
            >
              Request Revision
            </button>


            <button
              className="approve-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "approved"
                )
              }
            >
              ✓ Approve
            </button>

          </div>

        )}

      </div>

    </div>
  );
}


/* =========================================================
   DETAILS MODAL
========================================================= */

function ApprovalDetailsModal({
  approval,
  onClose,
  onDecision,
  canReview,
}) {
  const attachments =
    normalizeAttachments(approval);

  return (
    <div
      className="approval-modal-overlay"
      onClick={onClose}
    >

      <div
        className="approval-modal"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* HEADER */}

        <div className="approval-modal-header">

          <div>

            <span className="approval-type">
              {approval.type}
            </span>

            <h2>
              {approval.title}
            </h2>

          </div>

          <button
            className="approval-modal-close"
            onClick={onClose}
          >
            ×
          </button>

        </div>


        {/* BODY */}

        <div className="approval-modal-body">

          <div className="approval-detail-grid">

            <Info
              label="Request ID"
              value={`APR-${String(
                approval.id
              ).padStart(3, "0")}`}
            />

            <Info
              label="Status"
              value={
                STATUS_LABELS[
                  approval.status
                ] || approval.status
              }
            />

            <Info
              label="Submitted By"
              value={
                approval.submitted_by_name ||
                `User #${approval.submitted_by}`
              }
            />

            <Info
              label="Assigned Role"
              value={
                approval.assign_to_role
              }
            />

            <Info
              label="Zone"
              value={
                approval.zone || "—"
              }
            />

            <Info
              label="Activity"
              value={
                approval.activity || "—"
              }
            />

            <Info
              label="Quantity"
              value={
                approval.qty_completed != null
                  ? `${approval.qty_completed} ${
                      approval.qty_unit || ""
                    }`
                  : "—"
              }
            />

            <Info
              label="Submitted"
              value={
                approval.created_at
                  ? new Date(
                      approval.created_at
                    ).toLocaleString()
                  : "—"
              }
            />

          </div>


          {/* DESCRIPTION */}

          <DetailSection
            title="Description"
          >

            <p>
              {approval.description ||
                "No description provided."}
            </p>

          </DetailSection>


          {/* LINKED REFERENCES */}

          <DetailSection
            title="Linked References"
          >

            <div className="reference-list">

              <Info
                label="Task"
                value={
                  approval.linked_task ||
                  "Not linked"
                }
              />

              <Info
                label="RFI"
                value={
                  approval.linked_rfi ||
                  "Not linked"
                }
              />

              <Info
                label="Diary"
                value={
                  approval.linked_diary ||
                  "Not linked"
                }
              />

            </div>

          </DetailSection>


          {/* =================================================
              ATTACHMENTS
          ================================================= */}

          <DetailSection
            title={`Attachments${
              attachments.length
                ? ` (${attachments.length})`
                : ""
            }`}
          >

            {attachments.length === 0 ? (

              <div
                style={{
                  padding: "12px",
                  borderRadius: "8px",
                  background: "#f8fafc",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                No attachments were added
                to this approval request.
              </div>

            ) : (

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >

                {attachments.map(
                  (file, index) => {

                    const url =
                      buildFileUrl(file);

                    const fileName =
                      getFileName(file);

                    if (!url) {
                      return (
                        <div
                          key={index}
                          style={{
                            padding: "12px",
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: "8px",
                          }}
                        >
                          📎 {fileName}
                          <div
                            style={{
                              color: "#dc2626",
                              fontSize: "12px",
                              marginTop: "4px",
                            }}
                          >
                            File URL not available
                          </div>
                        </div>
                      );
                    }

                    /* IMAGE */

                    if (isImageFile(file)) {

                      return (
                        <div
                          key={index}
                          style={{
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "10px",
                          }}
                        >

                          <img
                            src={url}
                            alt={fileName}
                            style={{
                              display: "block",
                              width: "100%",
                              maxHeight: "350px",
                              objectFit: "contain",
                              borderRadius: "8px",
                              background:
                                "#f8fafc",
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display =
                                "none";
                            }}
                          />

                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "center",
                              gap: "10px",
                            }}
                          >

                            <span>
                              📎 {fileName}
                            </span>

                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="approval-view-btn"
                            >
                              Open
                            </a>

                          </div>

                        </div>
                      );
                    }

                    /* VIDEO */

                    if (isVideoFile(file)) {

                      return (
                        <div
                          key={index}
                          style={{
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "10px",
                          }}
                        >

                          <video
                            controls
                            preload="metadata"
                            style={{
                              width: "100%",
                              maxHeight: "350px",
                              borderRadius: "8px",
                              background:
                                "#000",
                            }}
                          >
                            <source
                              src={url}
                              type={
                                getMimeType(file) ||
                                undefined
                              }
                            />

                            Your browser does
                            not support video
                            playback.
                          </video>

                          <div
                            style={{
                              marginTop: "8px",
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "center",
                            }}
                          >

                            <span>
                              🎥 {fileName}
                            </span>

                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="approval-view-btn"
                            >
                              Open
                            </a>

                          </div>

                        </div>
                      );
                    }

                    /* PDF */

                    if (isPdfFile(file)) {

                      return (
                        <div
                          key={index}
                          style={{
                            border:
                              "1px solid #e2e8f0",
                            borderRadius: "10px",
                            overflow: "hidden",
                          }}
                        >

                          <iframe
                            src={url}
                            title={fileName}
                            style={{
                              width: "100%",
                              height: "400px",
                              border: "0",
                            }}
                          />

                          <div
                            style={{
                              padding: "10px",
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "center",
                            }}
                          >

                            <span>
                              📄 {fileName}
                            </span>

                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="approval-view-btn"
                            >
                              Open PDF
                            </a>

                          </div>

                        </div>
                      );
                    }

                    /* OTHER DOCUMENT */

                    return (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent:
                            "space-between",
                          gap: "12px",
                          padding: "12px 14px",
                          border:
                            "1px solid #e2e8f0",
                          borderRadius: "8px",
                          background:
                            "#f8fafc",
                        }}
                      >

                        <div>
                          <div
                            style={{
                              fontSize: "18px",
                            }}
                          >
                            📎
                          </div>

                          <strong>
                            {fileName}
                          </strong>

                        </div>

                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="approval-view-btn"
                        >
                          Open File
                        </a>

                      </div>
                    );

                  }
                )}

              </div>

            )}

          </DetailSection>


          {/* EXISTING REVISION / DECISION NOTE */}

          {approval.rejection_reason && (

            <div className="approval-existing-note">

              <strong>
                {approval.status === "revision"
                  ? "Revision Instructions"
                  : "Decision Note"}
              </strong>

              <p>
                {approval.rejection_reason}
              </p>

            </div>

          )}

        </div>


        {/* FOOTER */}

        {canReview && (

          <div className="approval-modal-footer">

            <button
              className="reject-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "rejected"
                )
              }
            >
              Reject
            </button>


            <button
              className="revision-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "revision"
                )
              }
            >
              Request Revision
            </button>


            <button
              className="approve-btn"
              onClick={() =>
                onDecision(
                  approval,
                  "approved"
                )
              }
            >
              ✓ Approve
            </button>

          </div>

        )}

      </div>

    </div>
  );
}


/* =========================================================
   SMALL COMPONENTS
========================================================= */

function Info({ label, value }) {
  return (
    <div className="approval-info">

      <label>
        {label}
      </label>

      <strong>
        {value}
      </strong>

    </div>
  );
}


function DetailSection({
  title,
  children,
}) {
  return (
    <section className="approval-detail-section">

      <h3>
        {title}
      </h3>

      {children}

    </section>
  );
}


function StatusBadge({ status }) {
  return (
    <span
      className={`approval-status-badge ${status}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}