import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { login as loginAPI } from "../services/authService";
import { useAuth } from "../context/useAuth";
import { getDashboardRoute } from "../utils/dashboardRouter";
import logo from "../assets/logo.png.png";
import "./Login.css";

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  // 👁 SHOW/HIDE PASSWORD
  const [showPassword, setShowPassword] = useState(false);

  // ✅ HANDLE INPUT
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ✅ FINAL LOGIN FUNCTION (FIXED)
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await loginAPI(formData);
      const { token, user } = res.data;

      // 🔥 NORMALIZE ROLE (VERY IMPORTANT)
      const userData = {
        ...user,
        role: user.role?.toLowerCase().replace(/\s+/g, "_"),
      };

      console.log("USER DATA:", userData);

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));

      login(userData);

      const route = getDashboardRoute(userData.role);
      console.log("REDIRECT TO:", route);

      navigate(route);
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      alert(error.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* LEFT PANEL */}
        <div className="login-left">
          <img src={logo} alt="Logo" className="login-logo" />

          {/* 🔥 SAME TYPEWRITER ANIMATION AS SIGNUP PAGE */}
          <p className="tagline">
            You Dream It. <span className="build-text">We Build It.</span>
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="login-right">
          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter your Email"
            value={formData.email}
            onChange={handleChange}
          />

          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Enter your Password"
              value={formData.password}
              onChange={handleChange}
            />
            <span
              className="toggle-eye"
              onClick={() => setShowPassword((prev) => !prev)}
              role="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </span>
          </div>

          <div className="login-options">
            <span className="recover" onClick={() => setShowForgot(true)}>
              Forgot password?
            </span>
          </div>

          {/* 🔥 BUTTON (WORKING) */}
          <button
            onClick={handleLogin}
            style={{
              marginTop: "15px",
              padding: "12px",
              width: "100%",
              background: "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            SIGN IN
          </button>

          <p className="signup-text">
            Don't have an account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD */}
      {showForgot && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Reset Password</h3>
            <p>Enter your email to receive reset instructions</p>

            <input
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />

            <div className="modal-buttons">
              <button className="send-btn">Send Link</button>
              <button
                className="cancel-btn"
                onClick={() => setShowForgot(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignIn;