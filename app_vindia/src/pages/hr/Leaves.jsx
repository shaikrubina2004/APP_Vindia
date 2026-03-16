import AppLayout from "../../layouts/AppLayout";

function Leaves() {

  const leaves = [
    { name: "Ravi", type: "Sick Leave", date: "15 Mar", status: "Pending" },
    { name: "Meena", type: "Casual Leave", date: "18 Mar", status: "Approved" }
  ];

  return (

    <AppLayout>

      <div className="users-container">

        <h1>Leave Requests</h1>

        <table className="users-table">

          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>Date</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>

            {leaves.map((l, index) => (

              <tr key={index}>
                <td>{l.name}</td>
                <td>{l.type}</td>
                <td>{l.date}</td>
                <td>{l.status}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AppLayout>

  );

}

export default Leaves;