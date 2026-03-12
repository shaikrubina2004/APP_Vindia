function ProjectTable() {
  return (
    <div style={{ marginTop: "40px" }}>
      <h2>Project Overview</h2>

      <table style={{ width: "100%", marginTop: "15px" }}>
        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Status</th>
            <th>Budget</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Metro Bridge</td>
            <td>ABC Infra</td>
            <td>Active</td>
            <td>₹1.2Cr</td>
          </tr>

          <tr>
            <td>Road Construction</td>
            <td>PQR Ltd</td>
            <td>Completed</td>
            <td>₹50L</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ProjectTable;