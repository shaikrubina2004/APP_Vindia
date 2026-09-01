// src/pages/siteEngineer/ApprovalWorkflow.jsx

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "../../context/useAuth";
import api from "../../services/api";
import "../../styles/Approvalworkflow.css";

const QUEUE_KEY = "approvals:queue:v1";
const PAGE_SIZE = 8;

/* =========================================================
   APPROVAL TYPES
========================================================= */

const APPROVAL_TYPES = [
  {
    value: "work",
    label: "Work Approval",
    desc: "Completed work ready for PM / QC review",
    defaultRole: "project_manager",
    roles: ["project_manager", "qc_officer"],
  },
  {
    value: "inspection",
    label: "Inspection Request",
    desc: "Request QC inspection before proceeding",
    defaultRole: "qc_officer",
    roles: ["qc_officer", "project_manager", "architect"],
  },
  {
    value: "material",
    label: "Material Approval",
    desc: "Material on site — request QS acceptance for billing",
    defaultRole: "quantity_surveyor",
    roles: ["quantity_surveyor", "project_manager", "qc_officer"],
  },
  {
    value: "measurement",
    label: "Measurement Submission",
    desc: "Submit completed quantities to QS for verification and billing",
    defaultRole: "quantity_surveyor",
    roles: ["quantity_surveyor"],
  },
  {
    value: "method",
    label: "Method Statement",
    desc: "Approval of construction method / sequence",
    defaultRole: "project_manager",
    roles: ["project_manager", "architect", "structural_engineer"],
  },
];

/* =========================================================
   ROLE LABELS
========================================================= */

const ROLE_LABELS = {
  project_manager: "Project Manager",
  qc_officer: "QC Officer",
  quantity_surveyor: "Quantity Surveyor (QS)",
  architect: "Architect",
  structural_engineer: "Structural Engineer",
};

/* =========================================================
   STATUS
========================================================= */

const STATUS_CFG = {
  pending: {
    label: "Pending",
    bg: "#FAEEDA",
    color: "#633806",
    border: "#EF9F27",
  },

  approved: {
    label: "Approved",
    bg: "#E1F5EE",
    color: "#085041",
    border: "#5DCAA5",
  },

  rejected: {
    label: "Rejected",
    bg: "#FCEBEB",
    color: "#791F1F",
    border: "#E8A0A0",
  },

  revision: {
    label: "Revision Required",
    bg: "#F3EDF8",
    color: "#4A1A6E",
    border: "#C49FDC",
  },
};

/* =========================================================
   BLANK FORM
========================================================= */

const BLANK = {
  type: "work",
  title: "",
  description: "",
  zone: "",
  activity: "",
  linked_task: "",
  linked_rfi: "",
  linked_diary: "",
  qty_completed: "",
  qty_unit: "sqft",
  assign_to_role: "project_manager",
  attachments: [],
};

/* =========================================================
   LOCAL STORAGE
========================================================= */

const ls = {
  load: (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  },

  save: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};

/* =========================================================
   OFFLINE QUEUE
========================================================= */

function enqueue(payload) {
  const queue = ls.load(QUEUE_KEY) || [];

  queue.push({
    id: `q_${Date.now()}`,
    payload,
    createdAt: new Date().toISOString(),
  });

  ls.save(QUEUE_KEY, queue);
}

async function flushQueue() {
  const queue = ls.load(QUEUE_KEY);

  if (!Array.isArray(queue) || !queue.length) return;

  const remaining = [];

  for (const item of queue) {
    try {
      const response = await api.post("/approvals", item.payload);

      if (!response || (response.status && response.status >= 400)) {
        throw new Error();
      }
    } catch {
      remaining.push(item);
    }
  }

  ls.save(QUEUE_KEY, remaining);
}

/* =========================================================
   HELPERS
========================================================= */

function stableKey(item) {
  return item?.id != null
    ? String(item.id)
    : `${item?.title || ""}|${item?.type || ""}|${item?.createdAt || ""}`;
}

function validate(form) {
  const errors = {};

  if (!form.title || form.title.trim().length < 3) {
    errors.title = "Title required (min 3 chars)";
  }

  if (!form.type) {
    errors.type = "Select approval type";
  }

  if (
    (form.type === "measurement" || form.type === "material") &&
    !form.qty_completed
  ) {
    errors.qty_completed = "Enter the quantity for QS verification";
  }

  return errors;
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ s }) {
  const config = STATUS_CFG[s] || STATUS_CFG.pending;

  return (
    <span
      className="aw-badge"
      style={{
        background: config.bg,
        color: config.color,
        border: `0.5px solid ${config.border}`,
      }}
    >
      {config.label}
    </span>
  );
}

/* =========================================================
   ATTACHMENT HELPERS
========================================================= */

