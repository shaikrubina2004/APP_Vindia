const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: [
      "CEO",
      "HR",
      "FINANCE",
      "MARKETING",
      "BDA",
      "SITE_ENGINEER",
      "EMPLOYEE",
      "CLIENT"
    ],
    default: null
  },

  status: {
    type: String,
    enum: ["Pending", "Active", "Inactive"],
    default: "Pending"
  }

}, {
  timestamps: true
});

module.exports = mongoose.model("User", userSchema);