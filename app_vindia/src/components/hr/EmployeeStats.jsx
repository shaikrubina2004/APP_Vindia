function EmployeeStats({ employees = [] }) {
  const total = employees.length;

  const today = new Date();

  // 🟢 NEW JOINERS (last 30 days)
  const newJoiners = employees.filter(emp => {
    if (!emp.join_date) return false;

    const joinDate = new Date(emp.join_date);
    const diffDays = (today - joinDate) / (1000 * 60 * 60 * 24);

    return diffDays <= 30;
  }).length;

  // 🟢 ACTIVE
  const active = employees.filter(
    emp => emp.status?.toLowerCase() === "active"
  ).length;

  // 🟠 ON LEAVE
  const onLeave = employees.filter(
    emp => emp.status?.toLowerCase() === "on_leave"
  ).length;

  return (
    <div className="hr-stats">

      <div className="stat-card blue">
        <h3>Total Employees</h3>
        <h2>{total}</h2>
      </div>

      <div className="stat-card green">
        <h3>Active</h3>
        <h2>{active}</h2>
      </div>

      <div className="stat-card orange">
        <h3>On Leave</h3>
        <h2>{onLeave}</h2>
      </div>

      <div className="stat-card red">
        <h3>New Joiners</h3>
        <h2>{newJoiners}</h2>
      </div>

    </div>
  );
}

export default EmployeeStats;