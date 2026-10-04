// ===== FILE: APP_Vindia/backend/controllers/employeeDocumentController.js =====
const EmployeeDocument = require("../models/employeeDocumentModel");
const fs = require("fs");
const path = require("path");

exports.uploadDocument = async (req, res) => {
  try {
    const { employee_id, title, category } = req.body;

    if (!employee_id || !title) {
      return res.status(400).json({ error: "employee_id and title are required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "A file is required" });
    }

    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "User not authenticated" });

    const document = await EmployeeDocument.create({
      employee_id,
      title,
      category,
      file_url: `/uploads/${req.file.filename}`,
      file_type: path.extname(req.file.originalname).replace(".", "").toUpperCase(),
      file_size_bytes: req.file.size,
      uploaded_by: userId,
    });

    res.status(201).json(document);
  } catch (err) {
    console.error("UPLOAD EMPLOYEE DOCUMENT ERROR:", err.message);
    res.status(500).json({ error: "Failed to upload document" });
  }
};

exports.getDocumentsByEmployee = async (req, res) => {
  try {
    const documents = await EmployeeDocument.getByEmployeeId(req.params.employeeId);
    res.status(200).json(documents);
  } catch (err) {
    console.error("GET EMPLOYEE DOCUMENTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const document = await EmployeeDocument.getById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    await EmployeeDocument.delete(req.params.id);

    const filePath = path.join(__dirname, "..", document.file_url);
    fs.unlink(filePath, () => {});

    res.status(200).json({ message: "Document deleted" });
  } catch (err) {
    console.error("DELETE EMPLOYEE DOCUMENT ERROR:", err.message);
    res.status(500).json({ error: "Failed to delete document" });
  }
};