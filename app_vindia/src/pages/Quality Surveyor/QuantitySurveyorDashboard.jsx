// QuantitySurveyorDashboard.jsx
import "./QuantitySurveyorDashboard.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { Chart, registerables } from "chart.js";
import CheckInButton from "../../SharedResourse/CheckInButton";
// ^ This import assumes QuantitySurveyorDashboard.jsx is 2 folders under
// src/ (e.g. src/pages/QuantitySurveyor/QuantitySurveyorDashboard.jsx),
// matching the other dashboards at that depth. If Vite complains the
// file doesn't exist, recount the folders to src/ and adjust the "../".
Chart.register(...registerables);

const API = "http://localhost:5000";

// ── Auth header helper ──────────────────────────────────────
const authHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  return Math.floor(seconds / 86400) + "d ago";
};

const StatusBadge = ({ status }) => {
  const map = {
    approved:      { cls: "sb-green", label: "Approved" },
    finalised:     { cls: "sb-green", label: "Finalised" },
    pending:       { cls: "sb-amber", label: "Pending" },
    pending_pm:    { cls: "sb-amber", label: "Pending PM" },
    pending_se:    { cls: "sb-blue",  label: "Pending SE" },
    rejected:      { cls: "sb-red",   label: "Rejected" },
    high:          { cls: "sb-red",   label: "High" },
    "In Progress": { cls: "sb-blue",  label: "In Progress" },
    Done:          { cls: "sb-green", label: "Done" },
    Blocked:       { cls: "sb-red",   label: "Blocked" },
    Resolved:      { cls: "sb-green", label: "Resolved" },
    Closed:        { cls: "sb-green", label: "Closed" },
    Created:       { cls: "sb-amber", label: "Created" },
    Assigned:      { cls: "sb-blue",  label: "Assigned" },
  };
  const s = map[status] || { cls: "sb-grey", label: status || "—" };
  return <span className={`sb ${s.cls}`}>{s.label}</span>;
};

