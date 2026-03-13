import AppLayout from "../../layout/AppLayout";

function Attendance() {

  const attendance = [
    { name: "Ravi", checkin: "9:05 AM", checkout: "6:00 PM", status: "Present" },
    { name: "Meena", checkin: "9:10 AM", checkout: "-", status: "Present" },
    { name: "Arun", checkin: "-", checkout: "-", status: "Absent" }
  ];

  return (

    <AppLayout>

      <div className="users-container">

        <h1>Attendance</h1>

        <table className="users-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {attendance.map((a, index) => (

              <tr key={index}>
                <td>{a.name}</td>
                <td>{a.checkin}</td>
                <td>{a.checkout}</td>
                <td>{a.status}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AppLayout>

  );

}

export default Attendance;