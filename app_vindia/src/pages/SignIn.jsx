import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginAPI } from "../services/authService";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.png.png";
import "./Login.css";

/* ✅ IMPORT MOBILE COMPONENT */
import SignInMobile from "./SignInMobile";

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  /* ✅ MOBILE DETECTION (BEST WAY) */
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* =========================
     FORM STATE
  ========================= */
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  /* =========================
     HANDLE INPUT CHANGE
  ========================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================
     HANDLE LOGIN
  ========================= */
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await loginAPI(formData);
      const { token, user } = res.data;

      localStorage.setItem("token", token);
      login(user);

      navigate("/dashboard");
    } catch (error) {
      alert(error.response?.data?.message || "Invalid credentials");
    }
  };

  /* =========================
     🔥 CONDITIONAL RENDER
  ========================= */

  if (isMobile) {
    return <SignInMobile />;
  }

  /* =========================
     DESKTOP UI
  ========================= */

  return (
    <div className="login-bg">
      <div className="login-card">
        
        {/* LEFT */}
        <div className="login-left">
          <img src={logo} alt="Logo" className="login-logo" />
          <p>
            You Dream It.{" "}
            <span className="build-text">We Build It.</span>
          </p>
        </div>

        {/* RIGHT */}
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
          <input
            type="password"
            name="password"
            placeholder="Enter your Password"
            value={formData.password}
            onChange={handleChange}
          />

          <div className="login-options">
            <span
              className="recover"
              onClick={() => setShowForgot(true)}
            >
              Forgot password?
            </span>
          </div>

          <button onClick={handleLogin}>SIGN IN</button>

          <p className="signup-text">
            Don't have an account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
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
              <button className="send-btn">
                Send Link
              </button>

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