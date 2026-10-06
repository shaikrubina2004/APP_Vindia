import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../../context/useAuth";
import { Link } from "react-router-dom";
import CountUp from "react-countup";
import {
  ClipboardList, ShoppingCart, Truck, Warehouse, CheckCircle2, RefreshCw, ArrowRight,
  FileText, PackageCheck, AlertTriangle, Building2, Inbox, CalendarClock, ShieldCheck,
} from "lucide-react";
import operationsService from "../../../services/operationsService";
import CheckInButton from "../../../SharedResourse/CheckInButton";
import { inr, timeAgo, errorText } from "../shared/opsFormat";
import "../shared/operationsHub.css";

const KpiCard = ({ icon: Icon, label, value, sub, tone, to, prefix }) => {
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className="ops-kpi-card">
      <div className={`ops-kpi-icon ops-tone-${tone}`}><Icon size={22} /></div>
      <div style={{ flex: 1 }}>
        <p className="ops-kpi-label">{label}</p>
        <p className="ops-kpi-value">{prefix}<CountUp end={Number(value) || 0} duration={1} /></p>
        {sub && <p className="hub-kpi-sub">{sub}</p>}
      </div>
      {to && <ArrowRight size={16} color="#cbd5e1" />}
    </Wrapper>
  );
};

const Stage = ({ icon: Icon, tone, count, name, hint, alert, to }) => (
  <Link to={to} className="hub-stage">
    <div className={`hub-stage-dot ops-tone-${tone}`}><Icon size={22} /></div>
    <div className="hub-stage-count"><CountUp end={Number(count) || 0} duration={0.9} /></div>
    <div className="hub-stage-name">{name}</div>
    <div className="hub-stage-hint">{hint}</div>
    {alert > 0 && <div className="hub-stage-alert">{alert} need attention</div>}
  </Link>
);

const FEED_ICON = {
  purchase_order: FileText, delivery: Truck, goods_receipt: PackageCheck, material_request: ClipboardList,
};

const Skeleton = () => (
  <div className="ops-page">
    <div className="ops-skeleton" style={{ height: 28, width: 280 }} />
    <div className="ops-kpi-grid hub-kpi-4">{[...Array(4)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 92 }} />)}</div>
    <div className="ops-skeleton" style={{ height: 170 }} />
    <div className="ops-skeleton" style={{ height: 260 }} />
  </div>
);

