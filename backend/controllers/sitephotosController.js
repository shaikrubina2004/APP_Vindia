// server/controllers/sitephotosController.js
// Handles: upload, get, share, download-zip
// Requires: archiver package → run: npm install archiver

const pool     = require("../config/db");
const fs       = require("fs");
const path     = require("path");
const archiver = require("archiver");

/* ─────────────────────────────────────────────────────────
   HELPER — safe integer
───────────────────────────────────────────────────────── */
const toInt = (v) => {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
};

/* ═══════════════════════════════════════════════════════════
   UPLOAD PHOTOS
   POST /api/photos
   Body (multipart): date, zone, activity, phase, description,
     linked_rfi, linked_task, project_id, milestone_id, task_id,
     visibility + files field "photos"
═══════════════════════════════════════════════════════════ */
exports.uploadPhotos = async (req, res) => {
  try {
    const file = req.file;


    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const {
      project_id, milestone_id, task_id,
      date, zone, activity, phase,
      description, linked_rfi, linked_task, visibility,
    } = req.body;

    const submitted_by = req.user?.id || null;

    const filePath = `/uploads/${file.filename}`;

    const result = await pool.query(
      `INSERT INTO photo_gallery
      (project_id, milestone_id, task_id, date, zone, activity, phase,
       description, linked_rfi, linked_task, visibility,
       file_url, filename, submitted_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        project_id || null,
        milestone_id || null,
        task_id || null,
        date,
        zone,
        activity,
        phase,
        description,
        linked_rfi,
        linked_task,
        visibility,
        filePath,
        file.originalname,
        submitted_by,
      ]
    );

    const row = result.rows[0];

    return res.status(201).json({
      ...row,
      url: `${process.env.BASE_URL || "http://localhost:5000"}${filePath}`,
    });

  } catch (err) {
    console.error("uploadPhotos error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET ALL PHOTOS
   GET /api/photos
   Optional query params: zone, activity, phase, date, visibility,
     project_id, limit, offset
═══════════════════════════════════════════════════════════ */
exports.getPhotos = async (req, res) => {
  try {
    const {
      zone, activity, phase, date,
      visibility, project_id,
      limit = 200, offset = 0,
    } = req.query;

    const conditions = [];
    const params     = [];

    if (zone)       { params.push(zone);       conditions.push(`zone = $${params.length}`);       }
    if (activity)   { params.push(activity);   conditions.push(`activity = $${params.length}`);   }
    if (phase)      { params.push(phase);       conditions.push(`phase = $${params.length}`);      }
    if (date)       { params.push(date);        conditions.push(`date = $${params.length}`);       }
    if (visibility) { params.push(visibility);  conditions.push(`visibility = $${params.length}`); }
    if (project_id) { params.push(toInt(project_id)); conditions.push(`project_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(Number(limit));
    params.push(Number(offset));

    const result = await pool.query(
      `SELECT
         pg.*,
         u.name AS submitted_by_name,
         p.name AS project_name
       FROM photo_gallery pg
       LEFT JOIN users    u ON u.id = pg.submitted_by
       LEFT JOIN projects p ON p.id = pg.project_id
       ${where}
       ORDER BY pg.created_at DESC
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params
    );

    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

    const data = result.rows.map(p => ({
      ...p,
      url: p.file_url ? `${BASE_URL}${p.file_url}` : null,
    }));

    res.json(data);

  } catch (err) {
    console.error("getPhotos error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   GET PHOTOS SHARED TO A MODULE
   GET /api/photos/shared?target=progress&ref=PROG-001
═══════════════════════════════════════════════════════════ */
exports.getSharedPhotos = async (req, res) => {
  try {
    const { target, ref } = req.query;

    if (!target) {
      return res.status(400).json({ error: "target is required" });
    }

    const params = [target];
    let refClause = "";
    if (ref) {
      params.push(ref);
      refClause = `AND ps.reference = $${params.length}`;
    }

    const result = await pool.query(
      `SELECT
         pg.*,
         ps.target_module,
         ps.reference,
         ps.shared_at
       FROM photo_shares ps
       JOIN photo_gallery pg ON pg.id = ps.photo_id
       WHERE ps.target_module = $1 ${refClause}
       ORDER BY ps.shared_at DESC`,
      params
    );

    const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

    res.json(result.rows.map(p => ({
      ...p,
      url: p.file_url ? `${BASE_URL}${p.file_url}` : null,
    })));

  } catch (err) {
    console.error("getSharedPhotos error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   SHARE PHOTO TO A MODULE
   POST /api/photos/share
   Body: { photo_id, target, linked_ref }
═══════════════════════════════════════════════════════════ */
exports.sharePhoto = async (req, res) => {
  try {
    const { photo_id, target, linked_ref } = req.body;

    if (!photo_id || !target) {
      return res.status(400).json({ error: "photo_id and target are required" });
    }

    // Check photo exists
    const check = await pool.query(
      "SELECT id FROM photo_gallery WHERE id = $1",
      [toInt(photo_id)]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    // Upsert — don't duplicate the same share
    await pool.query(
      `INSERT INTO photo_shares (photo_id, target_module, reference, shared_by, shared_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (photo_id, target_module, reference) DO NOTHING`,
      [
        toInt(photo_id),
        target,
        linked_ref || "",
        req.user?.id || null,
      ]
    );

    res.json({ message: "Photo shared successfully", photo_id, target, linked_ref });

  } catch (err) {
    console.error("sharePhoto error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ═══════════════════════════════════════════════════════════
   DOWNLOAD ZIP SET BY DATE
   GET /api/photos/download-set?date=2026-05-15
   Returns: zip file of all photos for that date
═══════════════════════════════════════════════════════════ */
exports.downloadSet = async (req, res) => {
  try {
    const { date, zone } = req.query;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const params = [date];
    let zoneClause = "";
    if (zone) { params.push(zone); zoneClause = `AND zone = $${params.length}`; }

    const result = await pool.query(
      `SELECT * FROM photo_gallery
       WHERE date = $1 ${zoneClause}
       ORDER BY created_at ASC`,
      params
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "No photos found for this date" });
    }

    // Build zip
    const zipName = zone
      ? `site-photos-${date}-${zone.replace(/[^a-zA-Z0-9]/g, "_")}.zip`
      : `site-photos-${date}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}"`);

    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.on("error", err => {
      console.error("Archiver error:", err);
      if (!res.headersSent) res.status(500).json({ error: "Zip creation failed" });
    });

    archive.pipe(res);

    let fileCount = 0;
    for (const photo of result.rows) {
      // file_url is like /uploads/filename.jpg
      const filePath = path.join(__dirname, "..", photo.file_url);
      if (fs.existsSync(filePath)) {
        // Name file descriptively in zip: zone_activity_originalname
        const prefix = [photo.zone, photo.activity, photo.phase]
          .filter(Boolean)
          .join("_")
          .replace(/[^a-zA-Z0-9_]/g, "_")
          .slice(0, 40);
        const zipEntryName = `${prefix}_${path.basename(filePath)}`;
        archive.file(filePath, { name: zipEntryName });
        fileCount++;
      }
    }

    if (fileCount === 0) {
      archive.abort();
      return res.status(404).json({ error: "No physical files found on disk for this date" });
    }

    await archive.finalize();

  } catch (err) {
    console.error("downloadSet error:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
};

/* ═══════════════════════════════════════════════════════════
   DELETE PHOTO
   DELETE /api/photos/:id
   Only the uploader or admin can delete
═══════════════════════════════════════════════════════════ */
exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
const userRole = req.user?.role;

    const check = await pool.query(
      "SELECT * FROM photo_gallery WHERE id = $1",
      [toInt(id)]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Photo not found" });
    }

    const photo = check.rows[0];

    // Only uploader can delete (or CEO role)
   if (
  String(photo.submitted_by) !== String(userId) &&
  userRole !== "ceo"
) {
  return res.status(403).json({
    error: "Not authorized to delete this photo",
  });
}

    // Delete physical file
    if (photo.file_url) {
      const filePath = path.join(__dirname, "..", photo.file_url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Delete shares first (FK constraint)
    await pool.query("DELETE FROM photo_shares WHERE photo_id = $1", [toInt(id)]);
    await pool.query("DELETE FROM photo_gallery WHERE id = $1", [toInt(id)]);

    res.json({ message: "Photo deleted successfully" });

  } catch (err) {
    console.error("deletePhoto error:", err.message);
    res.status(500).json({ error: err.message });
  }
};