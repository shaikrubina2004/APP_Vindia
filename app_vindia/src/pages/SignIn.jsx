import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";
import logo from "../assets/logo.png";
import "./SignIn.css";

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // 🔥 Temporary Role Assignment (For Testing)
  const handleLogin = () => {
    let role;

    // Simple demo logic
    if (formData.email === "ceo@gmail.com") {
      role = ROLES.CEO;
    } else if (formData.email === "finance@gmail.com") {
      role = ROLES.FINANCE;
    } else if (formData.email === "marketing@gmail.com") {
      role = ROLES.MARKETING;
    } else {
      role = ROLES.EMPLOYEE;
    }

    login({
      name: "User",
      email: formData.email,
      role: role,
    });

    navigate("/dashboard");
  };

  return (
    <div className="signin-container">
      <div className="signin-card">

        <div className="logo-section">
          <img src={logo} alt="Vindia Logo" className="logo-img" />
          <h1 className="company-name">VINDIA INFRASEC</h1>
        </div>

        <h2 className="signin-title">Sign In</h2>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        <div className="remember-section">
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember(!remember)}
          />
          <label>Remember Me</label>
        </div>

        <button className="signin-button" onClick={handleLogin}>
          Sign In
        </button>

        <p className="signup-link">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default SignIn;