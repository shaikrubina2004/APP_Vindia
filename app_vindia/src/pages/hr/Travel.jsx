import { useState } from "react";
import "./Travel.css";

function Travel() {
  const [empId, setEmpId] = useState("");

  const [employee, setEmployee] = useState({
    name: "",
    id: "",
    dept: "",
    designation: ""
  });

  const [trip, setTrip] = useState({
    project: "",
    purpose: "",
    startDate: "",
    endDate: "",
    origin: "",
    destination: ""
  });

  const [cost, setCost] = useState({
    airfare: "",
    accommodation: "",
    meals: "",
    total: 0
  });

  const [notes, setNotes] = useState("");
  const [approved, setApproved] = useState(false);

  const employees = {
    EMP001: {
      name: "Rahul Sharma",
      dept: "Finance",
      designation: "Analyst",
      trip: {
        project: "Financial Audit",
        purpose: "Client Meeting",
        startDate: "2026-03-20",
        endDate: "2026-03-23",
        origin: "Bengaluru",
        destination: "Mumbai"
      },
      notes: "Met client for quarterly financial review."
    },
    EMP002: {
      name: "Priya Verma",
      dept: "HR",
      designation: "Manager",
      trip: {
        project: "Campus Recruitment",
        purpose: "Recruitment Drive",
        startDate: "2026-04-02",
        endDate: "2026-04-05",
        origin: "Delhi",
        destination: "Hyderabad"
      },
      notes: "Campus hiring and onboarding sessions."
    },
    EMP003: {
      name: "Amit Kumar",
      dept: "IT",
      designation: "Developer",
      trip: {
        project: "Tech Conference 2026",
        purpose: "Tech Conference",
        startDate: "2026-05-10",
        endDate: "2026-05-12",
        origin: "Pune",
        destination: "Chennai"
      },
      notes: "Attended React & AI conference."
    }
  };

  const searchEmployee = () => {
    const emp = employees[empId.toUpperCase()];
    if (!emp) return alert("Employee not found");

    setEmployee({
      id: empId.toUpperCase(),
      name: emp.name,
      dept: emp.dept,
      designation: emp.designation
    });

    setTrip(emp.trip);

    setCost({
      airfare: "",
      accommodation: "",
      meals: "",
      total: 0
    });

    setNotes(emp.notes);
    setApproved(false);
  };

  const handleTripChange = (e) =>
    setTrip({ ...trip, [e.target.name]: e.target.value });

  const handleCostChange = (e) => {
    const { name, value } = e.target;
    if (Number(value) < 0) return;

    const updated = { ...cost, [name]: value };
    updated.total =
      (Number(updated.airfare) || 0) +
      (Number(updated.accommodation) || 0) +
      (Number(updated.meals) || 0);
    setCost(updated);
  };

  const handleApprove = () => {
    setApproved(true);
    alert("Trip cost approved by HR!");
  };

  return (
    <div className="travel-app">
      <div className="travel-app__wrapper">
        <div className="travel-app__container">

          {/* HEADER */}
          <div className="travel-app__header">
            <h1 className="travel-app__header-title">Travel Dashboard</h1>
            <p className="travel-app__header-subtitle">
              Search employee trips, edit travel details & track costs.
            </p>
          </div>

          {/* SEARCH */}
          <div className="travel-app__search">
            <input
              className="travel-app__search-input"
              type="text"
              placeholder="EMPLOYEE ID (e.g., EMP001)"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
            />
            <button
              className="travel-app__search-button"
              onClick={searchEmployee}
            >
              Search
            </button>
          </div>

          {/* DASHBOARD */}
          <div className="travel-app__dashboard travel-app__dashboard--two-column">

            {/* LEFT CARD: Employee + Trip Info */}
            <div className="travel-app__card travel-app__card--left">
              <div className="travel-app__title">Employee & Trip Details</div>

              <div className="travel-app__employee-card">
                <div className="travel-app__employee-row"><span>Name</span><strong>{employee.name || "-"}</strong></div>
                <div className="travel-app__employee-row"><span>ID</span><strong>{employee.id || "-"}</strong></div>
                <div className="travel-app__employee-row"><span>Department</span><strong>{employee.dept || "-"}</strong></div>
                <div className="travel-app__employee-row"><span>Designation</span><strong>{employee.designation || "-"}</strong></div>
              </div>

              <div className="travel-app__trip-section">
                <input className="travel-app__input" type="text" name="project" value={trip.project} onChange={handleTripChange} placeholder="Project Name" />
                <input className="travel-app__input" type="text" name="purpose" value={trip.purpose} onChange={handleTripChange} placeholder="Purpose / Reason for Travel" />

                <div className="travel-app__grid">
                  <input className="travel-app__input" type="date" name="startDate" value={trip.startDate} onChange={handleTripChange} />
                  <input className="travel-app__input" type="date" name="endDate" value={trip.endDate} onChange={handleTripChange} />
                </div>

                <div className="travel-app__grid">
                  <input className="travel-app__input" type="text" name="origin" value={trip.origin} onChange={handleTripChange} placeholder="Origin" />
                  <input className="travel-app__input" type="text" name="destination" value={trip.destination} onChange={handleTripChange} placeholder="Destination" />
                </div>
              </div>
            </div>

            {/* RIGHT CARD: Cost + Notes */}
            <div className="travel-app__card travel-app__card--right">
              <div className="travel-app__title">Cost & Approval</div>

              <div className="travel-app__payroll-breakdown">
                <input className="travel-app__input" type="number" name="airfare" value={cost.airfare} onChange={handleCostChange} placeholder="Airfare / Transport" />
                <input className="travel-app__input" type="number" name="accommodation" value={cost.accommodation} onChange={handleCostChange} placeholder="Accommodation" />
                <input className="travel-app__input" type="number" name="meals" value={cost.meals} onChange={handleCostChange} placeholder="Meals / Per Diem" />

                <div className="travel-app__total-box">
                  <span>Total Cost</span>
                  <span className="travel-app__amount">₹{cost.total.toLocaleString("en-IN")}</span>
                </div>

                <textarea className="travel-app__textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" />

                <button className={`travel-app__search-button ${approved ? "approved" : ""}`} onClick={handleApprove} disabled={approved}>
                  {approved ? "Approved" : "Approve"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Travel;