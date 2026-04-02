import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { deleteEmployee, getEmployeeById } from "../../services/employeeService";
import "./EmployeeDetails.css";

function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeById(id);
      setEmployee(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (!employee) return <p className="not-found">Employee not found</p>;

  const FILE_BASE = "http://localhost:5000/uploads/";

  return (
    <div className="employee-details-page">

      {/* 🔥 PROFILE HEADER */}
      <div className="profile-header">
        <img
          src={
            employee.profile_photo
              ? `${FILE_BASE}${employee.profile_photo}`
              : "/default.png"
          }
          alt="Profile"
          className="profile-avatar"
        />

        <div>
          <h2>{employee.name}</h2>
          <p>{employee.designation} • {employee.department}</p>
          <span className={`status-${employee.status}`}>
            {employee.status}
          </span>
        </div>
      </div>

      {/* 🔥 BASIC INFO */}
      <div className="details-card">
        <h3>Basic Information</h3>

        <div className="details-grid">
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Phone:</strong> {employee.phone}</p>
          <p><strong>Manager:</strong> {employee.manager_name || "N/A"}</p>
          <p><strong>Address:</strong> {employee.address || "N/A"}</p>
          <p><strong>Joining Date:</strong> {new Date(employee.join_date).toLocaleDateString()}</p>
          <p><strong>DOB:</strong> {employee.dob ? new Date(employee.dob).toLocaleDateString() : "N/A"}</p>
        </div>
      </div>

      {/* 🔥 WORK INFO */}
      <div className="details-card">
        <h3>Work Details</h3>

        <div className="details-grid">
          <p><strong>Employee Code:</strong> {employee.employee_code}</p>
          <p><strong>Employment Type:</strong> {employee.employment_type}</p>
          <p><strong>Work Location:</strong> {employee.work_location}</p>
          <p><strong>Shift:</strong> {employee.shift_timing}</p>
          <p><strong>Experience:</strong> {employee.experience}</p>
          <p><strong>Previous Company:</strong> {employee.previous_company}</p>
        </div>
      </div>

      {/* 🔥 FINANCE */}
      <div className="details-card">
        <h3>Finance Details</h3>

        <div className="details-grid">
          <p><strong>Salary:</strong> ₹{employee.salary}</p>
          <p><strong>Account No:</strong> {employee.account_no}</p>
          <p><strong>IFSC:</strong> {employee.ifsc}</p>
          <p><strong>PAN:</strong> {employee.pan}</p>
          <p><strong>Aadhar:</strong> {employee.aadhar}</p>
        </div>
      </div>

      {/* 🔥 DOCUMENTS */}
      <div className="details-card">
        <h3>Documents</h3>

        <div className="document-grid">

          <div className="doc-item">
            <p>ID Proof</p>
            {employee.id_proof ? (
              <a href={`${FILE_BASE}${employee.id_proof}`} target="_blank">View</a>
            ) : "Not uploaded"}
          </div>

          <div className="doc-item">
            <p>Offer Letter</p>
            {employee.offer_letter ? (
              <a href={`${FILE_BASE}${employee.offer_letter}`} target="_blank">View</a>
            ) : "Not uploaded"}
          </div>

          <div className="doc-item">
            <p>Certificates</p>
            {employee.certificates ? (
              <a href={`${FILE_BASE}${employee.certificates}`} target="_blank">View</a>
            ) : "Not uploaded"}
          </div>

        </div>
      </div>

      {/* 🔥 ACTIONS */}
      <div className="action-buttons">
        <button
          className="edit-btn"
          onClick={() => navigate("/hr/add-employee", { state: employee })}
        >
          Edit
        </button>

        <button className="delete-btn" onClick={() => deleteEmployee(employee.id)}>
          Delete
        </button>
      </div>

    </div>
  );
}

export default EmployeeDetails;