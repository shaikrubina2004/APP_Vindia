import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginAPI } from "../services/authService";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.png.png";
import "./SignInMobile.css";

function SignInMobile() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  /* 🔥 FORGOT PASSWORD STATE */
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

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

  return (
    <div className="mobile-login">

      {/* LOGO */}
      <img src={logo} alt="Logo" className="mobile-logo" />

      {/* TAGLINE */}
      <p className="mobile-subtitle">
        You Dream It. <span>We Build It.</span>
      </p>

      {/* INPUTS */}
      <input
        type="email"
        name="email"
        placeholder="Enter Email"
        value={formData.email}
        onChange={handleChange}
      />

      <input
        type="password"
        name="password"
        placeholder="Enter Password"
        value={formData.password}
        onChange={handleChange}
      />

      {/* 🔥 FORGOT PASSWORD CLICK */}
      <div
        className="mobile-forgot"
        onClick={() => setShowForgot(true)}
      >
        Forgot password?
      </div>

      {/* BUTTON */}
      <button onClick={handleLogin}>SIGN IN</button>

      {/* FOOTER */}
      <p className="mobile-footer">
        Don't have an account? <Link to="/signup">Sign Up</Link>
      </p>

      {/* 🔥 MODAL */}
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

export default SignInMobile;