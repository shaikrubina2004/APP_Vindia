import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login as loginAPI } from "../services/authService";
import { useAuth } from "../context/useAuth";
import logo from "../assets/logo.png";
import "./Auth.css";

function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("Please fill all fields");
      return;
    }

    try {
      const res = await loginAPI({
        email: formData.email,
        password: formData.password,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);

      login(user);

      navigate("/dashboard");

    } catch (error) {
      alert(error.response?.data?.message || "Invalid credentials");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        <img src={logo} alt="Logo" className="logo-img" />
        <h2>Sign In</h2>

        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <button onClick={handleLogin}>Sign In</button>

        <p>
          Don't have an account? <Link to="/signup">Sign Up</Link>
        </p>

      </div>
    </div>
  );
}

export default SignIn;