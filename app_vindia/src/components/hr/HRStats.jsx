import { Users, UserCheck, CalendarX, Clock } from "lucide-react";

function HRStats() {
  return (
    <div className="hr-stats">

      <div className="stat-card blue">
        <div className="stat-icon">
          <Users size={22} />
        </div>
        <div>
          <h3>Total Employees</h3>
          <h2>38</h2>
        </div>
      </div>

      <div className="stat-card green">
        <div className="stat-icon">
          <UserCheck size={22} />
        </div>
        <div>
          <h3>Present Today</h3>
          <h2>32</h2>
        </div>
      </div>

      <div className="stat-card orange">
        <div className="stat-icon">
          <CalendarX size={22} />
        </div>
        <div>
          <h3>On Leave</h3>
          <h2>4</h2>
        </div>
      </div>

      <div className="stat-card red">
        <div className="stat-icon">
          <Clock size={22} />
        </div>
        <div>
          <h3>Pending Approvals</h3>
          <h2>3</h2>
        </div>
      </div>

    </div>
  );
}

export default HRStats;