// backend/controllers/siteProgressController.js

const Progress = require("../models/Progress");

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
      measurements = [];
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

    /* ---------- CREATE MAIN RECORD ---------- */

    const progress = await Progress.create(data);

    /* ---------- SAVE VALID MEASUREMENTS ---------- */

    const validMeasurements = measurements.filter(
      (m) =>
        m &&
        typeof m.item === "string" &&
        m.item.trim() &&
        Number.isFinite(Number(m.qty)) &&
        Number(m.qty) > 0
    );

    if (validMeasurements.length > 0) {
      await Progress.saveMeasurements(
        progress.id,
        validMeasurements
      );
    }

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
    const list = await Progress.getAll();

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