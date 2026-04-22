import { useState } from "react";
import "./Measurements.css";

export default function Measurements() {
  const [data, setData] = useState([
    { work: "Brickwork", qty: 50, status: "Pending" }
  ]);

  const updateStatus = (index, status) => {
    const newData = [...data];
    newData[index].status = status;
    setData(newData);
  };

  return (
    <div>
      <h2>Measurements</h2>

      {data.map((item, i) => (
        <div key={i}>
          {item.work} - {item.qty} - {item.status}

          <button onClick={() => updateStatus(i, "Approved")}>
            Approve
          </button>

          <button onClick={() => updateStatus(i, "Rejected")}>
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}