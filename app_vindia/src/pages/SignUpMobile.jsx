import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png.png";
import "./SignInMobile.css"; // reuse same CSS

function SignUpMobile() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSignup = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    alert("Signup successful!");
    navigate("/");
  };

  return (
    <div className="mobile-login">

      {/* LOGO */}
      <img src={logo} alt="Logo" className="mobile-logo" />

      {/* 🔥 TITLE */}
      <p className="mobile-title">
   <span>Create Account</span>
</p>


      {/* INPUTS */}
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleChange}
      />

      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={formData.email}
        onChange={handleChange}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
      />

      <input
        type="password"
        name="confirmPassword"
        placeholder="Confirm Password"
        value={formData.confirmPassword}
        onChange={handleChange}
      />

      {/* BUTTON */}
      <button onClick={handleSignup}>SIGN UP</button>

      {/* FOOTER */}
      <p className="mobile-footer">
        Already have an account? <Link to="/">Sign In</Link>
      </p>

    </div>
  );
}

export default SignUpMobile;