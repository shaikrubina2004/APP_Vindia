import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { deleteEmployee, getEmployeeById } from "../../services/employeeService";
import "./EmployeeDetails.css";

function EmployeeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ ALWAYS FETCH FULL DATA FROM BACKEND
  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);

      const res = await getEmployeeById(id);
      console.log("FULL EMPLOYEE DATA:", res.data); // ✅ DEBUG

      setEmployee(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (!employee) return <p className="not-found">Employee not found</p>;

  const handleDelete = async () => {
    try {
      await deleteEmployee(employee.id);
      navigate("/hr/employees");
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ BASE URL FOR FILES
  const FILE_BASE = "http://localhost:5000/uploads/";

  return (
    <div className="employee-details-page">
      <h1>Employee Details</h1>

      {/* ✅ INFO GRID */}
      <div className="details-card">
        <div className="details-grid">
          <p><strong>ID:</strong> {employee.id}</p>
          <p><strong>Name:</strong> {employee.name}</p>
          <p><strong>Email:</strong> {employee.email}</p>
          <p><strong>Phone:</strong> {employee.phone}</p>
          <p><strong>Department:</strong> {employee.department}</p>
          <p><strong>Designation:</strong> {employee.designation}</p>
          <p><strong>Manager:</strong> {employee.manager_name || "Not Assigned"}</p>
          <p><strong>Address:</strong> {employee.address || "N/A"}</p>
          <p><strong>Status:</strong> {employee.status}</p>

          <p><strong>Joining Date:</strong> 
            {employee.join_date ? new Date(employee.join_date).toLocaleDateString() : "N/A"}
          </p>

          <p><strong>DOB:</strong> 
            {employee.dob ? new Date(employee.dob).toLocaleDateString() : "N/A"}
          </p>

          <p><strong>Gender:</strong> {employee.gender || "N/A"}</p>
          <p><strong>Marital Status:</strong> {employee.marital_status || "N/A"}</p>
          <p><strong>Nationality:</strong> {employee.nationality || "N/A"}</p>

          <p><strong>Employee Code:</strong> {employee.employee_code || "N/A"}</p>
          <p><strong>Employment Type:</strong> {employee.employment_type || "N/A"}</p>
          <p><strong>Work Location:</strong> {employee.work_location || "N/A"}</p>
          <p><strong>Shift Timing:</strong> {employee.shift_timing || "N/A"}</p>
          <p><strong>Experience:</strong> {employee.experience || "N/A"}</p>
          <p><strong>Previous Company:</strong> {employee.previous_company || "N/A"}</p>

          <p><strong>Account Number:</strong> {employee.account_no || "N/A"}</p>
          <p><strong>IFSC Code:</strong> {employee.ifsc || "N/A"}</p>
          <p><strong>PAN:</strong> {employee.pan || "N/A"}</p>
          <p><strong>Aadhar:</strong> {employee.aadhar || "N/A"}</p>

          <p><strong>Salary:</strong> ₹{employee.salary?.toLocaleString() || "N/A"}</p>
        </div>
      </div>

      {/* ✅ DOCUMENTS */}
      <h2>Documents</h2>
      <div className="details-card">
        <div className="document-grid">
          
          {/* Profile Photo */}
          {employee.profile_photo && (
            <div className="doc-item">
              <strong>Profile Photo</strong>
              <img
                src={`${FILE_BASE}${employee.profile_photo}`}
                alt="Profile"
                className="profile-img"
              />
            </div>
          )}

          {/* ID Proof */}
          <div className="doc-item">
            <strong>ID Proof</strong>
            {employee.id_proof ? (
              <a 
                href={`${FILE_BASE}${employee.id_proof}`}
                target="_blank" 
                rel="noreferrer" 
                className="doc-link"
              >
                View Document
              </a>
            ) : (
              <span className="no-doc">Not Uploaded</span>
            )}
          </div>

          {/* Offer Letter */}
          <div className="doc-item">
            <strong>Offer Letter</strong>
            {employee.offer_letter ? (
              <a 
                href={`${FILE_BASE}${employee.offer_letter}`}
                target="_blank" 
                rel="noreferrer" 
                className="doc-link"
              >
                View Document
              </a>
            ) : (
              <span className="no-doc">Not Uploaded</span>
            )}
          </div>

          {/* Certificates */}
          <div className="doc-item">
            <strong>Certificates</strong>
            {employee.certificates ? (
              <a 
                href={`${FILE_BASE}${employee.certificates}`}
                target="_blank" 
                rel="noreferrer" 
                className="doc-link"
              >
                View Document
              </a>
            ) : (
              <span className="no-doc">Not Uploaded</span>
            )}
          </div>

        </div>
      </div>

      {/* ✅ ACTION BUTTONS */}
      <div className="action-buttons">
        <button
          className="edit-btn"
          onClick={() => navigate("/hr/add-employee", { state: employee })}
        >
          Edit
        </button>

        <button
          className="delete-btn"
          onClick={handleDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default EmployeeDetails;