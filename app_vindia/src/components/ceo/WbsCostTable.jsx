import { useState } from "react";

function WbsCostTable() {

  const [wbsTasks] = useState([
    {
      id: 1,
      project: "Apartment Tower",
      task: "Site Preparation",
      material: 100000,
      labor: 50000,
      equipment: 20000,
      status: "Completed"
    },
    {
      id: 2,
      project: "Apartment Tower",
      task: "Foundation Work",
      material: 500000,
      labor: 200000,
      equipment: 100000,
      status: "In Progress"
    }
  ]);

  return (

    <div className="wbs-container">

      <h2>WBS Cost Tracking</h2>

      <table className="wbs-table">

        <thead>
          <tr>
            <th>Project</th>
            <th>Task</th>
            <th>Material Cost</th>
            <th>Labor Cost</th>
            <th>Equipment Cost</th>
            <th>Total Cost</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {wbsTasks.map((task) => {

            const total =
              task.material + task.labor + task.equipment;

            return (

              <tr key={task.id}>

                <td>{task.project}</td>
                <td>{task.task}</td>

                <td>₹{task.material.toLocaleString()}</td>
                <td>₹{task.labor.toLocaleString()}</td>
                <td>₹{task.equipment.toLocaleString()}</td>

                <td>₹{total.toLocaleString()}</td>

                <td>{task.status}</td>

              </tr>

            );

          })}

        </tbody>

      </table>

    </div>

  );

}

export default WbsCostTable;