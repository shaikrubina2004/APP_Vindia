import AppLayout from "../../layouts/AppLayout";

function Employees() {

  const employees = [
    { name: "Ravi Kumar", department: "Engineering", role: "Site Engineer" },
    { name: "Meena Sharma", department: "HR", role: "HR Manager" },
    { name: "Arun Das", department: "Marketing", role: "Executive" }
  ];

  return (

    <AppLayout>

      <div className="users-container">

        <h1>Employees</h1>

        <table className="users-table">

          <thead>
            <tr>
              <th>Name</th>
              <th>Department</th>
              <th>Role</th>
            </tr>
          </thead>

          <tbody>

            {employees.map((emp, index) => (

              <tr key={index}>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td>{emp.role}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </AppLayout>

  );

}

export default Employees;