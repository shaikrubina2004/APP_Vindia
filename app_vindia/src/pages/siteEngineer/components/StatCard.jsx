import React from "react";

export default function StatCard({ title, value, color = "#4CAF50" }) {
  return (
    <div style={styles.card}>
      <div>
        <p style={styles.title}>{title}</p>
        <h2 style={{ ...styles.value, color }}>{value ?? 0}</h2>
      </div>

      <div style={styles.circle}>
        {title?.charAt(0)}
      </div>
    </div>
  );
}

const styles = {
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "18px",
    borderRadius: "12px",
    background: "#ffffff",
    boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
    minWidth: "200px",
    transition: "0.3s",
  },
  title: {
    margin: 0,
    fontSize: "14px",
    color: "#777",
  },
  value: {
    margin: "5px 0 0",
    fontSize: "26px",
    fontWeight: "bold",
  },
  circle: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#f1f3f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
};