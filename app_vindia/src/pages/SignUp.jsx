import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../roles";
import logo from "../assets/logo.png";
import "./SignUp.css";

function SignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: ROLES.EMPLOYEE, // default role
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSignup = () => {
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!agree) {
      alert("Please accept Terms & Conditions");
      return;
    }

    // Save user and auto login
    login({
      name: formData.firstName,
      email: formData.email,
      role: formData.role,
    });

    navigate("/dashboard");
  };

  return (
    <div className="signup-container">
      <div className="signup-card">

        <div className="logo-image">
          <img src={logo} alt="Vindia Logo" />
        </div>

        <div className="logo">VINDIA INFRASEC</div>
        <h2 className="signup-title">Create Account</h2>

        <div className="row">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              placeholder="First name"
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              placeholder="Last name"
            />
          </div>
        </div>

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

        {/* 🔥 Role Selection */}
        <div className="form-group">
          <label>Select Role</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
          >
            <option value={ROLES.EMPLOYEE}>Employee</option>
            <option value={ROLES.SITE_ENGINEER}>Site Engineer</option>
            <option value={ROLES.MARKETING}>Marketing</option>
            <option value={ROLES.FINANCE}>Finance</option>
            <option value={ROLES.BDA}>BDA</option>
            <option value={ROLES.CLIENT}>Client</option>
            <option value={ROLES.CEO}>CEO</option>
          </select>
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
            <span
              className="toggle-password"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
          />
        </div>

        <div className="terms">
          <input
            type="checkbox"
            checked={agree}
            onChange={() => setAgree(!agree)}
          />
          <label>I agree to Terms & Conditions</label>
        </div>

        <button className="signup-button" onClick={handleSignup}>
          Sign Up
        </button>

        <p className="signin-link">
          Already have an account? <Link to="/">Sign In</Link>
        </p>

      </div>
    </div>
  );
}

export default SignUp;