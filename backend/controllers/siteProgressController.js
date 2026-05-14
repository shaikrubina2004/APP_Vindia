const Progress = require("../models/Progress");

// CREATE
const createSiteProgress = async (req, res) => {
  try {
    let data = req.body;

    console.log("BODY 👉", data);

    // ✅ VALIDATION
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

    // ✅ FORCE NUMBER (VERY IMPORTANT)
    data.project_id = Number(data.project_id);
    data.wbs_id = Number(data.wbs_id);

    // ✅ PARSE MEASUREMENTS
    let measurements = [];
    if (data.measurements) {
      try {
        measurements =
          typeof data.measurements === "string"
            ? JSON.parse(data.measurements)
            : data.measurements;
      } catch {
        measurements = [];
      }
    }

    delete data.measurements;

    // ✅ HANDLE PHOTOS
    // ✅ HANDLE PHOTOS (FINAL FIX)
if (req.files && req.files.length > 0) {
  data.photos = req.files.map(file =>
    file.path.replace(/\\/g, "/")   // 🔥 FIX
  );
}

    // ✅ SAVE MAIN DATA
    const progress = await Progress.create(data);

    // ✅ SAVE MEASUREMENTS
    // ✅ FILTER EMPTY ROWS
const validMeasurements = measurements.filter(m =>
  m.item && m.qty && !isNaN(m.qty)
);

if (validMeasurements.length > 0) {
  await Progress.saveMeasurements(progress.id, validMeasurements);
}

    return res.status(201).json({
      success: true,
      data: progress,
    });

  } catch (error) {
    console.error("ERROR 👉", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL
const getSiteProgress = async (req, res) => {
  try {
    const list = await Progress.getAll();

    const final = await Promise.all(
      list.map(async (item) => {
        const m = await Progress.getMeasurements(item.id);
        return {
          ...item,
          measurements: m,
        };
      })
    );

    res.json({
      success: true,
      data: final,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET BY ID
const getSiteProgressById = async (req, res) => {
  try {
    const data = await Progress.getById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    const measurements = await Progress.getMeasurements(req.params.id);

    res.json({
      success: true,
      data: {
        ...data,
        measurements,
      },
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
const deleteSiteProgress = async (req, res) => {
  try {
    await Progress.delete(req.params.id);

    res.json({
      success: true,
      message: "Deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createSiteProgress,
  getSiteProgress,
  getSiteProgressById,
  deleteSiteProgress,
};