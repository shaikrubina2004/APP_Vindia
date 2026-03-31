import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { deleteEmployee, getEmployeeById } from "../../services/employeeService";
import "./EmployeeDetails.css";

function EmployeeDetails() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(state || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!state) {
      fetchEmployee();
    }
  }, [state]);

  const fetchEmployee = async () => {
    try {
      setLoading(true);
      const employeeId = id || state?.id;

      if (!employeeId) return;

      const res = await getEmployeeById(employeeId);
      setEmployee(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!employee) return <p>Employee not found</p>;

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

      <div className="details-card">
        <p><strong>ID:</strong> {employee.id}</p>
        <p><strong>Name:</strong> {employee.name}</p>
        <p><strong>Email:</strong> {employee.email}</p>
        <p><strong>Phone:</strong> {employee.phone}</p>
        <p><strong>Department:</strong> {employee.department}</p>
        <p><strong>Designation:</strong> {employee.designation}</p>
        <p><strong>Manager:</strong> {employee.manager_name || "Not Assigned"}</p>
        <p><strong>Address:</strong> {employee.address || "N/A"}</p>
        <p><strong>Status:</strong> {employee.status}</p>
        <p><strong>Joining Date:</strong> {employee.join_date ? new Date(employee.join_date).toLocaleDateString() : "N/A"}</p>
        <p><strong>DOB:</strong> {employee.dob ? new Date(employee.dob).toLocaleDateString() : "N/A"}</p>
        <p><strong>Gender:</strong> {employee.gender}</p>
        <p><strong>Marital Status:</strong> {employee.marital_status}</p>
        <p><strong>Nationality:</strong> {employee.nationality}</p>
        <p><strong>Employee Code:</strong> {employee.employee_code}</p>
        <p><strong>Employment Type:</strong> {employee.employment_type}</p>
        <p><strong>Work Location:</strong> {employee.work_location}</p>
        <p><strong>Shift Timing:</strong> {employee.shift_timing}</p>
        <p><strong>Experience:</strong> {employee.experience}</p>
        <p><strong>Previous Company:</strong> {employee.previous_company}</p>
        <p><strong>Account Number:</strong> {employee.account_no}</p>
        <p><strong>IFSC Code:</strong> {employee.ifsc}</p>
        <p><strong>PAN:</strong> {employee.pan}</p>
        <p><strong>Aadhar:</strong> {employee.aadhar}</p>
      </div>

      <h2>Documents</h2>
      <div className="details-card">

        {/* ✅ PROFILE PHOTO FIXED */}
        {employee.profile_photo && (
          <div>
            <strong>Profile Photo:</strong><br />
            <img
              src={`${FILE_BASE}${employee.profile_photo}`}
              alt="Profile"
              width="120"
              style={{ marginTop: "10px", borderRadius: "8px" }}
            />
          </div>
        )}

        {/* ✅ ID PROOF FIXED */}
        <p>
          <strong>ID Proof:</strong>{" "}
          {employee.id_proof ? (
            <a
              href={`${FILE_BASE}${employee.id_proof}`}
              target="_blank"
              rel="noreferrer"
            >
              View Document
            </a>
          ) : (
            "Not Uploaded"
          )}
        </p>

        {/* ✅ OFFER LETTER FIXED */}
        <p>
          <strong>Offer Letter:</strong>{" "}
          {employee.offer_letter ? (
            <a
              href={`${FILE_BASE}${employee.offer_letter}`}
              target="_blank"
              rel="noreferrer"
            >
              View Document
            </a>
          ) : (
            "Not Uploaded"
          )}
        </p>

        {/* ✅ CERTIFICATES FIXED */}
        <p>
          <strong>Certificates:</strong>{" "}
          {employee.certificates ? (
            <a
              href={`${FILE_BASE}${employee.certificates}`}
              target="_blank"
              rel="noreferrer"
            >
              View Document
            </a>
          ) : (
            "Not Uploaded"
          )}
        </p>

      </div>

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