export default function OperationsManagerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const employeeName = user?.employee_name || user?.name || "there";

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError("");
    try {
      const res = await operationsService.getDashboard();
      setData(res.data);
    } catch (err) {
      setError(errorText(err, "Failed to load the operations dashboard"));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data && !error) return <Skeleton />;
  if (!data) {
    return (
      <div className="ops-page">
        <div className="ops-alert ops-alert-error">{error}</div>
        <button className="ops-btn ops-btn-outline" style={{ width: "fit-content" }} onClick={() => load()}>Retry</button>
      </div>
    );
  }

  const { requests, purchase_orders: po, deliveries, inventory, office, daily_updates: du, attention } = data;

  return (
    <div className="ops-page">
      <div className="ops-header">
        <div>
          <p className="ops-greeting">{greeting}, {employeeName} 👋</p>
          <h1 className="ops-title">Operations Control Center</h1>
          <p className="ops-subtitle">Requests → purchase → delivery → stock, across every active site</p>
        </div>
        <div className="ops-flex-center">
          <CheckInButton employeeId={user?.id || null} designation={user?.designation || user?.role || null} />
          <button className="ops-icon-btn" onClick={() => load(true)} title="Refresh">
            <RefreshCw size={16} style={refreshing ? { animation: "logd-spin 1s linear infinite" } : undefined} />
          </button>
          <Link to="/operations/manager/approvals" className="ops-btn ops-btn-primary">
            <CheckCircle2 size={16} /> Approvals
          </Link>
        </div>
      </div>

      {data.warnings?.length > 0 && (
        <div className="ops-alert ops-alert-warning">
          Some figures could not be loaded ({data.warnings.map((w) => w.section).join(", ")}). Have the
          database migration run — see <code>backend/migrations/operationsSchema.sql</code>.
        </div>
      )}

      <div className="ops-kpi-grid hub-kpi-4">
        <KpiCard icon={CheckCircle2} tone="amber" label="Pending approvals"
          value={po.pending_approval + requests.requested + office.awaiting_approval}
          sub={`${po.pending_approval} PO · ${requests.requested} requests · ${office.awaiting_approval} office`}
          to="/operations/manager/approvals" />
        <KpiCard icon={ShoppingCart} tone="indigo" label="Open purchase orders"
          value={po.issued + po.partially_fulfilled}
          sub={`${inr(po.month_value)} ordered this month`} to="/operations/manager/procurement" />
        <KpiCard icon={Truck} tone={deliveries.delayed > 0 ? "red" : "sky"} label="Deliveries on the way"
          value={deliveries.on_the_way + deliveries.scheduled}
          sub={deliveries.delayed > 0 ? `${deliveries.delayed} delayed` : `${deliveries.due_today} due today`}
          to="/operations/manager/logistics" />
        <KpiCard icon={Warehouse} tone={inventory.out_of_stock > 0 ? "red" : "emerald"} label="Low / out of stock"
          value={inventory.low_stock + inventory.out_of_stock}
          sub={`${inventory.active_items} active items`} to="/operations/manager/inventory" />
      </div>

      <div className="ops-card">
        <div className="ops-card-header"><h2>Procurement pipeline</h2></div>
        <div className="hub-pipeline">
          <Stage icon={ClipboardList} tone="amber" count={requests.requested} name="Requested"
            hint="awaiting approval" to="/operations/manager/material-requests" />
          <Stage icon={ShieldCheck} tone="sky" count={requests.awaiting_po} name="Approved"
            hint="waiting for a PO" alert={requests.overdue} to="/operations/manager/material-requests" />
          <Stage icon={FileText} tone="indigo" count={po.issued + po.partially_fulfilled + po.pending_approval} name="Purchase order"
            hint={`${po.pending_approval} pending approval`} to="/operations/manager/procurement" />
          <Stage icon={Truck} tone="violet" count={deliveries.scheduled + deliveries.on_the_way + deliveries.delayed} name="Delivery"
            hint={`${deliveries.due_today} due today`} alert={deliveries.delayed} to="/operations/manager/logistics" />
          <Stage icon={PackageCheck} tone="emerald" count={deliveries.pending_receipt} name="Awaiting stock-in"
            hint="delivered, not yet received" to="/operations/manager/inventory" />
        </div>
      </div>

      <div className="hub-grid-2">
        <div className="ops-card">
          <div className="ops-card-header"><h2><AlertTriangle size={16} /> Needs your attention</h2></div>
          {attention.length === 0 ? (
            <div className="hub-all-clear"><CheckCircle2 size={20} /> Nothing needs attention right now.</div>
          ) : (
            <ul className="hub-attention">
              {attention.map((a, i) => (
                <li key={i}>
                  <Link to={a.link}>
                    <span className={`hub-att-bar ${a.severity}`} />
                    <div style={{ flex: 1 }}>
                      <p className="hub-att-title">{a.title}</p>
                      <p className="hub-att-detail">{a.detail}</p>
                    </div>
                    <ArrowRight size={16} color="#cbd5e1" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ops-card">
          <div className="ops-card-header"><h2>Recent activity</h2></div>
          {data.recent_activity.length === 0 ? (
            <div className="ops-empty"><Inbox size={26} />No activity yet.</div>
          ) : (
            <ul className="hub-feed">
              {data.recent_activity.map((e, i) => {
                const Icon = FEED_ICON[e.kind] || FileText;
                return (
                  <li key={i}>
                    <span className="hub-feed-ico"><Icon size={15} /></span>
                    <div className="hub-feed-main"><p><b>{e.ref}</b> · {e.text}</p><small>{timeAgo(e.at)}</small></div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="hub-grid-eq">
        <div className="ops-card">
          <div className="ops-card-header">
            <h2><Warehouse size={16} /> Stock running low</h2>
            <Link to="/operations/manager/inventory" className="ops-btn ops-btn-outline ops-btn-sm">View stock</Link>
          </div>
          {data.low_stock_items.length === 0 ? (
            <div className="ops-empty">All items are above their minimum level.</div>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead><tr><th>Item</th><th>Available</th><th>Minimum</th></tr></thead>
                <tbody>
                  {data.low_stock_items.map((it) => (
                    <tr key={it.item_id}>
                      <td><span className="hub-strong">{it.item_name}</span><br /><span className="ops-muted">{it.item_code}</span></td>
                      <td className={Number(it.total_available_qty) <= 0 ? "hub-late" : ""}>{Number(it.total_available_qty)} {it.unit}</td>
                      <td>{Number(it.minimum_stock)} {it.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="ops-card">
          <div className="ops-card-header">
            <h2><CalendarClock size={16} /> Delayed deliveries</h2>
            <Link to="/operations/manager/logistics" className="ops-btn ops-btn-outline ops-btn-sm">View all</Link>
          </div>
          {data.delayed_deliveries.length === 0 ? (
            <div className="ops-empty">No delayed deliveries.</div>
          ) : (
            <ul className="hub-feed">
              {data.delayed_deliveries.map((d) => (
                <li key={d.id}>
                  <span className="hub-feed-ico" style={{ background: "#fef2f2", color: "#dc2626" }}><Truck size={15} /></span>
                  <div className="hub-feed-main">
                    <p><b>{d.delivery_code}</b> · {d.project_name || "—"} · {d.vendor_name || "No vendor"}</p>
                    <small>{d.delay_reason || "No reason recorded"}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="ops-card">
        <div className="ops-card-header"><h2><Building2 size={16} /> Office &amp; team</h2></div>
        <div className="hub-stat-tiles">
          <Link to="/operations/manager/administration" className="hub-tile" style={{ textDecoration: "none" }}><b>{office.open_requests}</b><span>Open office requests</span></Link>
          <div className="hub-tile"><b>{office.visitors_in}</b><span>Visitors in the office</span></div>
          <div className="hub-tile"><b>{office.assets_in_maintenance}</b><span>Assets in maintenance</span></div>
          <Link to="/operations/manager/daily-updates" className="hub-tile" style={{ textDecoration: "none" }}><b>{du.pending_review}</b><span>Daily updates to review</span></Link>
          <div className="hub-tile"><b>{du.at_risk_today}</b><span>At-risk updates today</span></div>
        </div>
      </div>
    </div>
  );
}
