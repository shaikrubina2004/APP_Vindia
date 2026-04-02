import { FaBirthdayCake } from "react-icons/fa";

function Birthdays({ data }) {
  if (!data) return <div className="dashboard-card">Loading...</div>;

  return (
    <div className="dashboard-card">
      <h3>Upcoming Birthdays</h3>
      <ul>
        {data.map((b, i) => (
          <li key={i}>
            {b.name} - {new Date(b.dob).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Birthdays;