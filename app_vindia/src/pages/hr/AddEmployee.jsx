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
    profile_photo: "",
    account_no: "",
    ifsc: "",
    id_proof: "",
    offer_letter: "",
    certificates: "",
    gov_id_type: "",
    gov_id_number: "",
  });

  const [employees, setEmployees] = useState([]);
  const [managerId, setManagerId] = useState("");
  const [errors, setErrors] = useState({});

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
        gov_id_type: editingEmployee.gov_id_type || "",
gov_id_number: editingEmployee.gov_id_number || "",
        id_proof: editingEmployee.id_proof || "",
        offer_letter: editingEmployee.offer_letter || "",
        certificates: editingEmployee.certificates || "",
      });

      setManagerId(editingEmployee.manager_id || "");
    }
  }, [editingEmployee]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // ✅ Phone validation with real-time feedback
    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;

      if (value.length === 10 && /^[6-9]\d{9}$/.test(value)) {
        setErrors((prev) => ({ ...prev, phone: "" }));
      } else if (value.length === 10) {
        setErrors((prev) => ({ ...prev, phone: "Phone must start with 6-9" }));
      } else {
        setErrors((prev) => ({ ...prev, phone: "Phone number must be 10 digits" }));
      }
    }

    // ✅ Bank Account Number validation (real-time)
    if (name === "account_no") {
      // Allow only digits
      if (!/^\d*$/.test(value)) return;
      
      // Max 18 digits (typical for Indian banks)
      if (value.length > 18) return;
      
      if (value.length >= 9 && value.length <= 18) {
        setErrors((prev) => ({ ...prev, account_no: "" }));
      } else if (value.length > 0) {
        setErrors((prev) => ({ ...prev, account_no: "Account number must be 9-18 digits" }));
      }
    }

    // ✅ IFSC Code validation (real-time)
    if (name === "ifsc") {
  const upperValue = value.toUpperCase();

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

  if (upperValue.length > 11) return;

  if (upperValue.length === 11 && ifscRegex.test(upperValue)) {
    setErrors((prev) => ({ ...prev, ifsc: "" }));
  } else if (upperValue.length === 11) {
    setErrors((prev) => ({ ...prev, ifsc: "Invalid IFSC format (SBIN0001234)" }));
  } else if (upperValue.length > 0) {
    setErrors((prev) => ({ ...prev, ifsc: "IFSC must be 11 characters" }));
  }
}
    if (name === "gov_id_number") {
  const type =
  name === "gov_id_type" ? value : form.gov_id_type;
  let error = "";

  if (type === "pan") {
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) {
      error = "Invalid PAN format (ABCDE1234F)";
    }
  }

  if (type === "aadhar") {
    if (!/^\d{12}$/.test(value)) {
      error = "Aadhaar must be 12 digits";
    }
  }

  if (type === "passport") {
    if (!/^[A-Z0-9]{6,9}$/.test(value.toUpperCase())) {
      error = "Invalid Passport number";
    }
  }

  if (type === "driving") {
    if (!/^[A-Z0-9-]{8,15}$/.test(value.toUpperCase())) {
      error = "Invalid Driving License";
    }
  }
  if (type === "voter") {
  if (!/^[A-Z]{3}[0-9]{7}$/.test(value.toUpperCase())) {
    error = "Invalid Voter ID (ABC1234567)";
  }
}

  setErrors((prev) => ({
    ...prev,
    gov_id_number: error,
  }));
}
   

    // Auto uppercase for ID fields
const finalValue =
  name === "gov_id_number" || name === "ifsc"
    ? value.toUpperCase().trim()
    : value.trimStart();// only trim start for normal fields
