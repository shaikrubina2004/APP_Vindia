const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, getUserByEmail } = require("../models/User");

/* GENERATE TOKEN */
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role_code },
    process.env.JWT_SECRET,
    { expiresIn: "1d" },
  );
};

/* SIGNUP (PUBLIC USER REGISTRATION) */
const signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const trimmedName = String(name).trim();
    const trimmedEmail = String(email).trim().toLowerCase();
    const trimmedPassword = String(password);

    // 🔥 Check existing user
    const existingUser = await getUserByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(trimmedPassword, 10);

    // 🔥 Create user WITHOUT role
    const user = await createUser({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      role_id: null, // ❗ No role assigned
      status: "pending", // ❗ Waiting for CEO approval
    });

    return res.status(201).json({
      message: "Signup successful. Wait for admin approval.",
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* LOGIN */
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const trimmedEmail = String(email).trim().toLowerCase();

    const user = await getUserByEmail(trimmedEmail);
    console.log("USER:", user); // 🔥 DEBUG

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 🔐 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 🔥 BLOCK LOGIN IF NOT APPROVED
    if (!user.role_id) {
      return res.status(403).json({
        message: "Your account is not approved yet. Please wait for admin.",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role_code, // comes from roles table
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = {
  signup,
  login,
};
