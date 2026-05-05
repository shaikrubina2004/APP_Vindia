// src/controllers/authController.js
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const { createUser, getUserByEmail } = require("../models/User");

/* ── TOKEN ──────────────────────────────────────────────── */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET || "secret",
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
      role_id: 1,
      status: "active",
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
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { signup, login };