const mongoose = require("mongoose");

const drawingSchema = new mongoose.Schema({
  name: String,
  version: String,
  file_url: String,
  uploaded_by: String,

  status: {
    structural: { type: String, default: "Approved" },
    architect: { type: String, default: "Pending" },
    mep: { type: String, default: "Pending" },
    manager: { type: String, default: "Pending" }
  },

}, { timestamps: true });

module.exports = mongoose.model("Drawing", drawingSchema);