function getAttachmentUrl(attachment) {
  if (!attachment) return "";

  /*
    Backend stores:
    /uploads/filename.ext

    api.defaults.baseURL may be:
    http://localhost:5000/api
  */

  const filePath =
    attachment.path ||
    attachment.url ||
    (attachment.filename
      ? `/uploads/${attachment.filename}`
      : "");

  if (!filePath) return "";

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  const baseURL = api?.defaults?.baseURL || "";

  if (baseURL) {
    const cleanBase = baseURL.replace(/\/api\/?$/, "");
    return `${cleanBase}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
  }

  /*
    Development fallback.
    Change this if your backend is hosted somewhere else.
  */

  return `http://localhost:5000${filePath.startsWith("/") ? "" : "/"}${filePath}`;
}

function getAttachmentIcon(attachment) {
  const type = attachment?.mimetype || "";
  const name = attachment?.name || attachment?.filename || "";

  if (type.startsWith("image/")) return "🖼️";
  if (type.startsWith("video/")) return "🎥";
  if (type.includes("pdf") || name.toLowerCase().endsWith(".pdf")) {
    return "📄";
  }
  if (
    type.includes("spreadsheet") ||
    type.includes("excel") ||
    /\.(xls|xlsx|csv)$/i.test(name)
  ) {
    return "📊";
  }
  if (
    type.includes("word") ||
    /\.(doc|docx)$/i.test(name)
  ) {
    return "📝";
  }
  if (/\.(dwg|dxf)$/i.test(name)) {
    return "📐";
  }

  return "📎";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ApprovalWorkflow() {
  const { user } = useAuth();

  /* -------------------------------------------------------
     Notifications
  ------------------------------------------------------- */

  let push = () => {};

  try {
    const ctx = require("../../context/Notificationcontext");

    if (ctx?.useNotifications) {
      const notification = ctx.useNotifications();
      push = notification?.push || (() => {});
    }
  } catch {
    /* Notification provider not available */
  }

  /* -------------------------------------------------------
     State
  ------------------------------------------------------- */

  const [form, setForm] = useState({
    ...BLANK,
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [submitting, setSub] = useState(false);

  const [approvals, setApprovals] = useState([]);
  const [listLoading, setLL] = useState(true);

  const [filterType, setFT] = useState("all");
  const [filterStat, setFS] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const alive = useRef(true);

  /* =======================================================
     LOAD
  ======================================================= */

  useEffect(() => {
    alive.current = true;

    loadList();
    flushQueue().catch(() => {});

    return () => {
      alive.current = false;
    };
  }, []);

  async function loadList() {
    setLL(true);

    try {
      const response = await api.get("/approvals");

      if (!alive.current) return;

      const raw = Array.isArray(response?.data?.data)
        ? response.data.data.slice().reverse()
        : [];

      const seen = new Set();

      setApprovals(
        raw.filter((item) => {
          const key = stableKey(item);

          if (seen.has(key)) return false;

          seen.add(key);
          return true;
        })
      );
    } catch (error) {
      console.error(
        "LOAD APPROVALS ERROR:",
        error?.response?.data || error.message
      );
    } finally {
      if (alive.current) {
        setLL(false);
      }
    }
  }

  /* =======================================================
     REVIEW APPROVAL
  ======================================================= */

  const updateApprovalStatus = useCallback(
    async (approvalId, newStatus) => {
      try {
        const payload = {
          status: newStatus,
        };

        if (newStatus === "rejected" || newStatus === "revision") {
          const reason = window.prompt(
            newStatus === "rejected"
              ? "Enter rejection reason:"
              : "Enter what needs to be revised:"
          );

          if (!reason || !reason.trim()) {
            return;
          }

          payload.rejection_reason = reason.trim();
        }

        await api.patch(
          `/approvals/${approvalId}/review`,
          payload
        );

        setApprovals((previous) =>
          previous.map((item) =>
            String(item.id) === String(approvalId)
              ? {
                  ...item,
                  status: newStatus,
                  rejection_reason:
                    payload.rejection_reason || null,
                }
              : item
          )
        );

        try {
          push(
            `Approval ${newStatus}: "${
              approvals.find(
                (a) =>
                  String(a.id) === String(approvalId)
              )?.title || ""
            }"`,
            "approval"
          );
        } catch {}
      } catch (error) {
        console.error(
          "UPDATE APPROVAL STATUS ERROR:",
          error
        );

        alert(
          error?.response?.data?.message ||
            "Failed to update approval status"
        );
      }
    },
    [approvals, push]
  );

  /* =======================================================
     FORM HELPERS
  ======================================================= */

  const setF = useCallback((key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setErrors((previous) => {
      const copy = {
        ...previous,
      };

      delete copy[key];

      return copy;
    });

    setStatus("");
  }, []);

  /* =======================================================
     TYPE CHANGE
  ======================================================= */

  const handleTypeChange = useCallback((typeValue) => {
    const typeConfig = APPROVAL_TYPES.find(
      (type) => type.value === typeValue
    );

    setForm((previous) => ({
      ...previous,
      type: typeValue,
      assign_to_role:
        typeConfig?.defaultRole || "project_manager",
    }));

    setErrors((previous) => {
      const copy = {
        ...previous,
      };

      delete copy.type;

      return copy;
    });

    setStatus("");
  }, []);

  /* =======================================================
     FILE HANDLING
  ======================================================= */

  const handleFiles = useCallback((event) => {
    const selectedFiles = Array.from(
      event.target.files || []
    );

    console.log(
      "SELECTED APPROVAL FILES:",
      selectedFiles
    );

    if (!selectedFiles.length) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      attachments: [
        ...(previous.attachments || []),
        ...selectedFiles,
      ],
    }));

    /*
      Allows selecting the same file again later.
    */
    event.target.value = "";
  }, []);

  const removeFile = useCallback((index) => {
    setForm((previous) => ({
      ...previous,
      attachments: previous.attachments.filter(
        (_, i) => i !== index
      ),
    }));
  }, []);

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = useCallback(
    async (event) => {
      event?.preventDefault();

      if (submitting) return;

      const validationErrors = validate(form);

      setErrors(validationErrors);

      if (Object.keys(validationErrors).length) {
        setStatus("Fix errors above");
        return;
      }

      setSub(true);
      setStatus("Submitting…");

      const optimisticApproval = {
        id: `local_${Date.now()}`,
        ...form,
        status: "pending",
        createdAt: new Date().toISOString(),
        optimistic: true,
      };

      setApprovals((previous) => [
        optimisticApproval,
        ...previous,
      ]);

      try {
        let response;

        /* -------------------------------------------------
           WITH ATTACHMENTS
        ------------------------------------------------- */

        if (form.attachments?.length) {
          const formData = new FormData();

          [
            "type",
            "title",
            "description",
            "zone",
            "activity",
            "linked_task",
            "linked_rfi",
            "linked_diary",
            "assign_to_role",
            "qty_completed",
            "qty_unit",
          ].forEach((key) => {
            formData.append(
              key,
              form[key] || ""
            );
          });

          /*
            IMPORTANT:
            The field name MUST be "attachments"
            because backend Multer expects:

            upload.array("attachments", 10)
          */

          form.attachments.forEach((file) => {
            formData.append(
              "attachments",
              file,
              file.name
            );
          });

          console.log(
            "========== FRONTEND APPROVAL UPLOAD =========="
          );

          for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
              console.log(
                key,
                value.name,
                value.type,
                value.size
              );
            } else {
              console.log(key, value);
            }
          }

          console.log(
            "==============================================="
          );

          /*
            DO NOT manually set Content-Type.

            Axios/browser will automatically add:

            multipart/form-data;
            boundary=...
          */

          /*
            IMPORTANT:
            Send FormData directly with fetch.
            Do NOT manually set Content-Type because the browser
            must generate the multipart boundary.
          */
          const token = localStorage.getItem("token");

          const uploadResponse = await fetch(
            "http://localhost:5000/api/approvals",
            {
              method: "POST",
              headers: {
                ...(token
                  ? { Authorization: `Bearer ${token}` }
                  : {}),
              },
              body: formData,
            }
          );

          const uploadData = await uploadResponse
            .json()
            .catch(() => ({}));

          if (!uploadResponse.ok) {
            throw new Error(
              uploadData?.message ||
                "Failed to upload approval request"
            );
          }

          response = {
            status: uploadResponse.status,
            data: uploadData,
          };
        }

        /* -------------------------------------------------
           WITHOUT ATTACHMENTS
        ------------------------------------------------- */

        else {
          const {
            attachments: _attachments,
            ...payload
          } = form;

          response = await api.post(
            "/approvals",
            payload
          );
        }

        if (
          !response ||
          (response.status &&
            response.status >= 400)
        ) {
          throw new Error(
            "Approval request failed"
          );
        }

        try {
          push(
            `Approval request submitted: "${form.title}"`,
            "approval",
            {
              linked_ref:
                form.linked_task || "",
            }
          );
        } catch {}

        await loadList();

        setForm({
          ...BLANK,
        });

        setStatus(
          "Approval request submitted ✓"
        );
      } catch (error) {
        console.error(
          "APPROVAL SUBMIT ERROR:",
          error?.response?.data ||
            error.message
        );

        /*
          Do not queue File objects in localStorage.
          Browser File objects cannot be reliably serialized.
        */

        if (!form.attachments?.length) {
          enqueue(form);
        }

        setApprovals((previous) =>
          previous.map((item) =>
            item.id ===
            optimisticApproval.id
              ? {
                  ...item,
                  queued: true,
                }
              : item
          )
        );

        setStatus(
          "Upload failed — please try again"
        );

        alert(
          error?.response?.data?.message ||
            "Failed to submit approval request"
        );
      } finally {
        if (alive.current) {
          setSub(false);
        }
      }
    },
    [form, submitting, push]
  );

  /* =======================================================
     FILTERING
  ======================================================= */

  const filtered = useMemo(() => {
    let list = approvals.slice();

    if (search.trim()) {
      const query = search.toLowerCase();

      list = list.filter(
        (item) =>
          (item.title || "")
            .toLowerCase()
            .includes(query) ||
          (item.zone || "")
            .toLowerCase()
            .includes(query)
      );
    }

    if (filterType !== "all") {
      list = list.filter(
        (item) =>
          item.type === filterType
      );
    }

    if (filterStat !== "all") {
      list = list.filter(
        (item) =>
          (item.status || "pending") ===
          filterStat
      );
    }

    return list;
  }, [
    approvals,
    search,
    filterType,
    filterStat,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE
    )
  );

  const pageItems = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(
    () => ({
      pending: approvals.filter(
        (a) =>
          !a.status ||
          a.status === "pending"
      ).length,

      approved: approvals.filter(
        (a) =>
          a.status === "approved"
      ).length,

      rejected: approvals.filter(
        (a) =>
          a.status === "rejected"
      ).length,
    }),
    [approvals]
  );

  const fmtDate = (value) =>
    value
      ? new Date(value).toLocaleDateString(
          "en-GB"
        )
      : "—";

  /* =======================================================
     CURRENT TYPE / ROLE
  ======================================================= */

  const currentTypeCfg =
    APPROVAL_TYPES.find(
      (type) =>
        type.value === form.type
    );

  const availableRoles =
    currentTypeCfg?.roles ||
    Object.keys(ROLE_LABELS);

  const isQSType =
    form.type === "measurement" ||
    form.type === "material";

  const currentUserRole =
    normalizeRole(user?.role);

  /* =======================================================
     REVIEW PERMISSION
  ======================================================= */

  const canReviewApproval = (
    approval
  ) => {
    if (!user) return false;

    if (
      approval.status !== "pending"
    ) {
      return false;
    }

    const assignedRole =
      normalizeRole(
        approval.assign_to_role
      );

    return (
      assignedRole ===
      currentUserRole
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="aw-page">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="aw-page-header">
        <div>
          <div className="aw-eyebrow">
            Quality Control &amp; Billing
          </div>

          <h1 className="aw-title">
            Approval Requests
          </h1>

          <div className="aw-sub">
            Work / Inspection → QC/PM ·
            Measurements / Materials → QS
            for billing
          </div>
        </div>

        <div className="aw-stats-row">
          <div className="aw-stat-chip aw-stat-chip--warning">
            {stats.pending} Pending
          </div>

          <div className="aw-stat-chip aw-stat-chip--success">
            {stats.approved} Approved
          </div>

          <div className="aw-stat-chip aw-stat-chip--danger">
            {stats.rejected} Rejected
          </div>
        </div>
      </div>

      {/* ===================================================
          FLOW STRIP
      =================================================== */}

      <div className="aw-flow-strip">
        {[
          {
            label: "Site Engineer",
            sub: "Raises request",
            color: "#185FA5",
          },

          null,

          {
            label: "QC / PM",
            sub: "Work approvals",
            color: "#085041",
          },

          {
            label: "or",
          },

          {
            label: "QS",
            sub: "Measurement / billing",
            color: "#633806",
            bg: "#FAEEDA",
          },

          null,

          {
            label: "Approved ✓",
            sub: "Proceed / Bill",
            color: "#085041",
            bg: "#E1F5EE",
          },
        ].map((step, index) =>
          !step ? (
            <div
              key={index}
              className="aw-flow-arrow"
            >
              →
            </div>
          ) : step.label === "or" ? (
            <div
              key={index}
              className="aw-flow-or"
            >
              or
            </div>
          ) : (
            <div
              key={index}
              className="aw-flow-step"
              style={{
                background:
                  step.bg ||
                  "var(--c-surface,#fff)",
              }}
            >
              <div
                className="aw-flow-step-label"
                style={{
                  color: step.color,
                }}
              >
                {step.label}
              </div>

              {step.sub && (
                <div className="aw-flow-step-sub">
                  {step.sub}
                </div>
              )}
            </div>
          )
        )}
      </div>

      {/* ===================================================
          LAYOUT
      =================================================== */}

      <div className="aw-layout">

        {/* =================================================
            MAIN
        ================================================= */}

        <div className="aw-main">

          {/* =================================================
              NEW APPROVAL FORM
          ================================================= */}

          <div className="aw-panel">

            <div className="aw-panel-head">

              <div className="aw-panel-title">
                New Approval Request
              </div>

              {isQSType && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    background: "#FAEEDA",
                    color: "#633806",
                    border:
                      "1px solid #EF9F27",
                    borderRadius: 99,
                    fontWeight: 700,
                  }}
                >
                  📏 Goes to QS for billing
                  verification
                </span>
              )}

            </div>

            <div className="aw-panel-body">

              <form
                onSubmit={submit}
                noValidate
              >

                {/* =================================================
                    APPROVAL TYPE
                ================================================= */}

                <div className="aw-form-section">

                  <div className="aw-section-title">
                    Approval Type
                  </div>

                  <div className="aw-type-grid">

                    {APPROVAL_TYPES.map(
                      (type) => (
                        <div
                          key={type.value}
                          className={`aw-type-card${
                            form.type ===
                            type.value
                              ? " aw-type-card--active"
                              : ""
                          }`}
                          onClick={() =>
                            handleTypeChange(
                              type.value
                            )
                          }
                        >

                          <div className="aw-type-card-label">
                            {type.label}
                          </div>

                          <div className="aw-type-card-desc">
                            {type.desc}
                          </div>

                          <div
                            style={{
                              fontSize: 10,
                              marginTop: 4,
                              color: "#7D9AB5",
                              fontFamily:
                                "monospace",
                            }}
                          >
                            →
                            {" "}
                            {
                              ROLE_LABELS[
                                type.defaultRole
                              ]
                            }
                          </div>

                        </div>
                      )
                    )}

                  </div>

                  {errors.type && (
                    <div className="aw-error">
                      {errors.type}
                    </div>
                  )}

                </div>

                {/* =================================================
                    QS FIELDS
                ================================================= */}

                {isQSType && (
                  <div className="aw-form-section">

                    <div className="aw-section-title">
                      Quantity for QS
                      Verification *
                    </div>

                    <div
                      style={{
                        background: "#FAEEDA",
                        border:
                          "1px solid #EF9F27",
                        borderRadius: 10,
                        padding:
                          "12px 16px",
                        marginBottom: 14,
                        fontSize: 12,
                        color: "#633806",
                      }}
                    >
                      ⚠ These quantities will
                      be sent to the Quantity
                      Surveyor for verification
                      before billing. Make sure
                      they match your site
                      measurements exactly.
                    </div>

                    <div className="aw-grid-2">

                      <div className="aw-field">

                        <label className="aw-label">
                          Quantity Completed *
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="aw-input"
                          value={
                            form.qty_completed
                          }
                          onChange={(e) =>
                            setF(
                              "qty_completed",
                              e.target.value
                            )
                          }
                          placeholder="e.g. 450"
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            fontFamily:
                              "monospace",
                          }}
                        />

                        {errors.qty_completed && (
                          <div className="aw-error">
                            {
                              errors.qty_completed
                            }
                          </div>
                        )}

                      </div>

                      <div className="aw-field">

                        <label className="aw-label">
                          Unit
                        </label>

                        <select
                          className="aw-select"
                          value={form.qty_unit}
                          onChange={(e) =>
                            setF(
                              "qty_unit",
                              e.target.value
                            )
                          }
                        >
                          {[
                            "sqft",
                            "sqm",
                            "cu m",
                            "RMT",
                            "nos",
                            "kg",
                            "tonnes",
                            "bags",
                            "LS",
                          ].map((unit) => (
                            <option
                              key={unit}
                              value={unit}
                            >
                              {unit}
                            </option>
                          ))}
                        </select>

                      </div>

                    </div>

                  </div>
                )}

                {/* =================================================
                    DETAILS
                ================================================= */}

                <div className="aw-form-section">

                  <div className="aw-section-title">
                    Details
                  </div>

                  <div className="aw-field aw-mb">

                    <label className="aw-label">
                      Title *
                    </label>

                    <input
                      className="aw-input"
                      value={form.title}
                      onChange={(e) =>
                        setF(
                          "title",
                          e.target.value
                        )
                      }
                      placeholder="Brief description of what requires approval"
                      autoComplete="off"
                    />

                    {errors.title && (
                      <div className="aw-error">
                        {errors.title}
                      </div>
                    )}

                  </div>

                  <div className="aw-field aw-mb">

                    <label className="aw-label">
                      Description
                    </label>

                    <textarea
                      className="aw-textarea"
                      value={form.description}
                      onChange={(e) =>
                        setF(
                          "description",
                          e.target.value
                        )
                      }
                      placeholder={
                        isQSType
                          ? "Describe what was measured — zone, activity, method of measurement, drawings referenced…"
                          : "What specifically needs to be inspected or approved?"
                      }
                    />

                  </div>

                  <div className="aw-grid-2 aw-mb">

                    <div className="aw-field">

                      <label className="aw-label">
                        Zone / Location
                      </label>

                      <input
                        className="aw-input"
                        value={form.zone}
                        onChange={(e) =>
                          setF(
                            "zone",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Level 3 / Grid B2"
                      />

                    </div>

                    <div className="aw-field">

                      <label className="aw-label">
                        Activity
                      </label>

                      <input
                        className="aw-input"
                        value={form.activity}
                        onChange={(e) =>
                          setF(
                            "activity",
                            e.target.value
                          )
                        }
                        placeholder="e.g. Column rebar fixing"
                      />

                    </div>

                  </div>

                  <div className="aw-field">

                    <label className="aw-label">
                      Assign To
                    </label>

                    <select
                      className="aw-select"
                      value={
                        form.assign_to_role
                      }
                      onChange={(e) =>
                        setF(
                          "assign_to_role",
                          e.target.value
                        )
                      }
                    >
                      {availableRoles.map(
                        (role) => (
                          <option
                            key={role}
                            value={role}
                          >
                            {
                              ROLE_LABELS[
                                role
                              ] || role
                            }
                          </option>
                        )
                      )}
                    </select>

                    {isQSType && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#7D9AB5",
                          marginTop: 4,
                        }}
                      >
                        QS will verify the
                        quantity against BOQ
                        before certifying for
                        billing.
                      </div>
                    )}

                  </div>

                </div>

                {/* =================================================
                    LINKS
                ================================================= */}

                <div className="aw-form-section">

                  <div className="aw-section-title">
                    Link to Existing Records
                  </div>

                  <div className="aw-grid-3">

                    {[
                      [
                        "linked_task",
                        "Linked Task",
                        "TASK-001",
                      ],
                      [
                        "linked_rfi",
                        "Linked RFI",
                        "RFI-007",
                      ],
                      [
                        "linked_diary",
                        "Linked Diary",
                        "YYYY-MM-DD",
                      ],
                    ].map(
                      ([key, label, placeholder]) => (
                        <div
                          key={key}
                          className="aw-field"
                        >

                          <label className="aw-label">
                            {label}
                          </label>

                          <input
                            className="aw-input"
                            value={
                              form[key]
                            }
                            onChange={(e) =>
                              setF(
                                key,
                                e.target.value
                              )
                            }
                            placeholder={
                              placeholder
                            }
                          />

                        </div>
                      )
                    )}

                  </div>

                </div>

                {/* =================================================
                    ATTACHMENTS
                ================================================= */}

                <div className="aw-form-section">

                  <div className="aw-section-title">
                    Attachments
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#49769F",
                      marginBottom: 10,
                    }}
                  >
                    Attach photos, videos,
                    drawings or documents.
                    You can select multiple
                    files.
                  </div>

                  {/* IMPORTANT:
                      We use a label so the custom
                      Choose Files button opens
                      the browser file picker.
                  */}

                  <label
                    htmlFor="approval-attachments"
                    className="aw-btn"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      background: "#F4F8FC",
                      border:
                        "1px solid #B8CADB",
                      color: "#185FA5",
                      padding:
                        "10px 16px",
                      borderRadius: 8,
                      fontWeight: 700,
                    }}
                  >
                    📎 Choose Files
                  </label>

                  <input
                    id="approval-attachments"
                    type="file"
                    multiple
                    accept="
                      image/*,
                      video/*,
                      .pdf,
                      .doc,
                      .docx,
                      .xls,
                      .xlsx,
                      .csv,
                      .dwg,
                      .dxf,
                      .zip
                    "
                    onChange={handleFiles}
                    style={{
                      position: "absolute",
                      width: 1,
                      height: 1,
                      padding: 0,
                      margin: -1,
                      overflow: "hidden",
                      clip: "rect(0,0,0,0)",
                      whiteSpace: "nowrap",
                      border: 0,
                    }}
                  />

                  {/* Selected files */}

                  {form.attachments?.length >
                    0 && (
                    <div
                      className="aw-file-list"
                      style={{
                        marginTop: 14,
                      }}
                    >

                      {form.attachments.map(
                        (file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="aw-file-item"
                            style={{
                              display: "flex",
                              alignItems:
                                "center",
                              gap: 8,
                            }}
                          >

                            <span>
                              {getAttachmentIcon(
                                file
                              )}
                            </span>

                            <span
                              className="aw-file-name"
                              style={{
                                flex: 1,
                              }}
                            >
                              {file.name}

                              <small
                                style={{
                                  display:
                                    "block",
                                  color:
                                    "#7D9AB5",
                                  fontSize: 10,
                                }}
                              >
                                {(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(
                                  2
                                )}{" "}
                                MB
                              </small>
                            </span>

                            <button
                              type="button"
                              className="aw-file-remove"
                              onClick={() =>
                                removeFile(
                                  index
                                )
                              }
                              title="Remove file"
                            >
                              ×
                            </button>

                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

                {/* =================================================
                    SUBMIT
                ================================================= */}

                <div className="aw-submit-row">

                  <button
                    type="submit"
                    className="aw-btn aw-btn--primary"
                    disabled={submitting}
                  >
                    {submitting
                      ? "Submitting…"
                      : isQSType
                      ? "Submit to QS for Verification"
                      : "Submit for Approval"}
                  </button>

                  {status && (
                    <span
                      className={`aw-status${
                        status.includes("✓")
                          ? " aw-status--ok"
                          : status.includes(
                              "failed"
                            )
                          ? " aw-status--err"
                          : " aw-status--saving"
                      }`}
                    >
                      {status}
                    </span>
                  )}

                </div>

              </form>

            </div>
          </div>

          {/* =================================================
              APPROVAL REGISTER
          ================================================= */}

          <div className="aw-panel">

            <div className="aw-panel-head">

              <div className="aw-panel-title">
                Approval Register
              </div>

              <span className="aw-pill aw-pill--muted">
                {filtered.length} records
              </span>

            </div>

            {/* =================================================
                CONTROLS
            ================================================= */}

            <div className="aw-controls">

              <div className="aw-search">

                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />

                  <path
                    d="M20 20l-3-3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(
                      e.target.value
                    );
                    setPage(1);
                  }}
                  placeholder="Search approvals…"
                />

              </div>

              <select
                className="aw-select aw-select--sm"
                value={filterType}
                onChange={(e) => {
                  setFT(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">
                  All types
                </option>

                {APPROVAL_TYPES.map(
                  (type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  )
                )}
              </select>

              <select
                className="aw-select aw-select--sm"
                value={filterStat}
                onChange={(e) => {
                  setFS(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">
                  All status
                </option>

                {Object.entries(
                  STATUS_CFG
                ).map(
                  ([value, config]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {config.label}
                    </option>
                  )
                )}
              </select>

            </div>

            {/* =================================================
                LIST
            ================================================= */}

            {listLoading ? (
              <div className="aw-loading">
                <div className="aw-spinner" />
                Loading…
              </div>
            ) : pageItems.length === 0 ? (
              <div className="aw-empty">
                <div className="aw-empty-icon">
                  ✅
                </div>
                No approval requests
                found
              </div>
            ) : (
              <>
                {pageItems.map((approval) => (
                  <div
                    key={stableKey(
                      approval
                    )}
                    className="aw-list-item"
                  >

                    {/* -----------------------------------------
                        TAGS
                    ----------------------------------------- */}

                    <div className="aw-item-tags">

                      <span className="aw-ref">
                        {approval.refNo ||
                          `APR-${String(
                            approval.id ?? ""
                          ).padStart(
                            3,
                            "0"
                          )}`}
                      </span>

                      <span className="aw-type-tag">
                        {
                          APPROVAL_TYPES.find(
                            (type) =>
                              type.value ===
                              approval.type
                          )?.label ||
                          approval.type
                        }
                      </span>

                      <StatusBadge
                        s={
                          approval.status ||
                          "pending"
                        }
                      />

                      {(approval.type ===
                        "measurement" ||
                        approval.type ===
                          "material") && (
                        <span
                          style={{
                            fontSize: 10,
                            padding:
                              "2px 7px",
                            background:
                              "#FAEEDA",
                            color:
                              "#633806",
                            border:
                              "1px solid #EF9F27",
                            borderRadius: 99,
                            fontWeight: 700,
                          }}
                        >
                          QS
                        </span>
                      )}

                      {approval.queued && (
                        <span className="aw-badge aw-badge--queued">
                          Queued
                        </span>
                      )}

                    </div>

                    {/* -----------------------------------------
                        TITLE
                    ----------------------------------------- */}

                    <div className="aw-item-title">
                      {approval.title}
                    </div>

                    {/* -----------------------------------------
                        DESCRIPTION
                    ----------------------------------------- */}

                    {approval.description && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#49769F",
                          marginBottom: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        {approval.description}
                      </div>
                    )}

                    {/* -----------------------------------------
                        QUANTITY
                    ----------------------------------------- */}

                    {approval.qty_completed && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#633806",
                          background:
                            "#FAEEDA",
                          padding:
                            "3px 10px",
                          borderRadius: 6,
                          marginBottom: 4,
                          display:
                            "inline-block",
                        }}
                      >
                        📏{" "}
                        {
                          approval.qty_completed
                        }{" "}
                        {approval.qty_unit ||
                          "sqft"}
                      </div>
                    )}

                    {/* -----------------------------------------
                        META
                    ----------------------------------------- */}

                    <div className="aw-item-meta">

                      {approval.zone && (
                        <span>
                          Zone:{" "}
                          {approval.zone}
                        </span>
                      )}

                      {approval.activity && (
                        <span>
                          {
                            approval.activity
                          }
                        </span>
                      )}

                      {approval.assign_to_role && (
                        <span>
                          →
                          {" "}
                          {
                            ROLE_LABELS[
                              approval
                                .assign_to_role
                            ] ||
                            approval.assign_to_role
                          }
                        </span>
                      )}

                      {(approval.created_at ||
                        approval.createdAt) && (
                        <span>
                          Raised:{" "}
                          {fmtDate(
                            approval.created_at ||
                              approval.createdAt
                          )}
                        </span>
                      )}

                    </div>

                    {/* -----------------------------------------
                        LINKS
                    ----------------------------------------- */}

                    {(approval.linked_task ||
                      approval.linked_rfi ||
                      approval.linked_diary) && (
                      <div className="aw-item-links">

                        {approval.linked_task && (
                          <span className="aw-link-tag aw-link-tag--task">
                            {
                              approval.linked_task
                            }
                          </span>
                        )}

                        {approval.linked_rfi && (
                          <span className="aw-link-tag aw-link-tag--rfi">
                            {
                              approval.linked_rfi
                            }
                          </span>
                        )}

                        {approval.linked_diary && (
                          <span className="aw-link-tag aw-link-tag--diary">
                            Diary:{" "}
                            {
                              approval.linked_diary
                            }
                          </span>
                        )}

                      </div>
                    )}

                    {/* =================================================
                        ATTACHMENTS ON REQUEST
                    ================================================= */}

                    {Array.isArray(
                      approval.attachments
                    ) &&
                      approval.attachments
                        .length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop:
                              "1px solid var(--c-border,#D9E2EC)",
                          }}
                        >

                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color:
                                "#185FA5",
                              marginBottom: 8,
                            }}
                          >
                            📎 Attachments (
                            {
                              approval
                                .attachments
                                .length
                            }
                            )
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              flexDirection:
                                "column",
                              gap: 6,
                            }}
                          >

                            {approval.attachments.map(
                              (
                                attachment,
                                index
                              ) => {
                                const url =
                                  getAttachmentUrl(
                                    attachment
                                  );

                                const mime =
                                  attachment?.mimetype ||
                                  "";

                                const isImage =
                                  mime.startsWith(
                                    "image/"
                                  );

                                const isVideo =
                                  mime.startsWith(
                                    "video/"
                                  );

                                const isPdf =
                                  mime.includes(
                                    "pdf"
                                  );

                                return (
                                  <div
                                    key={`${attachment.filename || attachment.name}-${index}`}
                                    style={{
                                      display:
                                        "flex",
                                      alignItems:
                                        "center",
                                      gap: 8,
                                      padding:
                                        "8px 10px",
                                      background:
                                        "#F7FAFD",
                                      border:
                                        "1px solid #D9E2EC",
                                      borderRadius: 7,
                                    }}
                                  >

                                    <span>
                                      {getAttachmentIcon(
                                        attachment
                                      )}
                                    </span>

                                    <span
                                      style={{
                                        flex: 1,
                                        minWidth: 0,
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontSize:
                                            12,
                                          fontWeight:
                                            700,
                                          color:
                                            "#163B5C",
                                          overflow:
                                            "hidden",
                                          textOverflow:
                                            "ellipsis",
                                          whiteSpace:
                                            "nowrap",
                                        }}
                                      >
                                        {attachment.name ||
                                          attachment.filename ||
                                          `Attachment ${index + 1}`}
                                      </div>

                                      {attachment.size && (
                                        <div
                                          style={{
                                            fontSize:
                                              10,
                                            color:
                                              "#7D9AB5",
                                          }}
                                        >
                                          {(
                                            attachment.size /
                                            1024 /
                                            1024
                                          ).toFixed(
                                            2
                                          )}{" "}
                                          MB
                                        </div>
                                      )}
                                    </span>

                                    {url && (
                                      <>
                                        {isImage && (
                                          <a
                                            href={
                                              url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="aw-btn"
                                            style={{
                                              textDecoration:
                                                "none",
                                              fontSize:
                                                11,
                                              padding:
                                                "5px 9px",
                                            }}
                                          >
                                            View
                                          </a>
                                        )}

                                        {isVideo && (
                                          <a
                                            href={
                                              url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="aw-btn"
                                            style={{
                                              textDecoration:
                                                "none",
                                              fontSize:
                                                11,
                                              padding:
                                                "5px 9px",
                                            }}
                                          >
                                            ▶ Play
                                          </a>
                                        )}

                                        {isPdf && (
                                          <a
                                            href={
                                              url
                                            }
                                            target="_blank"
                                            rel="noreferrer"
                                            className="aw-btn"
                                            style={{
                                              textDecoration:
                                                "none",
                                              fontSize:
                                                11,
                                              padding:
                                                "5px 9px",
                                            }}
                                          >
                                            Open PDF
                                          </a>
                                        )}

                                        {!isImage &&
                                          !isVideo &&
                                          !isPdf && (
                                            <a
                                              href={
                                                url
                                              }
                                              target="_blank"
                                              rel="noreferrer"
                                              download={
                                                attachment.name ||
                                                attachment.filename
                                              }
                                              className="aw-btn"
                                              style={{
                                                textDecoration:
                                                  "none",
                                                fontSize:
                                                  11,
                                                padding:
                                                  "5px 9px",
                                              }}
                                            >
                                              Download
                                            </a>
                                          )}
                                      </>
                                    )}

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>
                      )}

                    {/* =================================================
                        REVISION / REJECTION COMMENT
                    ================================================= */}

                    {approval.rejection_reason &&
                      (approval.status ===
                        "revision" ||
                        approval.status ===
                          "rejected") && (
                        <div
                          className={
                            approval.status ===
                            "revision"
                              ? "aw-review-note aw-review-note--revision"
                              : "aw-review-note aw-review-note--rejected"
                          }
                        >

                          <div className="aw-review-note-title">
                            {approval.status ===
                            "revision"
                              ? "↻ Revision Required"
                              : "✕ Rejected"}
                          </div>

                          <div className="aw-review-note-text">
                            {
                              approval.rejection_reason
                            }
                          </div>

                        </div>
                      )}

                    {/* =================================================
                        REVIEW ACTIONS
                    ================================================= */}

                    {canReviewApproval(
                      approval
                    ) && (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 12,
                          paddingTop: 10,
                          borderTop:
                            "1px solid var(--c-border,#D9E2EC)",
                        }}
                      >

                        <button
                          type="button"
                          className="aw-btn aw-btn--primary"
                          onClick={() =>
                            updateApprovalStatus(
                              approval.id,
                              "approved"
                            )
                          }
                        >
                          ✓ Approve
                        </button>

                        <button
                          type="button"
                          className="aw-btn"
                          style={{
                            background:
                              "#F3EDF8",
                            color:
                              "#4A1A6E",
                            border:
                              "1px solid #C49FDC",
                          }}
                          onClick={() =>
                            updateApprovalStatus(
                              approval.id,
                              "revision"
                            )
                          }
                        >
                          ↻ Revision Required
                        </button>

                        <button
                          type="button"
                          className="aw-btn"
                          style={{
                            background:
                              "#FCEBEB",
                            color:
                              "#791F1F",
                            border:
                              "1px solid #E8A0A0",
                          }}
                          onClick={() =>
                            updateApprovalStatus(
                              approval.id,
                              "rejected"
                            )
                          }
                        >
                          ✕ Reject
                        </button>

                      </div>
                    )}

                  </div>
                ))}

                {/* =================================================
                    PAGINATION
                ================================================= */}

                <div className="aw-pagination">

                  <span className="aw-page-info">
                    Page {page} of{" "}
                    {totalPages} ·{" "}
                    {filtered.length} records
                  </span>

                  <div className="aw-page-btns">

                    <button
                      className="aw-page-btn"
                      onClick={() =>
                        setPage((p) =>
                          Math.max(
                            1,
                            p - 1
                          )
                        )
                      }
                      disabled={page <= 1}
                    >
                      ← Prev
                    </button>

                    <button
                      className="aw-page-btn"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(
                            totalPages,
                            p + 1
                          )
                        )
                      }
                      disabled={
                        page >=
                        totalPages
                      }
                    >
                      Next →
                    </button>

                  </div>

                </div>
              </>
            )}

          </div>
        </div>

        {/* =================================================
            ASIDE
        ================================================= */}

        <aside className="aw-aside">

          {/* Stats */}

          <div className="aw-aside-card">

            <div className="aw-aside-title">
              Stats
            </div>

            {[
              [
                "Pending Review",
                stats.pending,
                "#BA7517",
              ],
              [
                "Approved",
                stats.approved,
                "#085041",
              ],
              [
                "Rejected",
                stats.rejected,
                "#791F1F",
              ],
              [
                "Total",
                approvals.length,
                "var(--c-navy-700,#0A4174)",
              ],
            ].map(
              ([label, value, color]) => (
                <div
                  key={label}
                  className="aw-aside-row"
                >
                  <span>{label}</span>

                  <strong
                    style={{
                      color,
                    }}
                  >
                    {value}
                  </strong>
                </div>
              )
            )}

          </div>

          {/* Who reviews what */}

          <div className="aw-aside-card">

            <div className="aw-aside-title">
              Who Reviews What
            </div>

            <div
              style={{
                fontSize: 12,
                color:
                  "var(--c-text-2,#49769F)",
                lineHeight: 2,
              }}
            >

              <div>
                <strong
                  style={{
                    color: "#085041",
                  }}
                >
                  QC Officer
                </strong>{" "}
                — Inspections, NCRs
              </div>

              <div>
                <strong
                  style={{
                    color: "#0A4174",
                  }}
                >
                  Project Manager
                </strong>{" "}
                — Work approvals,
                method statements
              </div>

              <div>
                <strong
                  style={{
                    color: "#633806",
                  }}
                >
                  QS
                </strong>{" "}
                — Measurements,
                material quantities for
                billing
              </div>

              <div>
                <strong
                  style={{
                    color: "#4A1A6E",
                  }}
                >
                  Architect
                </strong>{" "}
                — Design-related
                approvals
              </div>

            </div>

          </div>

          {/* Rules */}

          <div className="aw-aside-card">

            <div className="aw-aside-title">
              Rules
            </div>

            <ul className="aw-rules-list">

              <li>
                No work proceeds without
                approval
              </li>

              <li>
                Concrete pours need QC
                inspection first
              </li>

              <li>
                Submit measurements to QS
                before month-end billing
              </li>

              <li>
                Rejected items must be
                re-submitted with revisions
              </li>

              <li>
                Link to Task, RFI, or Diary
                for full traceability
              </li>

            </ul>

          </div>

        </aside>

      </div>
    </div>
  );
}