import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  createEmployee,
  updateEmployee,
  getEmployees,
} from "../../services/employeeService";

import "./AddEmployee.css";

export default function AddEmployee() {
  const navigate = useNavigate();
  const location = useLocation();
  const editingEmployee = location.state;

  const [form, setForm] = useState({
    name: "", email: "", phone: "", department: "", role: "",
    joining_date: "", salary: "", status: "active", address: "",

    dob: "", gender: "", marital_status: "", nationality: "",
    employee_code: "", employment_type: "", work_location: "",
    shift_timing: "", experience: "", previous_company: "",

    // 🔥 NEW FULL FIELDS
    profile_photo: "",
    account_no: "",
    ifsc: "",
    pan: "",
    aadhar: "",
    id_proof: "",
    offer_letter: "",
    certificates: "",
  });

  const [employees, setEmployees] = useState([]);
  const [managerId, setManagerId] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await getEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ PREFILL EDIT
  useEffect(() => {
    if (editingEmployee) {
      setForm({
        name: editingEmployee.name || "",
        email: editingEmployee.email || "",
        phone: editingEmployee.phone || "",
        department: editingEmployee.department || "",
        role: editingEmployee.designation || "",
        joining_date: editingEmployee.join_date?.split("T")[0] || "",
        salary: editingEmployee.salary || "",
        status: editingEmployee.status || "active",
        address: editingEmployee.address || "",

        dob: editingEmployee.dob?.split("T")[0] || "",
        gender: editingEmployee.gender || "",
        marital_status: editingEmployee.marital_status || "",
        nationality: editingEmployee.nationality || "",
        employee_code: editingEmployee.employee_code || "",
        employment_type: editingEmployee.employment_type || "",
        work_location: editingEmployee.work_location || "",
        shift_timing: editingEmployee.shift_timing || "",
        experience: editingEmployee.experience || "",
        previous_company: editingEmployee.previous_company || "",

        profile_photo: editingEmployee.profile_photo || "",
        account_no: editingEmployee.account_no || "",
        ifsc: editingEmployee.ifsc || "",
        pan: editingEmployee.pan || "",
        aadhar: editingEmployee.aadhar || "",
        id_proof: editingEmployee.id_proof || "",
        offer_letter: editingEmployee.offer_letter || "",
        certificates: editingEmployee.certificates || "",
      });

      setManagerId(editingEmployee.manager_id || "");
    }
  }, [editingEmployee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const managers = employees.filter((emp) =>
    emp.designation?.toLowerCase().includes("manager")
  );
  const handleFileChange = (e, fieldName) => {
  const file = e.target.files[0];
  if (file) {
    setForm((prev) => ({
      ...prev,
      [fieldName]: file, // ✅ store actual file
    }));
  }
};


 const handleSubmit = async (e) => {
  e.preventDefault();

  if (editingEmployee && !managerId) {
    alert("Manager is required");
    return;
  }

  try {
    const formData = new FormData();

    // ✅ Append all fields
    formData.append("name", form.name);
    formData.append("email", form.email);
    formData.append("phone", form.phone);
    formData.append("department", form.department);
    formData.append("designation", form.role);
    formData.append("join_date", form.joining_date);
    formData.append("salary", Number(form.salary));
    formData.append("status", form.status.toLowerCase());
    formData.append("address", form.address);
    formData.append("manager_id", editingEmployee ? Number(managerId) : "");

    formData.append("dob", form.dob || "");
    formData.append("gender", form.gender || "");
    formData.append("marital_status", form.marital_status || "");
    formData.append("nationality", form.nationality || "");
    formData.append("employee_code", form.employee_code || "");
    formData.append("employment_type", form.employment_type || "");
    formData.append("work_location", form.work_location || "");
    formData.append("shift_timing", form.shift_timing || "");
    formData.append("experience", form.experience || "");
    formData.append("previous_company", form.previous_company || "");

    formData.append("account_no", form.account_no || "");
    formData.append("ifsc", form.ifsc || "");
    formData.append("pan", form.pan || "");
    formData.append("aadhar", form.aadhar || "");

    // ✅ FILES (only if file selected)
    if (form.profile_photo instanceof File)
      formData.append("profile_photo", form.profile_photo);

    if (form.id_proof instanceof File)
      formData.append("id_proof", form.id_proof);

    if (form.offer_letter instanceof File)
      formData.append("offer_letter", form.offer_letter);

    if (form.certificates instanceof File)
      formData.append("certificates", form.certificates);

    // ✅ API CALL
    if (editingEmployee) {
      await updateEmployee(editingEmployee.id, formData);
      alert("Employee updated successfully ✏️");
    } else {
      await createEmployee(formData);
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

  {/* BASIC */}
  <div className="form-section">
    <h3>Basic Information</h3>
    <div className="grid">
      <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required />
      <input name="email" placeholder="Email" value={form.email} onChange={handleChange} required />
      <input name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} required />
    </div>
  </div>

  {/* JOB */}
  <div className="form-section">
    <h3>Job Details</h3>
    <div className="grid">
      <input name="department" placeholder="Department" value={form.department} onChange={handleChange} required />
      <input name="role" placeholder="Designation" value={form.role} onChange={handleChange} required />
      <input type="date" name="joining_date" value={form.joining_date} onChange={handleChange} required />
      <input name="salary" placeholder="Salary" value={form.salary} onChange={handleChange} required />

      <select name="status" value={form.status} onChange={handleChange}>
        <option value="active">Active</option>
        <option value="on_leave">OnLeave</option>
        <option value="inactive">Inactive</option>
      </select>

      {editingEmployee && (
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)} required>
          <option value="">Select Manager</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.designation} - {m.name}
            </option>
          ))}
        </select>
      )}
    </div>
  </div>

  {/* PERSONAL */}
  <div className="form-section">
    <h3>Personal Details</h3>
    <div className="grid">
      <input type="date" name="dob" value={form.dob} onChange={handleChange} />
      <input name="gender" placeholder="Gender" value={form.gender} onChange={handleChange} />
      <input name="marital_status" placeholder="Marital Status" value={form.marital_status} onChange={handleChange} />
      <input name="nationality" placeholder="Nationality" value={form.nationality} onChange={handleChange} />
    </div>
  </div>

  {/* EMPLOYMENT */}
  <div className="form-section">
    <h3>Employment Details</h3>
    <div className="grid">
      <input name="employee_code" placeholder="Employee Code" value={form.employee_code} onChange={handleChange} />
      <input name="employment_type" placeholder="Employment Type" value={form.employment_type} onChange={handleChange} />
      <input name="work_location" placeholder="Work Location" value={form.work_location} onChange={handleChange} />
      <input name="shift_timing" placeholder="Shift Timing" value={form.shift_timing} onChange={handleChange} />
      <input name="experience" placeholder="Experience (years)" value={form.experience} onChange={handleChange} />
      <input name="previous_company" placeholder="Previous Company" value={form.previous_company} onChange={handleChange} />
    </div>
  </div>

  {/* BANK */}
  <div className="form-section">
    <h3>Bank Details</h3>
    <div className="grid">
      <input name="account_no" placeholder="Account Number" value={form.account_no} onChange={handleChange} />
      <input name="ifsc" placeholder="IFSC Code" value={form.ifsc} onChange={handleChange} />
    </div>
  </div>

  {/* IDS */}
  <div className="form-section">
    <h3>Government IDs</h3>
    <div className="grid">
      <input name="pan" placeholder="PAN Number" value={form.pan} onChange={handleChange} />
      <input name="aadhar" placeholder="Aadhar Number" value={form.aadhar} onChange={handleChange} />
    </div>
  </div>