export default function QuantitySurveyorDashboard() {
  const navigate = useNavigate();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [dashboard,       setDashboard]      = useState(null);
  const [costReports,     setCostReports]     = useState([]);
  const [quantityReports, setQuantityReports] = useState([]);
  const [boqItems,        setBoqItems]        = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [incidents,       setIncidents]       = useState([]);
  const [loading,         setLoading]         = useState(true);

  // ── Current user, for the check-in button ──────────────────
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
  const employeeId  = currentUser?.employee_id || currentUser?.id || null;
  const designation = currentUser?.designation || currentUser?.role || null;

  // ── Fetch all data ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const headers = authHeaders();

    try {
      const [dashRes, costRes, qtyRes, boqRes, taskRes, incRes] = await Promise.allSettled([
        axios.get(`${API}/api/qs/dashboard`,    { headers }),
        axios.get(`${API}/api/cost-report`,     { headers }),
        axios.get(`${API}/api/quantity-report`, { headers }),
        axios.get(`${API}/api/boq`,             { headers }),
        axios.get(`${API}/api/incidents/tasks`, { headers }),
        axios.get(`${API}/api/incidents`,       { headers }),
      ]);

      if (dashRes.status === "fulfilled") setDashboard(dashRes.value.data?.data);

      if (costRes.status === "fulfilled") {
        const d = costRes.value.data;
        setCostReports(Array.isArray(d) ? d : d?.data || []);
      }
      if (qtyRes.status === "fulfilled") {
        const d = qtyRes.value.data;
        setQuantityReports(Array.isArray(d) ? d : d?.data || []);
      }
      if (boqRes.status === "fulfilled") {
        const d = boqRes.value.data;
        setBoqItems(Array.isArray(d) ? d : d?.data || []);
      }
      if (taskRes.status === "fulfilled") {
        const d = taskRes.value.data;
        setTasks(Array.isArray(d) ? d : d?.data || []);
      }
      if (incRes.status === "fulfilled") {
        const d = incRes.value.data;
        setIncidents(Array.isArray(d) ? d : d?.data || []);
      }
    } catch (err) {
      console.error("fetchAll error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── KPI derived values ──────────────────────────────────────
  const totalCost    = costReports.reduce((s, r) => s + (parseFloat(r.totalCost || r.total_cost) || 0), 0);
  const totalQty     = quantityReports.reduce((s, r) => s + (parseInt(r.totalItems || r.total_items) || 0), 0);
  const totalBoq     = boqItems.length;

  const pendingTasks  = tasks.filter(t =>
    !["Done", "Resolved", "Closed", "done", "resolved", "closed"].includes(t.status)
  );
  const openIncidents = incidents.filter(i =>
    !["Resolved", "Closed", "resolved", "closed"].includes(i.status)
  );

  const totalProjects   = dashboard?.totalProjects || 0;
  const projectLocation = dashboard?.location || "Multiple Sites";

  // ── Chart ───────────────────────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const months   = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const costData = [320, 410, 480, 520, Math.round(totalCost / 1000) || 505, 0];
    const qtyData  = [40, 55, 62, 70, totalQty || 75, 0];

    chartInstance.current = new Chart(chartRef.current, {
      type: "bar",
      data: {
        labels: months,
        datasets: [
          {
            label: "Cost (₹k)",
            data: costData,
            backgroundColor: "rgba(15,31,61,0.82)",
            borderRadius: 6,
            borderSkipped: false,
            yAxisID: "y",
          },
          {
            label: "Quantity Items",
            data: qtyData,
            type: "line",
            borderColor: "#0d9373",
            backgroundColor: "rgba(13,147,115,0.08)",
            borderWidth: 2.5,
            pointBackgroundColor: "#0d9373",
            pointRadius: 4,
            tension: 0.4,
            fill: true,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { font: { size: 11 }, color: "#6b7280", boxWidth: 12 },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: "#9ca3af", font: { size: 11 } },
          },
          y: {
            position: "left",
            grid: { color: "rgba(0,0,0,0.04)" },
            border: { display: false },
            ticks: { color: "#9ca3af", font: { size: 11 }, callback: v => "₹" + v + "k" },
          },
          y1: {
            position: "right",
            grid: { drawOnChartArea: false },
            border: { display: false },
            ticks: { color: "#0d9373", font: { size: 11 } },
          },
        },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [totalCost, totalQty, dashboard]);

  if (loading) return (
    <div className="qs-loading">
      <div className="qs-spinner" />
      <p>Loading dashboard…</p>
    </div>
  );

  return (
    <div className="qs-root">

      {/* ── TOP BAR ── */}
      <header className="qs-topbar">
        <div className="tb-left">
          <h1 className="tb-title">Quantity Surveyor Dashboard</h1>
          <div className="tb-meta">
            <span className="tb-chip">📍 {projectLocation}</span>
            <span className="tb-chip">
              📅 {new Date().toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </span>
            <span className="tb-live-chip">● Live</span>
          </div>
        </div>
        <div className="tb-right">
          {employeeId && (
            <CheckInButton employeeId={employeeId} designation={designation} />
          )}
          <div className="tb-stat">
            <div className="tb-stat-val">{totalProjects}</div>
            <div className="tb-stat-label">Total Projects</div>
          </div>
          <div className="tb-stat">
            <div className="tb-stat-val">{costReports.length}</div>
            <div className="tb-stat-label">Cost Reports</div>
          </div>
          <div className="tb-stat">
            <div className="tb-stat-val">{quantityReports.length}</div>
            <div className="tb-stat-label">Qty Reports</div>
          </div>
          <button className="tb-refresh" onClick={fetchAll} title="Refresh">🔄</button>
        </div>
      </header>

      {/* ── KPI CARDS ── */}
      <section className="qs-kpi-row">

        <div className="qs-kpi-card kpi-navy"
          onClick={() => navigate("/quantity-surveyor/cost-report")}>
          <div className="qk-top">
            <span className="qk-label">Total Cost</span>
            <span className="qk-icon">💰</span>
          </div>
          <div className="qk-value">₹{(totalCost / 100000).toFixed(1)}L</div>
          <div className="qk-foot">{costReports.length} cost reports</div>
        </div>

        <div className="qs-kpi-card kpi-teal"
          onClick={() => navigate("/quantity-surveyor/quantity-report")}>
          <div className="qk-top">
            <span className="qk-label">Total Quantity</span>
            <span className="qk-icon">📐</span>
          </div>
          <div className="qk-value">{totalQty}</div>
          <div className="qk-foot">{quantityReports.length} qty reports</div>
        </div>

        <div className="qs-kpi-card kpi-blue"
          onClick={() => navigate("/quantity-surveyor/boq")}>
          <div className="qk-top">
            <span className="qk-label">BOQ Items</span>
            <span className="qk-icon">📋</span>
          </div>
          <div className="qk-value">{totalBoq}</div>
          <div className="qk-foot">across all milestones</div>
        </div>

        <div className="qs-kpi-card kpi-amber"
          onClick={() => navigate("/quantity-surveyor/incident?page=tasks")}>
          <div className="qk-top">
            <span className="qk-label">Pending Tasks</span>
            <span className="qk-icon">✅</span>
          </div>
          <div className="qk-value">{pendingTasks.length}</div>
          <div className="qk-foot">{tasks.length} total tasks</div>
        </div>

        <div className="qs-kpi-card kpi-red"
          onClick={() => navigate("/quantity-surveyor/incident")}>
          <div className="qk-top">
            <span className="qk-label">Open Incidents</span>
            <span className="qk-icon">⚠️</span>
          </div>
          <div className="qk-value">{openIncidents.length}</div>
          <div className="qk-foot">{incidents.length} total incidents</div>
        </div>

      </section>

      {/* ── QUICK ACTIONS ── */}
      <section className="qs-actions">
        <span className="qa-label">Quick Actions:</span>
        <button className="qa-btn qa-navy"
          onClick={() => navigate("/quantity-surveyor/boq")}>
          + BOQ Item
        </button>
        <button className="qa-btn qa-amber"
          onClick={() => navigate("/quantity-surveyor/incident?page=tasks")}>
          + Task
        </button>
        <button className="qa-btn qa-red"
          onClick={() => navigate("/quantity-surveyor/incident")}>
          + Incident
        </button>
      </section>

      {/* ── CHART + BOQ ── */}
      <div className="qs-row2">

        {/* Cost vs Quantity Chart */}
        <div className="qs-card chart-card">
          <div className="qsc-hd">
            <div>
              <div className="qsc-title">Cost vs Quantity Analysis</div>
              <div className="qsc-sub">Monthly comparison of spending and work progress</div>
            </div>
            <button className="vbtn"
              onClick={() => navigate("/quantity-surveyor/cost-report")}>
              Full Report →
            </button>
          </div>
          <div className="chart-stats-row">
            <div className="cstat">
              <div className="cstat-label">Approved Cost</div>
              <div className="cstat-val navy">
                ₹{(costReports
                  .filter(r => r.status === "approved")
                  .reduce((s, r) => s + (parseFloat(r.totalCost || r.total_cost) || 0), 0) / 100000
                ).toFixed(1)}L
              </div>
            </div>
            <div className="cstat">
              <div className="cstat-label">Pending Cost</div>
              <div className="cstat-val amber">
                ₹{(costReports
                  .filter(r => r.status !== "approved")
                  .reduce((s, r) => s + (parseFloat(r.totalCost || r.total_cost) || 0), 0) / 100000
                ).toFixed(1)}L
              </div>
            </div>
            <div className="cstat">
              <div className="cstat-label">Approved Qty</div>
              <div className="cstat-val teal">
                {quantityReports
                  .filter(r => r.status === "approved")
                  .reduce((s, r) => s + (parseInt(r.totalItems || r.total_items) || 0), 0)} items
              </div>
            </div>
            <div className="cstat">
              <div className="cstat-label">Pending Qty</div>
              <div className="cstat-val blue">
                {quantityReports
                  .filter(r => r.status !== "approved")
                  .reduce((s, r) => s + (parseInt(r.totalItems || r.total_items) || 0), 0)} items
              </div>
            </div>
          </div>
          <div className="chart-wrap">
            <canvas ref={chartRef} />
          </div>
        </div>

        {/* BOQ Summary */}
        <div className="qs-card boq-card">
          <div className="qsc-hd">
            <div className="qsc-title">BOQ Summary</div>
            <button className="vbtn"
              onClick={() => navigate("/quantity-surveyor/boq")}>
              View All →
            </button>
          </div>
          <div className="boq-list">
            {boqItems.length === 0 ? (
              <div className="empty-state">No BOQ items found</div>
            ) : (
              boqItems.slice(0, 6).map((b, i) => (
                <div key={b.id || i} className="boq-row">
                  <div className="boq-left">
                    <div className="boq-num">{String(i + 1).padStart(2, "0")}</div>
                    <div className="boq-info">
                      <div className="boq-name">{b.project_name || b.projectName || "—"}</div>
                      <div className="boq-mile">{b.milestone_name || b.milestoneName || "—"}</div>
                    </div>
                  </div>
                  <div className="boq-right">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── TASKS + INCIDENTS ── */}
      <div className="qs-row3">

        {/* Pending Tasks */}
        <div className="qs-card tasks-card">
          <div className="qsc-hd">
            <div className="qsc-title">Pending Tasks</div>
            <button className="vbtn"
              onClick={() => navigate("/quantity-surveyor/incident?page=tasks")}>
              All Tasks →
            </button>
          </div>
          <table className="qs-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingTasks.length === 0 ? (
                <tr><td colSpan="4" className="empty-td">No pending tasks</td></tr>
              ) : (
                pendingTasks.slice(0, 5).map((t, i) => (
                  <tr key={t.id || i}
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate("/quantity-surveyor/incident?page=tasks")}>
                    <td className="td-title">{t.title}</td>
                    <td className="td-person">
                      {t.assignee_name || t.assigned_to_name || "—"}
                    </td>
                    <td>
                      <span className={`pri-badge pri-${(t.priority || "p2").toLowerCase()}`}>
                        {t.priority || "P2"}
                      </span>
                    </td>
                    <td><StatusBadge status={t.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Recent Incidents */}
        <div className="qs-card incidents-card">
          <div className="qsc-hd">
            <div className="qsc-title">Recent Incidents</div>
            <button className="vbtn"
              onClick={() => navigate("/quantity-surveyor/incident")}>
              All →
            </button>
          </div>
          <div className="inc-list">
            {incidents.length === 0 ? (
              <div className="empty-state">No incidents found</div>
            ) : (
              incidents.slice(0, 5).map((inc, i) => (
                <div key={inc.id || i}
                  className="inc-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate("/quantity-surveyor/incident")}>
                  <div className={`inc-dot ${
                    ["Resolved", "Closed"].includes(inc.status)
                      ? "dot-green"
                      : inc.priority === "P1"
                      ? "dot-red"
                      : "dot-amber"
                  }`} />
                  <div className="inc-body">
                    <div className="inc-title">{inc.title}</div>
                    <div className="inc-meta">
                      <span>{inc.priority || "P2"}</span>
                      <span>·</span>
                      <span>{timeAgo(inc.created_at)}</span>
                    </div>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}