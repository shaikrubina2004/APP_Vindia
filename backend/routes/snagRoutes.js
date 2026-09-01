const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

/* =========================
   MULTER
========================= */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/");
  },

  filename: (_req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* =========================
   GET ALL SNAGS
========================= */

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM snags ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET SNAGS ERROR:", err.message);

    res.status(500).json({
      message: "Error fetching snags",
    });
  }
});

/* =========================
   CREATE SNAG
========================= */

router.post("/", authMiddleware, async (req, res) => {
  const {
    title,
    description,
    zone,
    priority,
    drawing_ref,
    grid_ref,
    due_date,
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO snags
      (
        title,
        description,
        zone,
        priority,
        drawing_ref,
        grid_ref,
        due_date,
        raised_by,
        raised_date
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        title,
        description,
        zone,
        priority,
        drawing_ref,
        grid_ref,
        due_date,
        String(req.user?.id || ""),
        new Date(),
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("CREATE SNAG ERROR:", err.message);

    res.status(500).json({
      message: "Error creating snag",
    });
  }
});

/* =========================
   UPDATE SNAG
========================= */

router.patch(
  "/:id",
  authMiddleware,
  upload.array("photos", 10),
  async (req, res) => {
    const { id } = req.params;

    const {
      status,
      resolution_notes,
      resolved_at,
      closed_at,
      assigned_to,
      assigned_name,
    } = req.body;

    try {
      const existing = await pool.query(
        "SELECT * FROM snags WHERE id = $1",
        [id]
      );

      if (!existing.rows.length) {
        return res.status(404).json({
          message: "Snag not found",
        });
      }

      const current = existing.rows[0];
      const role = req.user?.role;

      const allowedTransitions = {
        site_engineer: {
          open: ["in_progress"],
          in_progress: ["resolved"],
        },

        architect: {
          resolved: ["reinspection"],
          reinspection: ["closed"],
        },

        qc_engineer: {
          resolved: ["reinspection"],
          reinspection: ["closed"],
        },

        project_manager: {
          open: ["in_progress"],
          in_progress: ["resolved"],
          resolved: ["reinspection"],
          reinspection: ["closed"],
        },

        ceo: {
          open: ["in_progress"],
          in_progress: ["resolved"],
          resolved: ["reinspection"],
          reinspection: ["closed"],
        },
      };

      const allowed =
        allowedTransitions[role]?.[current.status || "open"] || [];

      if (status && status !== current.status) {
        if (!allowed.includes(status)) {
          return res.status(403).json({
            message: `Role "${role}" cannot change snag from "${current.status}" to "${status}"`,
          });
        }
      }

      const photoPaths =
        req.files?.map((file) =>
          file.path.replace(/\\/g, "/")
        ) || [];

      let nextResolutionNotes =
        resolution_notes ?? current.resolution_notes;

      if (status === "resolved" && !String(nextResolutionNotes || "").trim()) {
        return res.status(400).json({
          message: "Resolution notes are required before resolving a snag",
        });
      }

      // Store proof photos in the existing resolution_notes field
      // only if photos are uploaded and no separate photo column exists.
      if (photoPaths.length) {
        const photoText = `\nProof Photos:\n${photoPaths
          .map((p) => `/uploads/${p.split("uploads/").pop()}`)
          .join("\n")}`;

        nextResolutionNotes =
          `${nextResolutionNotes || ""}${photoText}`.trim();
      }

      const result = await pool.query(
        `UPDATE snags
         SET
           status = COALESCE($1, status),
           resolution_notes = COALESCE($2, resolution_notes),
           resolved_at = COALESCE($3, resolved_at),
           closed_at = COALESCE($4, closed_at),
           assigned_to = COALESCE($5, assigned_to),
           assigned_name = COALESCE($6, assigned_name)
         WHERE id = $7
         RETURNING *`,
        [
          status || null,
          nextResolutionNotes || null,
          resolved_at || null,
          closed_at || null,
          assigned_to ? Number(assigned_to) : null,
          assigned_name || null,
          id,
        ]
      );

      return res.json(result.rows[0]);
    } catch (err) {
      console.error("UPDATE SNAG ERROR:", err.message);

      return res.status(500).json({
        message: "Error updating snag",
      });
    }
  }
);

module.exports = router;