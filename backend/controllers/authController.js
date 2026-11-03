// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const pool   = require("../config/db");
const { createUser, getUserByEmail } = require("../models/User");

/* ── TOKEN ──────────────────────────────────────────────── */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

/* ── SIGNUP ─────────────────────────────────────────────── */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const trimmedName  = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await createUser({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role_id: null,       // ✅ was: 1
      status: "pending",   // ✅ was: "active" — admin should activate
    });

    res.status(201).json({ message: "Signup successful", user });

  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ── LOGIN ──────────────────────────────────────────────── */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await getUserByEmail(trimmedEmail);

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // ── FIX: was user.role_code (column doesn't exist).
    //         getUserByEmail already JOINs roles and returns
    //         r.name AS role — so user.role is the role name.
    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id:     user.id,
        name:   user.name,
        email:  user.email,
        role:   user.role,    // ← was user.role_code — FIXED
        status: user.status,
        // true while the person is still on the temporary password they were
        // emailed — the app then invites them to set their own.
        must_change_password: user.must_change_password === true,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/* ── CHANGE PASSWORD (logged-in user changes THEIR OWN password) ───────────
   POST /api/auth/change-password
   Body: { currentPassword, newPassword }
   Only the password changes — the login ID (email) and employee ID never do.
──────────────────────────────────────────────────────────────────────── */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Current password and new password are required" });
    }
    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "New password must be at least 8 characters" });
    }
    if (newPassword.length > 72) {
      return res
        .status(400)
        .json({ message: "New password must be 72 characters or fewer" });
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      return res
        .status(400)
        .json({ message: "New password must include at least one letter and one number" });
    }
    if (newPassword === currentPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from the current one" });
    }

    const found = await pool.query("SELECT password FROM users WHERE id = $1", [
      req.user.id,
    ]);
    if (found.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const matches = await bcrypt.compare(currentPassword, found.rows[0].password);
    if (!matches) {
      // 400 (not 401) so the app does not treat this as an expired login
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      `UPDATE users
          SET password = $1, must_change_password = FALSE, password_changed_at = NOW()
        WHERE id = $2`,
      [hashed, req.user.id]
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login, changePassword };