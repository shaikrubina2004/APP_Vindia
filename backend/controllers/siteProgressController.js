// backend/controllers/siteProgressController.js

const Progress = require("../models/Progress");
const {
  isAssignedProject,
  getAssignedProjectIds,
  isManagedProject,
  getManagedProjectIds,
  isWbsInProject,
} = require("../utils/siteEngineerAccess");

/* =========================================================
   CREATE SITE PROGRESS
========================================================= */

const createSiteProgress = async (req, res) => {
  try {
    const data = { ...req.body };

    /* ---------- AUTH ---------- */

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    /* ---------- VALIDATION ---------- */

    if (!data.project_id) {
      return res.status(400).json({
        success: false,
        message: "project_id is required",
      });
    }

    if (!data.wbs_id) {
      return res.status(400).json({
        success: false,
        message: "wbs_id is required",
      });
    }

    const parsedDate = data.date ? new Date(`${data.date}T00:00:00.000Z`) : null;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(data.date || "") ||
      !parsedDate ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== data.date
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid date is required",
      });
    }

    if (!data.zone?.trim()) {
      return res.status(400).json({
        success: false,
        message: "zone is required",
      });
    }
    data.zone = data.zone.trim();

    for (const field of ["percent_complete", "planned_percent"]) {
      const value = data[field] === undefined || data[field] === ""
        ? 0
        : Number(data[field]);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        return res.status(400).json({
          success: false,
          message: `${field} must be between 0 and 100`,
        });
      }
      data[field] = value;
    }

    if (data.sqft_completed === "" || data.sqft_completed === undefined) {
      data.sqft_completed = null;
    } else {
      const completed = Number(data.sqft_completed);
      if (!Number.isFinite(completed) || completed < 0) {
        return res.status(400).json({
          success: false,
          message: "sqft_completed must be a non-negative number",
        });
      }
      data.sqft_completed = completed;
    }

    const projectId = Number(data.project_id);
    const wbsId = Number(data.wbs_id);

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid project_id",
      });
    }

    if (!Number.isInteger(wbsId) || wbsId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid wbs_id",
      });
    }

    data.project_id = projectId;
    data.wbs_id = wbsId;

    if (!(await isWbsInProject(wbsId, projectId))) {
      return res.status(400).json({
        success: false,
        message: "WBS item does not belong to the selected project",
      });
    }

    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(userId, projectId))
    ) {
      return res.status(403).json({
        success: false,
        message: "You are not assigned to this project",
      });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(userId, projectId))
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not manage this project",
      });
    }

    /* ---------- PARSE MEASUREMENTS ---------- */

    let measurements = [];

    if (data.measurements) {
      try {
        measurements =
          typeof data.measurements === "string"
            ? JSON.parse(data.measurements)
            : data.measurements;
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid measurements format",
        });
      }
    }

    if (!Array.isArray(measurements)) {
      return res.status(400).json({
        success: false,
        message: "Measurements must be an array",
      });
    }

    delete data.measurements;

    /* ---------- HANDLE PHOTOS ---------- */

    if (req.files && req.files.length > 0) {
      data.photos = req.files.map((file) =>
        file.path.replace(/\\/g, "/")
      );
    } else {
      data.photos = [];
    }

    const validMeasurements = [];
    for (const measurement of measurements) {
      if (!measurement || typeof measurement !== "object") {
        return res.status(400).json({
          success: false,
          message: "Invalid measurement row",
        });
      }

      const item = typeof measurement.item === "string"
        ? measurement.item.trim()
        : "";
      const hasQuantity = measurement.qty !== undefined && measurement.qty !== "";
      if (!item && !hasQuantity) continue;

      const quantity = Number(measurement.qty);
      const status = measurement.status || "draft";
      const unit = measurement.unit || "sqft";
      if (status === "approved" && req.user?.role !== "quantity_surveyor") {
        return res.status(403).json({
          success: false,
          message: "Only a quantity surveyor can approve measurements",
        });
      }
      if (
        !item ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        typeof unit !== "string" ||
        unit.length > 20 ||
        !["draft", "submitted", "approved"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Each measurement requires an item, a positive quantity, and a valid status",
        });
      }

      validMeasurements.push({
        ...measurement,
        item,
        qty: quantity,
        unit,
        status,
      });
    }

    const progress = await Progress.createWithMeasurements(
      data,
      validMeasurements
    );

    /* ---------- RESPONSE ---------- */

    return res.status(201).json({
      success: true,
      data: {
        ...progress,
        measurements: validMeasurements,
      },
    });
  } catch (error) {
    console.error("CREATE SITE PROGRESS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET ALL SITE PROGRESS
========================================================= */

const getSiteProgress = async (req, res) => {
  try {
    const requestedProjectId = req.query.project_id === undefined
      ? null
      : Number(req.query.project_id);
    if (
      requestedProjectId !== null &&
      (!Number.isInteger(requestedProjectId) || requestedProjectId <= 0)
    ) {
      return res.status(400).json({ success: false, message: "Invalid project_id" });
    }
    if (
      req.user?.role === "site_engineer" &&
      requestedProjectId !== null &&
      !(await isAssignedProject(req.user.id, requestedProjectId))
    ) {
      return res.status(403).json({ success: false, message: "You are not assigned to this project" });
    }
    if (
      req.user?.role === "project_manager" &&
      requestedProjectId !== null &&
      !(await isManagedProject(req.user.id, requestedProjectId))
    ) {
      return res.status(403).json({ success: false, message: "You do not manage this project" });
    }
    let projectIds = req.user?.role === "site_engineer"
      ? await getAssignedProjectIds(req.user.id)
      : req.user?.role === "project_manager"
        ? await getManagedProjectIds(req.user.id)
        : null;
    if (requestedProjectId !== null) projectIds = [requestedProjectId];
    const list = await Progress.getAll({ projectIds });

    const final = await Promise.all(
      list.map(async (item) => {
        const measurements =
          await Progress.getMeasurements(item.id);

        return {
          ...item,
          measurements,
        };
      })
    );

    return res.json({
      success: true,
      data: final,
    });
  } catch (error) {
    console.error("GET SITE PROGRESS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   GET SITE PROGRESS BY ID
========================================================= */

const getSiteProgressById = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress ID",
      });
    }

    const data = await Progress.getById(id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }
    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(req.user.id, data.project_id))
    ) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(req.user.id, data.project_id))
    ) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }

    const measurements =
      await Progress.getMeasurements(id);

    return res.json({
      success: true,
      data: {
        ...data,
        measurements,
      },
    });
  } catch (error) {
    console.error("GET SITE PROGRESS BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   DELETE SITE PROGRESS
========================================================= */

const deleteSiteProgress = async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid progress ID",
      });
    }

    const existing = await Progress.getById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }

    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(req.user.id, existing.project_id))
    ) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(req.user.id, existing.project_id))
    ) {
      return res.status(404).json({
        success: false,
        message: "Progress entry not found",
      });
    }

    await Progress.delete(id);

    return res.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error("DELETE SITE PROGRESS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createSiteProgress,
  getSiteProgress,
  getSiteProgressById,
  deleteSiteProgress,
};