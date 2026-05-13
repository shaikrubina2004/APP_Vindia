import { useState, useEffect } from "react";
import { createEmployee, updateEmployee } from "../../services/employeeService";
import { getNextEmployeeCode } from "../../services/employeeService";

function AddEmployeeModal({ onClose, onSuccess, employee }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    salary: "",
    join_date: "",
    employee_code: "",
  });

  const [files, setFiles] = useState({
    profile_photo: null,
    id_proof: null,
    offer_letter: null,
    certificates: null,
  });

  // Auto-generate code for new employees
  useEffect(() => {
    if (!employee) {
      getNextEmployeeCode()
        .then((res) => setForm((prev) => ({ ...prev, employee_code: res.data.employee_code })))
        .catch((err) => console.error("Failed to generate employee code", err));
    }
  }, []);

  useEffect(() => {
    if (employee) {
      setForm({
        name: employee.name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        department: employee.department || "",
        designation: employee.designation || "",
        salary: employee.salary || "",
        join_date: employee.join_date || "",
        employee_code: employee.employee_code || "",
      });
    }
  }, [employee]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setFiles({
      ...files,
      [e.target.name]: e.target.files[0],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      // text fields
      Object.keys(form).forEach((key) => {
        formData.append(key, form[key]);
      });

      // file fields
      Object.keys(files).forEach((key) => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });

      let res;
      if (employee) {
        res = await updateEmployee(employee.id, formData);
      } else {
        res = await createEmployee(formData);
      }

      if (res && res.data) {
        onSuccess(res.data.employee || res.data);
        onClose();
      }
    } catch (err) {
      console.error("Save employee failed:", err);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h3>{employee ? "Edit Employee" : "Add Employee"}</h3>

        <form onSubmit={handleSubmit}>
          {/* Employee Code - auto-generated, read-only for new employees */}
          <label>Employee Code</label>
          <input
            name="employee_code"
            placeholder="Auto-generating..."
            value={form.employee_code}
            readOnly={!employee}
            onChange={employee ? handleChange : undefined}
            style={{
              background: employee ? "" : "#f0f4ff",
              color: employee ? "" : "#2563eb",
              fontWeight: "600",
              cursor: employee ? "text" : "default",
            }}
            title={employee ? "Employee Code" : "Auto-generated unique code"}
          />
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
          <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
          <input name="department" placeholder="Department" value={form.department} onChange={handleChange} />
          <input name="designation" placeholder="Role" value={form.designation} onChange={handleChange} />
          <input name="salary" type="number" placeholder="Salary" value={form.salary} onChange={handleChange} />
          <input name="join_date" type="date" value={form.join_date} onChange={handleChange} />

          {/* FILE INPUTS */}
          <label>Profile Photo</label>
          <input type="file" name="profile_photo" onChange={handleFileChange} />

          <label>ID Proof</label>
          <input type="file" name="id_proof" onChange={handleFileChange} />

          <label>Offer Letter</label>
          <input type="file" name="offer_letter" onChange={handleFileChange} />

          <label>Certificates</label>
          <input type="file" name="certificates" onChange={handleFileChange} />

          <div className="modal-buttons">
            <button type="submit">{employee ? "Save" : "Add"}</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEmployeeModal; 