setForm((prev) => ({ ...prev, [name]: finalValue }));
  };
  const managerRoles = ["manager", "ceo", "design lead", "bdm"];

  const managers = employees.filter((emp) => {
  const role = emp.designation?.toLowerCase() || "";

  return (
    managerRoles.some((r) => role.includes(r)) &&
    emp.id !== editingEmployee?.id // 🚫 prevent self
  );
});

  const handleFileChange = (e, fieldName) => {
  // 🚫 Block ID proof upload without ID details
  if (fieldName === "id_proof") {

  // ❌ No ID entered
  if (!form.gov_id_type || !form.gov_id_number) {
    alert("Please enter ID type and number first");
    return;
  }

  // ❌ Invalid ID
  if (errors.gov_id_number) {
    alert("Enter a valid ID number first");
    return;
  }

  // ❌ Duplicate ID
  const duplicate = employees.find(
    (emp) =>
      emp.gov_id_number === form.gov_id_number &&
      emp.id !== editingEmployee?.id
  );

  if (duplicate) {
    alert("This ID number already exists. Cannot upload proof.");
    return;
  }
}

  const file = e.target.files[0];
if (file) {
  setForm((prev) => ({
    ...prev,
    [fieldName]: file,
    [`${fieldName}_name`]: file.name,
  }));

  e.target.value = null; // 🔥 fix
}
};

  const validateForm = () => {
    const newErrors = {};

    // Phone validation
    if (!form.phone || !/^[6-9]\d{9}$/.test(form.phone)) {
      newErrors.phone = "Enter valid Indian phone number (10 digits, starts with 6-9)";
    }

    // Required fields
    if (!form.name) newErrors.name = "Name is required";
    if (!form.email) {
  newErrors.email = "Email is required";
} else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
  newErrors.email = "Invalid email format";
}
    if (!form.department) newErrors.department = "Department is required";
    if (!form.role) newErrors.role = "Designation is required";
    if (!form.joining_date) newErrors.joining_date = "Joining date is required";
    if (!form.salary || isNaN(Number(form.salary))) {
  newErrors.salary = "Enter valid salary";
}

    // ✅ Bank Account validation
    if (form.account_no && !/^\d{9,18}$/.test(form.account_no)) {
      newErrors.account_no = "Account number must be 9-18 digits";
    }

    // ✅ IFSC validation
    if (form.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) {
      newErrors.ifsc = "Invalid IFSC format (e.g., SBIN0001234)";
    }

    if (!managerId && form.role.toLowerCase() !== "ceo") {
  newErrors.managerId = "Manager is required";
}
    if (form.gov_id_type && form.gov_id_number) {
  if (form.gov_id_type === "pan" && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(form.gov_id_number)) {
    newErrors.gov_id_number = "Invalid PAN format";
  } 
  // ✅ UNIQUE GOV ID CHECK
const duplicate = employees.find(
  (emp) =>
    emp.gov_id_number?.toUpperCase() === form.gov_id_number.toUpperCase() &&
    emp.id !== editingEmployee?.id
);

if (duplicate) {
  newErrors.gov_id_number = "This ID number already exists";
}


  if (form.gov_id_type === "aadhar" && !/^\d{12}$/.test(form.gov_id_number)) {
    newErrors.gov_id_number = "Aadhaar must be 12 digits";
  }
}
// ✅ ID Proof must match ID number
if (form.id_proof && (!form.gov_id_type || !form.gov_id_number)) {
  newErrors.id_proof = "Select ID type and enter ID number before uploading document";
}
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }
    // 🚫 Final duplicate check
const duplicate = employees.find(
  (emp) =>
    emp.gov_id_number === form.gov_id_number &&
    emp.id !== editingEmployee?.id
);

if (duplicate) {
  alert("Duplicate ID number not allowed");
  return;
}
    // 🚫 Prevent upload if ID proof doesn't match
