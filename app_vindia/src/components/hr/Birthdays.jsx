import { FaBirthdayCake } from "react-icons/fa";

function Birthdays({ data = [] }) {
  return (
    <div className="dashboard-card">
      <h3>
        <FaBirthdayCake className="card-icon" /> Upcoming Birthdays
      </h3>

      <ul>
        {data.length === 0 ? (
          <li>No upcoming birthdays</li>
        ) : (
          data.map((b, i) => (
            <li key={i}>
              {b.name} - {new Date(b.dob).toLocaleDateString()}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default Birthdays;