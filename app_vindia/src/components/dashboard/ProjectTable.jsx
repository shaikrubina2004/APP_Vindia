import ProgressBar from "./ProgressBar";

function ProjectTable() {

  const projects = [
    {
      name: "Metro Bridge",
      client: "ABC Infra",
      currentWork: "Foundation Work",
      received: "₹60L",
      spent: "₹35L",
      progress: 45,
      status: "ongoing"
    },
    {
      name: "Highway Construction",
      client: "XYZ Ltd",
      currentWork: "Asphalt Laying",
      received: "₹40L",
      spent: "₹20L",
      progress: 35,
      status: "ongoing"
    },
    {
      name: "Airport Terminal",
      client: "Global Airports",
      currentWork: "Interior Finishing",
      received: "₹1.5Cr",
      spent: "₹1.2Cr",
      progress: 85,
      status: "ongoing"
    },
    {
      name: "Office Tower",
      client: "Skyline Ltd",
      currentWork: "Completed",
      received: "₹90L",
      spent: "₹85L",
      progress: 100,
      status: "completed"
    }
  ];

  // Show only ongoing projects
  const ongoingProjects = projects.filter(
    (project) => project.status === "ongoing"
  );

  return (

    <div className="project-table">

      <h2>Ongoing Projects Overview</h2>

      <table>

        <thead>
          <tr>
            <th>Project</th>
            <th>Client</th>
            <th>Current Work (WBS)</th>
            <th>Amount Received</th>
            <th>Amount Spent</th>
            <th>Progress</th>
          </tr>
        </thead>

        <tbody>

          {ongoingProjects.map((project, index) => (

            <tr key={index}>
              <td>{project.name}</td>
              <td>{project.client}</td>
              <td>{project.currentWork}</td>
              <td>{project.received}</td>
              <td>{project.spent}</td>

              <td>
                <ProgressBar value={project.progress} />
              </td>
            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}

export default ProjectTable;