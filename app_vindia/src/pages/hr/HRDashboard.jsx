import AppLayout from "../../layout/AppLayout";

function HRDashboard() {

  return (

    <AppLayout>

      <div className="dashboard-container">

        <h1>HR Dashboard</h1>

        {/* SUMMARY CARDS */}

        <div className="kpi-grid">

          <div className="kpi-card">
            <h4>Total Employees</h4>
            <h2>38</h2>
          </div>

          <div className="kpi-card">
            <h4>Present Today</h4>
            <h2>32</h2>
          </div>

          <div className="kpi-card">
            <h4>On Leave</h4>
            <h2>4</h2>
          </div>

          <div className="kpi-card">
            <h4>New Joiners</h4>
            <h2>3</h2>
          </div>

        </div>

      </div>

    </AppLayout>

  );

}

export default HRDashboard;