if (form.id_proof && (!form.gov_id_type || !form.gov_id_number)) {
  alert("Upload ID proof only after entering valid ID details");
  return;
}

    try {
      const formData = new FormData();

      formData.append("name", form.name);
      formData.append("email", form.email);
      formData.append("phone", form.phone);
      formData.append("department", form.department);
      formData.append("designation", form.role);
      formData.append("join_date", form.joining_date);
      formData.append("salary", form.salary ? Number(form.salary) : "");
      formData.append("status", form.status.toLowerCase());
      formData.append("address", form.address);
      formData.append(
  "manager_id",
  managerId ? Number(managerId) : ""
);

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
      formData.append("gov_id_type", form.gov_id_type || "");
formData.append("gov_id_number", form.gov_id_number || "");

      if (form.profile_photo instanceof File)
        formData.append("profile_photo", form.profile_photo);
      if (form.id_proof instanceof File)
        formData.append("id_proof", form.id_proof);
      if (form.offer_letter instanceof File)
        formData.append("offer_letter", form.offer_letter);
      if (form.certificates instanceof File)
        formData.append("certificates", form.certificates);

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
            <div>
              <input 
                name="name" 
                placeholder="Full Name" 
                value={form.name} 
                onChange={handleChange} 
                className={errors.name ? "error" : ""}
                required 
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>
            
            <div>
              <input 
                name="email" 
                placeholder="Email" 
                value={form.email} 
                onChange={handleChange} 
                className={errors.email ? "error" : ""}
                required 
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            
            <div>
              <input 
                name="phone" 
                placeholder="Phone" 
                value={form.phone} 
                onChange={handleChange} 
                className={errors.phone ? "error" : ""}
                maxLength="10"
                required 
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
          </div>
        </div>

        {/* JOB */}
        <div className="form-section">
          <h3>Job Details</h3>
          <div className="grid">
            <div>
              <input 
                name="department" 
                placeholder="Department" 
                value={form.department} 
                onChange={handleChange}
                className={errors.department ? "error" : ""}
                required 
              />
              {errors.department && <span className="error-text">{errors.department}</span>}
            </div>
            
            <div>
              <input 
                name="role" 
                placeholder="Designation" 
                value={form.role} 
                onChange={handleChange}
                className={errors.role ? "error" : ""}
                required 
              />
              {errors.role && <span className="error-text">{errors.role}</span>}
            </div>
            
            <div>
              <input 
                type="date" 
                name="joining_date" 
                value={form.joining_date} 
                onChange={handleChange}
                className={errors.joining_date ? "error" : ""}
                required 
              />
              {errors.joining_date && <span className="error-text">{errors.joining_date}</span>}
            </div>
            
            <div>
              <input 
                name="salary" 
                placeholder="Salary" 
                value={form.salary} 
                onChange={handleChange}
                className={errors.salary ? "error" : ""}
                required 
              />
              {errors.salary && <span className="error-text">{errors.salary}</span>}
            </div>

            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="on_leave">OnLeave</option>
              
            </select>

            
              <div>
  <select 
    value={managerId} 
    onChange={(e) => setManagerId(e.target.value)} 
    className={errors.managerId ? "error" : ""}
  >
    <option value="">Select Reporting Manager</option>
    {managers.map((m) => (
      <option key={m.id} value={m.id}>
        {m.name} ({m.designation})
      </option>
    ))}
  </select>
  {errors.managerId && (
    <span className="error-text">{errors.managerId}</span>
  )}
</div>
            
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

        {/* BANK DETAILS - ✅ With validation */}
        <div className="form-section">
          <h3>Bank Details</h3>
          <div className="grid">
            <div>
              <input 
                name="account_no" 
                placeholder="Account Number" 
                value={form.account_no} 
                onChange={handleChange}
                className={errors.account_no ? "error" : ""}
                maxLength="18"
              />
              {errors.account_no && <span className="error-text">{errors.account_no}</span>}
            </div>
            <div>
              <input 
                name="ifsc" 
                placeholder="IFSC Code (e.g., SBIN0001234)" 
                value={form.ifsc} 
                onChange={handleChange}
                className={errors.ifsc ? "error" : ""}
                maxLength="11"
                style={{ textTransform: 'uppercase' }}
              />
              {errors.ifsc && <span className="error-text">{errors.ifsc}</span>}
            </div>
          </div>
        </div>

        {/* GOVERNMENT IDs */}
        <div className="form-section">
  <h3>Government ID</h3>
  <div className="grid">
    
   <select
  name="gov_id_type"
  value={form.gov_id_type || ""}
  onChange={(e) => {
    console.log("Selected:", e.target.value);
    setForm((prev) => ({
      ...prev,
      gov_id_type: e.target.value,
    }));
  }}
>
  <option value="">Select ID Type</option>
  <option value="pan">PAN Card</option>
  <option value="aadhar">Aadhaar Card</option>
  <option value="passport">Passport</option>
  <option value="driving">Driving License</option>
  <option value="voter">Voter ID</option>
</select>

    <div>
      <input
        name="gov_id_number"
        placeholder="Enter ID Number"
        value={form.gov_id_number}
        onChange={handleChange}
        className={errors.gov_id_number ? "error" : ""}
      />
      {errors.gov_id_number && (
        <span className="error-text">{errors.gov_id_number}</span>
      )}
    </div>

  </div>
</div>

        {/* DOCUMENTS */}
        <div className="form-section">
          <h3>Documents</h3>
          <div className="document-grid">
            {/* Profile Photo, ID Proof, Offer Letter, Certificates - unchanged */}
            <div className="doc-card">
  <p className="doc-title">Profile Photo</p>

  <label className="upload-btn">
    + Upload File
    <input
      type="file"
      onChange={(e) => handleFileChange(e, "profile_photo")}
      accept="application/pdf,image/*"
      hidden
    />
  </label>

  {form.profile_photo_name || form.profile_photo ? (
    <p className="file-name">
      {form.profile_photo_name || ""}
    </p>
  ) : (
    <p className="empty-text">No file selected</p>
  )}

  {/* ✅ SAME AS OFFER LETTER */}
  {editingEmployee && form.profile_photo && typeof form.profile_photo === "string" && (
    <a
      href={`http://localhost:5000/uploads/${form.profile_photo}`}
      target="_blank"
      rel="noreferrer"
      className="view-btn"
    >
      View Document
    </a>
  )}
</div>

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
              {form.id_proof_name || form.id_proof ? (
  <p className="file-name">
    {form.id_proof_name || ""}
  </p>
) : (
  <p className="empty-text">No file selected</p>
)}
              {errors.id_proof && (
  <span className="error-text">{errors.id_proof}</span>
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
              {form.offer_letter_name || form.offer_letter ? (
  <p className="file-name">
    {form.offer_letter_name || ""}
  </p>
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
              {form.certificates_name || form.certificates ? (
  <p className="file-name">
    {form.certificates_name || ""}
  </p>
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