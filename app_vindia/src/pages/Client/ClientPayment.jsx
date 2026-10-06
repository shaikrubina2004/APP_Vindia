import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
  fmtINR,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const STATUS = {
  paid: { icon: "✓", dot: "pay-dot--paid", pill: "pill--success", label: "Paid" },
  partial: { icon: "◐", dot: "pay-dot--pending", pill: "pill--warning", label: "Part paid" },
  due: { icon: "!", dot: "pay-dot--pending", pill: "pill--danger", label: "Due" },
};

const pct = (a, b) => (b > 0 ? Math.min(100, Math.max(0, (a / b) * 100)) : 0);

function Bar({ label, value, total, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span>{fmtINR(value)} / {fmtINR(total)}</span>
      </div>
      <div style={{ background: "var(--border-light)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ height: 8, borderRadius: 99, background: color, width: `${pct(value, total).toFixed(1)}%`, transition: "width .5s ease" }} />
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
        {pct(value, total).toFixed(1)}% of contract value
      </div>
    </div>
  );
}

export default function ClientPayment() {
  const { data, loading, error, refetch } = useClientAPI("/client/payments");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const schedule = data?.schedule || [];
  const billed = data?.total_billed ?? 0;
  const paid = data?.total_paid ?? 0;
  const pending = data?.total_pending ?? 0;
  const advance = data?.advance ?? 0;
  const budget = data?.budget ?? 0;
  const settled = schedule.filter((b) => b.payment_status === "paid").length;

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Payments</h1>
          <p className="cl-page-sub">Payment status for each finalised milestone invoice</p>
        </div>
      </div>

      <div className="cl-stats" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card__icon">📋</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Contract value</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>{budget ? fmtINR(budget) : "—"}</span>
            <span className="stat-card__sub stat-card__sub--info">As per agreement</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">🧾</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Total billed</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>{fmtINR(billed)}</span>
            <span className="stat-card__sub stat-card__sub--info">{schedule.length} finalised invoice{schedule.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">✅</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Paid</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>{fmtINR(paid)}</span>
            <span className="stat-card__sub stat-card__sub--success">
              {settled} of {schedule.length} settled{advance > 0 ? ` · ${fmtINR(advance)} advance` : ""}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">⏳</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Pending amount</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>{fmtINR(pending)}</span>
            <span className={`stat-card__sub stat-card__sub--${pending > 0 ? "danger" : "success"}`}>
              {pending > 0 ? "Awaiting payment" : "All clear"}
            </span>
          </div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">Payment schedule</span>
          <span className="cl-card__hint">Oldest invoice first</span>
        </div>

        {schedule.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty__icon">💰</div>
            <p>No invoices yet. Your schedule appears as milestones are finalised.</p>
          </div>
        ) : (
          <div className="pay-timeline">
            {schedule.map((b) => {
              const st = STATUS[b.payment_status] || STATUS.due;
              return (
                <div key={b.id} className="pay-item">
                  <div className={`pay-dot ${st.dot}`}>{st.icon}</div>
                  <div className="pay-content">
                    <div className="pay-content__title">{b.milestone_name || `Invoice #${b.id}`}</div>
                    <div className="pay-content__meta">
                      Finalised {fmtDate(b.invoice_date)}
                      {b.paid_amount > 0 ? ` · Paid ${fmtINR(b.paid_amount)}` : ""}
                      {b.balance > 0 ? ` · Balance ${fmtINR(b.balance)}` : ""}
                    </div>
                    <div className="pay-content__amount">{fmtINR(b.amount)}</div>
                  </div>
                  <span className={`pill ${st.pill}`} style={{ flexShrink: 0 }}>{st.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {budget > 0 && (
        <div className="cl-card" style={{ marginTop: 16, padding: 20 }}>
          <div className="cl-card__head" style={{ border: "none", padding: 0, marginBottom: 14 }}>
            <span className="cl-card__title">Contract progress</span>
          </div>
          <Bar label="Billed" value={billed} total={budget} color="var(--accent)" />
          <Bar label="Paid" value={paid} total={budget} color="var(--green)" />
        </div>
      )}
    </div>
  );
}
