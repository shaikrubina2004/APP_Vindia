const express = require("express");
const router = express.Router();
const template = require("../controllers/templateController");

// ── Templates ─────────────────────────────

// Get all templates
router.get("/", template.getTemplates);

// Get template items (full structure)
router.get("/:id", template.getTemplateItems);

// Create template (optional for future)
router.post("/", template.createTemplate);

// Add template item
router.post("/item", template.addTemplateItem);

module.exports = router;