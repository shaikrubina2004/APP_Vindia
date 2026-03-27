import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createEmployee, updateEmployee } from "../../services/employeeService";

import "./AddEmployee.css";

export default function AddEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingEmployee = location.state;

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    role: "",
    joining_date: "",
    salary: "",
    status: "active",
    address: ""
  });

  // ✅ Prefill when editing
  useEffect(() => {
    if (editingEmployee) {
      setForm({
        name: editingEmployee.name || "",
        email: editingEmployee.email || "",
        phone: editingEmployee.phone || "",
        department: editingEmployee.department || "",
        role: editingEmployee.role || "",
        joining_date: editingEmployee.joiningDate
          ? editingEmployee.joiningDate.split("T")[0]
          : "",
        salary: editingEmployee.salary || "",
        status: editingEmployee.status || "active",
        address: editingEmployee.address || ""
      });
    }
  }, [editingEmployee]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        department: form.department,
        designation: form.role,
        join_date: form.joining_date,
        salary: Number(form.salary),
        status: form.status.toLowerCase(),
        address: form.address,

        // ✅ IMPORTANT: manager_id handled automatically later
        manager_id: null
      };

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, payload);
        alert("Employee updated successfully ✏️");
      } else {
        await createEmployee(payload);
        alert("Employee added successfully 🚀");
      }

      navigate("/hr/employees");

    } catch (err) {
      console.error(err.response?.data || err);
      alert("Operation failed ❌");
    }
  };

  return (
    <div className="add-employee-page">
      <h2>{editingEmployee ? "Edit Employee" : "Add Employee"}</h2>

      <form className="employee-form" onSubmit={handleSubmit}>
        
        {/* 🔹 BASIC DETAILS */}
        <div className="form-section">
          <h3>Basic Details</h3>
          <div className="grid">
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* 🔹 JOB DETAILS */}
        <div className="form-section">
          <h3>Job Details</h3>
          <div className="grid">
            <input
              name="department"
              placeholder="Department"
              value={form.department}
              onChange={handleChange}
              required
            />
            <input
              name="role"
              placeholder="Role"
              value={form.role}
              onChange={handleChange}
              required
            />
            <input
              type="date"
              name="joining_date"
              value={form.joining_date}
              onChange={handleChange}
              required
            />
            <input
              name="salary"
              placeholder="Salary"
              value={form.salary}
              onChange={handleChange}
              required
            />

            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* 🔹 ADDRESS */}
        <div className="form-section">
          <h3>Address</h3>
          <textarea
            name="address"
            placeholder="Employee Address"
            rows="4"
            value={form.address}
            onChange={handleChange}
          />
        </div>

        <button className="primary-btn" type="submit">
          {editingEmployee ? "Update Employee" : "Save Employee"}
        </button>

      </form>
    </div>
  );
}