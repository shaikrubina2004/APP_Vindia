import { useState } from "react";
import "./Qscostreport.css";

const Qscostreport = () => {

  const [budget] = useState(1000000);

  const boqItems = [
    { item: "Steel", qty: 85, rate: 70000, category: "Material" },
    { item: "Concrete", qty: 120, rate: 5000, category: "Material" },
    { item: "Labour Work", qty: 1, rate: 200000, category: "Labour" },
    { item: "Excavator", qty: 10, rate: 8000, category: "Equipment" },
  ];

  const calculateTotal = (item) => item.qty * item.rate;

  const totalCost = boqItems.reduce((sum, i) => sum + calculateTotal(i), 0);

  const difference = budget - totalCost;

  const getStatus = () => {
    if (totalCost > budget) return "over";
    if (totalCost > budget * 0.8) return "warning";
    return "good";
  };

  const status = getStatus();

  const categoryTotals = {
    Material: 0,
    Labour: 0,
    Equipment: 0,
  };

  boqItems.forEach((i) => {
    categoryTotals[i.category] += calculateTotal(i);
  });

  return (
    <div className="cost-container">

      {/* HEADER */}
      <div className="cost-header">
        <h2>Cost Report</h2>
        <p>Project: Skyline Tower | Date: 23 Apr 2026</p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="cost-cards">

        <div className="card">
          <h4>Total Budget</h4>
          <p>₹{budget.toLocaleString()}</p>
        </div>

        <div className="card">
          <h4>Total Cost</h4>
          <p>₹{totalCost.toLocaleString()}</p>
        </div>

        <div className={`card ${status}`}>
          <h4>Status</h4>
          <p>
            {status === "over"
              ? "Over Budget"
              : status === "warning"
              ? "Near Limit"
              : "Within Budget"}
          </p>
        </div>

        <div className="card">
          <h4>Remaining</h4>
          <p>₹{difference.toLocaleString()}</p>
        </div>

      </div>

      {/* COST BREAKDOWN */}
      <div className="cost-breakdown">
        <h3>Cost Breakdown</h3>

        <div className="breakdown-grid">
          <div className="break-item material">
            Material ₹{categoryTotals.Material.toLocaleString()}
          </div>
          <div className="break-item labour">
            Labour ₹{categoryTotals.Labour.toLocaleString()}
          </div>
          <div className="break-item equipment">
            Equipment ₹{categoryTotals.Equipment.toLocaleString()}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="cost-table">
        <h3>BOQ Cost Details</h3>

        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
              <th>Category</th>
            </tr>
          </thead>

          <tbody>
            {boqItems.map((i, index) => (
              <tr key={index}>
                <td>{i.item}</td>
                <td>{i.qty}</td>
                <td>₹{i.rate}</td>
                <td>₹{calculateTotal(i)}</td>
                <td>{i.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ALERTS */}
      <div className="cost-alerts">
        <h3>Alerts</h3>

        {status === "over" && (
          <p className="alert red">⚠ Cost exceeded budget!</p>
        )}

        {status === "warning" && (
          <p className="alert yellow">⚠ Cost reaching budget limit</p>
        )}

        {status === "good" && (
          <p className="alert green">✔ Cost under control</p>
        )}
      </div>


    
=======
      {/* REMARKS */}
      


    </div>
  );
};

export default Qscostreport;