<div className="form-section">
  <h3>Documents</h3>

  <div className="document-grid">

    {/* PROFILE PHOTO */}
    <div className="doc-card">
      <p className="doc-title">Profile Photo</p>

      <label className="upload-btn">
        + Upload Image
        <input
          type="file"
          onChange={(e) => handleFileChange(e, "profile_photo")}
          accept="image/*"
          hidden
        />
      </label>

      {form.profile_photo_name ? (
        <p className="file-name">{form.profile_photo_name}</p>
      ) : (
        <p className="empty-text">No file selected</p>
      )}

      {editingEmployee && form.profile_photo && typeof form.profile_photo === "string" && (
        <img
          src={`http://localhost:5000/uploads/${form.profile_photo}`}
          alt="Profile"
          className="doc-image"
        />
      )}
    </div>

    {/* ID PROOF */}
    <div className="doc-card">
      <p className="doc-title">ID Proof</p>

      <label className="upload-btn">
        + Upload File
        <input
          type="file"
          onChange={(e) => handleFileChange(e, "id_proof")}
          accept="application/pdf,image/*"
          hidden
        />
      </label>

      {form.id_proof_name ? (
        <p className="file-name">{form.id_proof_name}</p>
      ) : (
        <p className="empty-text">No file selected</p>
      )}

      {editingEmployee && form.id_proof && typeof form.id_proof === "string" && (
        <a
          href={`http://localhost:5000/uploads/${form.id_proof}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View Document
        </a>
      )}
    </div>

    {/* OFFER LETTER */}
    <div className="doc-card">
      <p className="doc-title">Offer Letter</p>

      <label className="upload-btn">
        + Upload File
        <input
          type="file"
          onChange={(e) => handleFileChange(e, "offer_letter")}
          accept="application/pdf,image/*"
          hidden
        />
      </label>

      {form.offer_letter_name ? (
        <p className="file-name">{form.offer_letter_name}</p>
      ) : (
        <p className="empty-text">No file selected</p>
      )}

      {editingEmployee && form.offer_letter && typeof form.offer_letter === "string" && (
        <a
          href={`http://localhost:5000/uploads/${form.offer_letter}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View Document
        </a>
      )}
    </div>

    {/* CERTIFICATES */}
    <div className="doc-card">
      <p className="doc-title">Certificates</p>

      <label className="upload-btn">
        + Upload File
        <input
          type="file"
          onChange={(e) => handleFileChange(e, "certificates")}
          accept="application/pdf,image/*"
          hidden
        />
      </label>

      {form.certificates_name ? (
        <p className="file-name">{form.certificates_name}</p>
      ) : (
        <p className="empty-text">No file selected</p>
      )}

      {editingEmployee && form.certificates && typeof form.certificates === "string" && (
        <a
          href={`http://localhost:5000/uploads/${form.certificates}`}
          target="_blank"
          rel="noreferrer"
          className="view-btn"
        >
          View Document
        </a>
      )}
    </div>

  </div>
</div>
  {/* ADDRESS */}
  <div className="form-section">
    <h3>Address</h3>
    <textarea name="address" rows="4" value={form.address} onChange={handleChange} />
  </div>

  <button className="primary-btn" type="submit">
    {editingEmployee ? "Update Employee" : "Save Employee"}
  </button>
</form>
    </div>
  );
}   