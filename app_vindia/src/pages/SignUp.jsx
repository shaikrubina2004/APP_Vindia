import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/authService";
import logo from "../assets/logo.png.png";
import "./SignUp.css";

function SignUp() {

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignup = async () => {

    console.log("SIGNUP API HIT ✅"); // ✅ MOVE HERE

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!agree) {
      alert("Please accept Terms & Conditions");
      return;
    }

    try {
      const res = await signup({
        name: formData.firstName + " " + formData.lastName,
        email: formData.email,
        password: formData.password,
      });

      alert(res.data.message);
      navigate("/");

    } catch (error) {
      alert(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="login-bg signup-page">
      <div className="login-card">

        <div className="login-left">
          <img src={logo} alt="Vindia Logo" className="login-logo" />
          <p>
            You Dream It. <span className="build-text">We Build It.</span>
          </p>
        </div>

        <div className="login-right">

          <h2 style={{ marginBottom: "20px" }}>Create Account</h2>

          <label>First Name</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />

          <label>Last Name</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />

          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} />

          <label>Password</label>
          <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} />

          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />

          <label className="remember">
            <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />
            I agree to Terms & Conditions
          </label>

          <button onClick={handleSignup}>Sign Up</button>

          <p className="signup-text">
            Already have an account? <Link to="/" className="signup-link">Sign In</Link>
          </p>

        </div>

      </div>
    </div>
  );
}

export default SignUp;