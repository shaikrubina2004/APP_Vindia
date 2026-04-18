import "./BOQ.css";
import { useEffect, useState } from "react";
import axios from "axios";

function BOQ() {
  const [boqData, setBoqData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchBOQ = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/structural/boq");
        setBoqData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBOQ();
  }, []);

  const totalItems = boqData.length;
  const approvedCount = boqData.filter((b) => b.status === "Approved").length;
  const pendingCount = boqData.filter((b) => b.status === "Pending").length;
  const rejectedCount = boqData.filter((b) => b.status === "Rejected").length;

  const filteredData =
    filter === "All" ? boqData : boqData.filter((b) => b.status === filter);

  const cards = [
    { label: "Total Items", value: totalItems, type: "total" },
    { label: "Approved", value: approvedCount, type: "approved" },
    { label: "Pending", value: pendingCount, type: "pending" },
    { label: "Rejected", value: rejectedCount, type: "rejected" },
  ];

  return (
    <div className="boq-wrapper">
      {/* PAGE HEADER */}
      <div className="boq-header">
        <div className="boq-header-left">
          <span className="boq-breadcrumb">Structural Engineer / BOQ</span>
          <h1 className="boq-title">Bill of Quantities</h1>
        </div>
        <button className="boq-export-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div className="boq-cards-grid">
        {cards.map((card) => (
          <div
            key={card.type}
            className={`boq-card boq-card--${card.type}`}
            onClick={() => setFilter(card.type === "total" ? "All" : card.label)}
          >
            <div className="boq-card-icon">
              {card.type === "total" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
                </svg>
              )}
              {card.type === "approved" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {card.type === "pending" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
              )}
              {card.type === "rejected" && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              )}
            </div>
            <div className="boq-card-body">
              <span className="boq-card-value">{card.value}</span>
              <span className="boq-card-label">{card.label}</span>
            </div>
            <div className="boq-card-bar" />
          </div>
        ))}
      </div>

      {/* TABLE SECTION */}
      <div className="boq-table-section">
        <div className="boq-table-header">
          <div className="boq-table-title-row">
            <h3 className="boq-table-title">BOQ Details</h3>
            {filter !== "All" && (
              <span className="boq-active-filter">
                {filter}
                <button className="boq-clear-filter" onClick={() => setFilter("All")}>×</button>
              </span>
            )}
          </div>
          {/* Filter Tabs */}
          <div className="boq-filter-tabs">
            {["All", "Approved", "Pending", "Rejected"].map((tab) => (
              <button
                key={tab}
                className={`boq-tab ${filter === tab ? "boq-tab--active" : ""}`}
                onClick={() => setFilter(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="boq-table-body">
          {loading ? (
            <div className="boq-loading">
              <div className="boq-spinner" />
              <p>Loading BOQ data...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="boq-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <p>No BOQ data found</p>
              {filter !== "All" && (
                <span>No {filter.toLowerCase()} items available</span>
              )}
            </div>
          ) : (
            <table className="boq-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Project</th>
                  <th>Item</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((item, index) => (
                  <tr key={item.id} className="boq-row">
                    <td className="boq-row-num">{index + 1}</td>
                    <td className="boq-project">{item.project_name}</td>
                    <td className="boq-item">{item.item_name}</td>
                    <td className="boq-qty">{item.quantity}</td>
                    <td className="boq-unit">{item.unit}</td>
                    <td>
                      <span className={`boq-status boq-status--${item.status.toLowerCase()}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && filteredData.length > 0 && (
          <div className="boq-table-footer">
            Showing <strong>{filteredData.length}</strong> of <strong>{totalItems}</strong> items
          </div>
        )}
      </div>
    </div>
  );
}

export default BOQ;