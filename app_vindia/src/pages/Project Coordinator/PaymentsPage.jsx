import React from "react";
import "./CoordinatorPages.css";

export default function PaymentsPage() {
  return (
    <div className="page-container">

      <h2>Payments</h2>

      <div className="payment-card">
        <p>Foundation - ₹10,00,000</p>
        <span className="pending">Pending</span>
        <button className="btn">Send Reminder</button>
      </div>

      <div className="payment-card">
        <p>Structure - ₹15,00,000</p>
        <span className="completed">Completed</span>
      </div>

    </div>
  );
}