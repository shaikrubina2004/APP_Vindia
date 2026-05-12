const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const Finance = require('../models/financeModel');
const Invoice = require('../models/invoiceModel');
const Budget = require('../models/budgetModel');

// GET /api/finance/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const { projectId } = req.query;
    const data = await Finance.getDashboard(projectId);
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/finance/invoices
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await Invoice.getAll(req.query);
    res.json({ success: true, data: invoices });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/finance/invoices/create
router.post('/invoices/create', async (req, res) => {
  try {
    const invoice = await Invoice.create(req.body);
    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/finance/invoices/:id/status
router.put('/invoices/:id/status', async (req, res) => {
  try {
    const invoice = await Invoice.updateStatus(req.params.id, req.body.status);
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/finance/invoices/:id
router.delete('/invoices/:id', async (req, res) => {
  try {
    await Invoice.delete(req.params.id);
    res.json({ success: true, message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/finance/budgets/create
router.post('/budgets/create', async (req, res) => {
  try {
    const budget = await Budget.create(req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/finance/budgets
router.get('/budgets', async (req, res) => {
  try {
    const budgets = await Budget.getByProject(req.query.projectId);
    res.json({ success: true, data: budgets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router; // ✅ Must export the router, not an object