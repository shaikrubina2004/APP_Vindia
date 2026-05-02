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
    confirmPassword: "",
  });

  const [agree, setAgree] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async () => {
    const { firstName, lastName, email, password, confirmPassword } = formData;

    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!agree) {
      alert("Please accept Terms & Conditions");
      return;
    }

    try {
      const res = await signup({
        name: firstName + " " + lastName,
        email,
        password,
      });
      alert(res.data.message);
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Signup failed");
    }
  };

  return (
    <div className="signup-bg">
      <div className="signup-card">

        {/* LEFT PANEL */}
        <div className="signup-left">
          <img src={logo} alt="Vindia Logo" className="signup-logo" />
          <p>You Dream It. <span className="build-text">We Build It.</span></p>
        </div>

        {/* RIGHT PANEL */}
        <div className="signup-right">
          <h2>Create Account</h2>

          <label>First Name</label>
          <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />

          <label>Last Name</label>
          <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />

          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} />

          <label>Password</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} />

          <label>Confirm Password</label>
          <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />

          <label className="remember">
            <input type="checkbox" checked={agree} onChange={() => setAgree(!agree)} />
            I agree to Terms & Conditions
          </label>

          <button onClick={handleSignup}>SIGN UP</button>

          <p className="signup-footer-text">
            Already have an account?{" "}
            <Link to="/" className="signup-link">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignUp;