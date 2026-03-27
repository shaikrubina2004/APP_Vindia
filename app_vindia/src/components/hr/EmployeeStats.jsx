function EmployeeStats({ employees }) {
  const total = employees.length;

  const today = new Date();

  // ✅ NEW JOINERS (last 30 days)
  const newJoiners = employees.filter(emp => {
    const joinDate = new Date(emp.join_date);

    const diffTime = today - joinDate; // milliseconds
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays <= 30;
  }).length;

  // ✅ ACTIVE (optional improvement)
  const active = employees.filter(emp => emp.status === "active").length;

  // ✅ ON LEAVE (if you have status)
  const onLeave = employees.filter(emp => emp.status === "on_leave").length;

  return (
    <div className="employee-stats">
      <div className="stat-card">
        <h3>Total Employees</h3>
        <p>{total}</p>
      </div>

      <div className="stat-card">
        <h3>Active</h3>
        <p>{active}</p>
      </div>

      <div className="stat-card">
        <h3>On Leave</h3>
        <p>{onLeave}</p>
      </div>

      <div className="stat-card">
        <h3>New Joiners</h3>
        <p>{newJoiners}</p>
      </div>
    </div>
  );
}

export default EmployeeStats;