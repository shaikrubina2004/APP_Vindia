// backend/controllers/progressController.js
const Progress = require("../models/Progress");

// Create progress entry
const createProgress = async (req, res) => {
  try {
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