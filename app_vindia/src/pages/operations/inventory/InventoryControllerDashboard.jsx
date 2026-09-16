import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CountUp from "react-countup";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { Package, AlertTriangle, TrendingDown, TrendingUp, ClipboardList, Boxes, ArrowRight, RefreshCw } from "lucide-react";
import { getInventoryDashboard } from "../../../services/inventoryService";
import "./InventoryControllerDashboard.css";

const DashboardSkeleton = () => (
  <div className="ops-page">
    <div className="ops-skeleton" style={{ height: 28, width: 260 }} />
    <div className="ops-kpi-grid">
      {[...Array(5)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 92 }} />)}
    </div>
    <div className="ops-skeleton" style={{ height: 260 }} />
  </div>
);

const KpiCard = ({ icon: Icon, label, value, tone, to }) => {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className="ops-kpi-card">
      <div className={`ops-kpi-icon ops-tone-${tone}`}><Icon size={22} /></div>
      <div style={{ flex: 1 }}>
        <p className="ops-kpi-label">{label}</p>
        <p className="ops-kpi-value"><CountUp end={Number(value) || 0} duration={1.1} separator="," /></p>
      </div>
      {to && <ArrowRight size={16} className="invd-card-arrow" />}
    </Wrapper>
  );
};

const InventoryControllerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    getInventoryDashboard()
      .then((res) => { setData(res.data); setError(""); })
      .catch(() => setError("Failed to load dashboard"))
      .finally(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="ops-page">
        <div className="ops-alert ops-alert-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button className="ops-btn ops-btn-danger ops-btn-sm" onClick={() => { setLoading(true); load(); }}>Retry</button>
        </div>
      </div>
    );
  }

  const chartData = data.low_stock_items.map((it) => ({
    name: it.item_name.length > 12 ? it.item_name.slice(0, 12) + "…" : it.item_name,
    available: Number(it.total_available_qty),
    minimum: Number(it.minimum_stock),
  }));

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <h1 className="ops-title">Inventory Dashboard</h1>
          <p className="ops-subtitle">Live overview across all sites</p>
        </div>
        <div className="ops-flex-center">
          <button className="ops-icon-btn" onClick={() => load(true)} title="Refresh">
            <RefreshCw size={16} className={refreshing ? "invd-spin" : ""} />
          </button>
          <Link to="/operations/inventory/stock-in" className="ops-btn ops-btn-primary">Receive Delivery</Link>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <KpiCard icon={Boxes} label="Active Items" value={data.total_items} tone="indigo" to="/operations/inventory" />
        <KpiCard icon={AlertTriangle} label="Low Stock" value={data.low_stock} tone="amber" to="/operations/inventory/stock-out" />
        <KpiCard icon={AlertTriangle} label="Out of Stock" value={data.out_of_stock} tone="red" to="/operations/inventory/stock-out" />
        <KpiCard icon={TrendingUp} label="Received Today" value={data.received_today} tone="emerald" />
        <KpiCard icon={TrendingDown} label="Issued Today" value={data.issued_today} tone="sky" />
      </div>

      {data.pending_receipts > 0 && (
        <Link to="/operations/inventory/stock-in" className="invd-pending-strip">
          <div className="ops-flex-center">
            <ClipboardList size={20} className="invd-pending-icon" />
            <p>
              <strong><CountUp end={data.pending_receipts} duration={0.8} /></strong> deliverie(s) marked delivered by Logistics are waiting for Goods Receipt.
            </p>
          </div>
          <span className="invd-pending-cta">Review <ArrowRight size={14} /></span>
        </Link>
      )}

      <div className="invd-grid">
        <div className="ops-card invd-chart-card">
          <div className="ops-card-header">
            <h2><Package size={18} /> Low Stock — Available vs Minimum</h2>
          </div>
          {chartData.length === 0 ? (
            <div className="ops-empty">Nothing is low on stock right now 🎉</div>
          ) : (
            <div style={{ height: 260, padding: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="available" radius={[6, 6, 0, 0]}>
                    {chartData.map((d, i) => <Cell key={i} fill={d.available <= 0 ? "#ef4444" : "#f59e0b"} />)}
                  </Bar>
                  <Bar dataKey="minimum" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="ops-card invd-reorder-card">
          <div className="ops-card-header"><h2>Needs Reorder</h2></div>
          {data.low_stock_items.length === 0 ? (
            <div className="ops-empty">All items are within healthy stock levels.</div>
          ) : (
            <ul className="invd-reorder-list ops-scrollbar">
              {data.low_stock_items.map((it) => {
                const pct = it.minimum_stock > 0 ? Math.min(100, (Number(it.total_available_qty) / Number(it.minimum_stock)) * 100) : 0;
                const critical = Number(it.total_available_qty) <= 0;
                return (
                  <li key={it.item_id} className="invd-reorder-item">
                    <div className="invd-reorder-row">
                      <span className="invd-reorder-name">{it.item_name}</span>
                      <span className={critical ? "invd-reorder-qty-critical" : "invd-reorder-qty-warning"}>
                        {it.total_available_qty} / {it.minimum_stock} {it.unit}
                      </span>
                    </div>
                    <div className="ops-progress-track">
                      <div className={`ops-progress-fill ${critical ? "ops-fill-red" : "ops-fill-amber"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryControllerDashboard;