const User = require("../models/User");
const pool = require("../config/db");

/* GET USERS BY ROLE */
exports.getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.name,
        u.email,
        r.name AS role
      FROM users u
      LEFT JOIN roles r
        ON r.id = u.role_id
      WHERE LOWER(r.name) = LOWER($1)
      ORDER BY u.name ASC
      `,
      [role]
    );

    res.json(result.rows);

  } catch (err) {
    console.error(
      "GET USERS BY ROLE ERROR:",
      err
    );

    res.status(500).json({
      error: "Failed to fetch users",
    });
  }
};
// GET ALL USERS
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ADD USER
exports.addUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const newUser = new User({
      name,
      email,
      password,
      role,
      status: "Active",
    });

    await newUser.save();

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ASSIGN ROLE (CEO approval)
exports.assignRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        role,
        status: "Active",
      },
      { new: true },
    );

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// EDIT USER
exports.updateUser = async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CHANGE STATUS (Active / Inactive)
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
