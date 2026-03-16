import "../../styles/WbsCostTable.css";

function WbsCostTable() {

  const tasks = [
    {
      project: "Apartment Tower",
      task: "Site Preparation",
      material: 100000,
      labour: 50000,
      equipment: 20000,
      status: "Completed"
    },
    {
      project: "Apartment Tower",
      task: "Foundation Work",
      material: 500000,
      labour: 200000,
      equipment: 100000,
      status: "In Progress"
    }
  ];

  return (

    <div className="wbs-section">

      <h2>WBS Cost Tracking</h2>

      <table className="wbs-table">

        <thead>
          <tr>
            <th>Project</th>
            <th>Task</th>
            <th>Material</th>
            <th>Labour</th>
            <th>Equipment</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {tasks.map((task, index) => {

            const total =
              task.material +
              task.labour +
              task.equipment;

            return (

              <tr key={index}>

                <td>{task.project}</td>

                <td>{task.task}</td>

                <td>₹{task.material.toLocaleString()}</td>

                <td>₹{task.labour.toLocaleString()}</td>

                <td>₹{task.equipment.toLocaleString()}</td>

                <td className="total">
                  ₹{total.toLocaleString()}
                </td>

                <td className={
                  task.status === "Completed"
                    ? "status-complete"
                    : "status-progress"
                }>
                  {task.status}
                </td>

              </tr>

            );

          })}

        </tbody>

      </table>

    </div>

  );
}

export default WbsCostTable;