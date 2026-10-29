// backend/controllers/progressController.js
const Progress = require("../models/Progress");
const {
  isAssignedProject,
  getAssignedProjectIds,
  isManagedProject,
  getManagedProjectIds,
  isWbsInProject,
} = require("../utils/siteEngineerAccess");

// Create progress entry
const createProgress = async (req, res) => {
  try {
    if (!(await isWbsInProject(req.body.wbs_id, req.body.project_id))) {
      return res.status(400).json({ success: false, message: "WBS item does not belong to the selected project" });
    }
    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(req.user.id, req.body.project_id))
    ) {
      return res.status(403).json({ success: false, message: "You are not assigned to this project" });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(req.user.id, req.body.project_id))
    ) {
      return res.status(403).json({ success: false, message: "You do not manage this project" });
    }
    const progress = await Progress.create(req.body);
    res.status(201).json({ success: true, data: progress });
  } catch (error) {
    console.error("Error creating progress:", error);
    res.status(500).json({ success: false, message: "Failed to create progress entry" });
  }
};

// Get all progress entries
const getProgress = async (req, res) => {
  try {
    const { zone, date, activity } = req.query;
    const filters = {};
    if (zone) filters.zone = zone;
    if (date) filters.date = date;
    if (activity) filters.activity = activity;
    if (req.user?.role === "site_engineer") {
      filters.projectIds = await getAssignedProjectIds(req.user.id);
    } else if (req.user?.role === "project_manager") {
      filters.projectIds = await getManagedProjectIds(req.user.id);
    }

    const progress = await Progress.getAll(filters);
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ success: false, message: "Failed to fetch progress entries" });
  }
};

// Get progress by ID
const getProgressById = async (req, res) => {
  try {
    const { id } = req.params;
    const progress = await Progress.getById(id);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(req.user.id, progress.project_id))
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(req.user.id, progress.project_id))
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error("Error fetching progress by ID:", error);
    res.status(500).json({ success: false, message: "Failed to fetch progress entry" });
  }
};

// Update progress entry
const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Progress.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "site_engineer" &&
      (
        !(await isAssignedProject(req.user.id, existing.project_id)) ||
        (req.body.project_id !== undefined &&
          !(await isAssignedProject(req.user.id, req.body.project_id)))
      )
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "project_manager" &&
      (
        !(await isManagedProject(req.user.id, existing.project_id)) ||
        (req.body.project_id !== undefined &&
          !(await isManagedProject(req.user.id, req.body.project_id)))
      )
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    const projectId = req.body.project_id ?? existing.project_id;
    const wbsId = req.body.wbs_id ?? existing.wbs_id;
    if (!(await isWbsInProject(wbsId, projectId))) {
      return res.status(400).json({ success: false, message: "WBS item does not belong to the selected project" });
    }
    const progress = await Progress.update(id, req.body);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ success: false, message: "Failed to update progress entry" });
  }
};

// Delete progress entry
const deleteProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Progress.getById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "site_engineer" &&
      !(await isAssignedProject(req.user.id, existing.project_id))
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    if (
      req.user?.role === "project_manager" &&
      !(await isManagedProject(req.user.id, existing.project_id))
    ) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    const progress = await Progress.delete(id);
    if (!progress) {
      return res.status(404).json({ success: false, message: "Progress entry not found" });
    }
    res.json({ success: true, data: progress });
  } catch (error) {
    console.error("Error deleting progress:", error);
    res.status(500).json({ success: false, message: "Failed to delete progress entry" });
  }
};

module.exports = {
  createProgress,
  getProgress,
  getProgressById,
  updateProgress,
  deleteProgress,
};