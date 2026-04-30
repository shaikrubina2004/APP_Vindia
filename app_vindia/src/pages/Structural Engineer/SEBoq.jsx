// FILE PATH: src/pages/Structural Engineer/SEBoq.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Structural Engineer – Bill of Quantities (read-only view).
// Data comes from GET /api/boq.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import "./SEBoq.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
  return localStorage.getItem("token") || localStorage.getItem("authToken") || "";
}

export default function SEBoq() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE}/api/boq`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalCost = items.reduce(
    (sum, it) => sum + parseFloat(it.quantity || 0) * parseFloat(it.unit_rate || 0),
    0
  );

  return (
    <div className="se-boq-container">
      <div className="se-boq-header">
        <h1 className="se-boq-title">📋 Bill of Quantities</h1>
        <span className="se-boq-badge">{items.length} items</span>
      </div>

      {loading && <p className="se-boq-msg">Loading BOQ…</p>}
      {error   && <p className="se-boq-msg error">⚠️ {error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="se-boq-msg">No BOQ items found.</p>
      )}

      {!loading && items.length > 0 && (
        <>
          <div className="se-boq-table-wrapper">
            <table className="se-boq-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Unit Rate (₹)</th>
                  <th>Total (₹)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const total = parseFloat(item.quantity || 0) * parseFloat(item.unit_rate || 0);
                  return (
                    <tr key={item.id}>
                      <td>{idx + 1}</td>
                      <td className="item-name">{item.item_name}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td>{Number(item.unit_rate).toLocaleString("en-IN")}</td>
                      <td className="amount">{total.toLocaleString("en-IN")}</td>
                      <td>
                        <span className={`status-chip ${item.status || "pending"}`}>
                          {item.status || "pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="total-label">Grand Total</td>
                  <td className="total-amount">
                    ₹ {totalCost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}