import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { addEmployee } from "../api/employees"; // later

import "./AddEmployee.css";

export default function AddEmployee() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "",
    joining_date: "",
    salary: "",
    status: "Active",
    address: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // await addEmployee(form);

      alert("Employee added successfully 🚀");
      navigate("/employees");
    } catch (err) {
      console.error(err);
      alert("Failed to add employee ❌");
    }
  };

  return (
    <div className="add-employee-page">

      <h2>Add Employee</h2>

      <form className="employee-form" onSubmit={handleSubmit}>

        {/* BASIC DETAILS */}
        <div className="form-section">
          <h3>Basic Details</h3>

          <div className="grid">
            <input name="name" placeholder="Full Name" onChange={handleChange} required />
            <input name="email" placeholder="Email" onChange={handleChange} required />
            <input name="phone" placeholder="Phone" onChange={handleChange} />
          </div>
        </div>

        {/* JOB DETAILS */}
        <div className="form-section">
          <h3>Job Details</h3>

          <div className="grid">
            <input name="department" placeholder="Department" onChange={handleChange} />
            <input name="role" placeholder="Role" onChange={handleChange} />

            <input type="date" name="joining_date" onChange={handleChange} />

            <input name="salary" placeholder="Salary" onChange={handleChange} />

            <select name="status" onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* ADDRESS */}
        <div className="form-section">
          <h3>Address</h3>

          <textarea
            name="address"
            placeholder="Employee Address"
            rows="4"
            onChange={handleChange}
          />
        </div>

        <button className="primary-btn" type="submit">
          Save Employee
        </button>

      </form>
    </div>
  );
}