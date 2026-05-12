import {
  useClientAPI,
  PageLoader,
  PageError,
  fmtDate,
  fmtINR,
} from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

function derivePaymentStatus(boq) {
  const s = boq.status || "";
  if (["finalised", "finalized"].includes(s)) return "paid";
  if (["pending_pm", "pending_se", "approved_by_pm"].includes(s))
    return "pending";
  return "upcoming";
}

const DOT_MAP = {
  paid: "pay-dot--paid",
  pending: "pay-dot--pending",
  upcoming: "pay-dot--upcoming",
};
const PILL_MAP = {
  paid: "pill--success",
  pending: "pill--warning",
  upcoming: "pill--neutral",
};
const ICON_MAP = { paid: "✓", pending: "!", upcoming: "○" };

export default function ClientPayment() {
  const { data, loading, error, refetch } = useClientAPI("/client/payments");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const schedule = data?.schedule || [];
  const totalBilled = data?.total_billed ?? 0;
  const totalPaid = data?.total_paid ?? 0;
  const totalPending = data?.total_pending ?? 0;
  const budget = data?.budget ?? 0;

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Payments</h1>
          <p className="cl-page-sub">Payment schedule for your project</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div
        className="cl-stats"
        style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 24 }}
      >
        <div className="stat-card">
          <div className="stat-card__icon">📋</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Total contract value</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {budget ? fmtINR(budget) : "—"}
            </span>
            <span className="stat-card__sub stat-card__sub--info">
              As per agreement
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">✅</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Total billed</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {fmtINR(totalBilled)}
            </span>
            <span className="stat-card__sub stat-card__sub--success">
              {
                schedule.filter((b) =>
                  ["finalised", "finalized"].includes(b.status),
                ).length
              }{" "}
              milestones finalised
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">⏳</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Pending amount</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {fmtINR(totalPending)}
            </span>
            <span
              className={`stat-card__sub stat-card__sub--${totalPending > 0 ? "danger" : "success"}`}
            >
              {totalPending > 0 ? "Awaiting payment" : "All clear"}
            </span>
          </div>
        </div>
      </div>

      {/* Payment timeline */}
      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">Payment schedule</span>
          <span className="cl-card__hint">Per milestone</span>
        </div>

        {schedule.length === 0 ? (
          <div className="cl-empty">
            <div className="cl-empty__icon">💰</div>
            <p>No payment schedule available yet.</p>
          </div>
        ) : (
          <div className="pay-timeline">
            {schedule.map((boq) => {
              const status = derivePaymentStatus(boq);
              return (
                <div key={boq.id} className="pay-item">
                  <div className={`pay-dot ${DOT_MAP[status]}`}>
                    {ICON_MAP[status]}
                  </div>
                  <div className="pay-content">
                    <div className="pay-content__title">
                      {boq.milestone_name || `BOQ #${boq.id}`}
                    </div>
                    <div className="pay-content__meta">
                      {boq.finalised_date
                        ? `Finalised ${fmtDate(boq.finalised_date)}`
                        : "Not yet finalised"}
                    </div>
                    <div className="pay-content__amount">
                      {fmtINR(boq.grand_total)}
                    </div>
                  </div>
                  <span
                    className={`pill ${PILL_MAP[status]}`}
                    style={{ flexShrink: 0 }}
                  >
                    {status === "paid"
                      ? "Finalised"
                      : status === "pending"
                        ? "Pending"
                        : "Upcoming"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overall budget progress bar */}
      {budget > 0 && (
        <div className="cl-card" style={{ marginTop: 16, padding: 20 }}>
          <div
            className="cl-card__head"
            style={{ border: "none", padding: 0, marginBottom: 12 }}
          >
            <span className="cl-card__title">Budget utilisation</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              {fmtINR(totalBilled)} / {fmtINR(budget)}
            </span>
          </div>
          <div
            style={{
              background: "var(--border-light)",
              borderRadius: 99,
              height: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 8,
                borderRadius: 99,
                background: "var(--accent)",
                width: `${Math.min(100, (totalBilled / budget) * 100).toFixed(1)}%`,
                transition: "width .5s ease",
              }}
            />
          </div>
          <div
            style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}
          >
            {((totalBilled / budget) * 100).toFixed(1)}% billed ·{" "}
            {fmtINR(budget - totalBilled)} remaining
          </div>
        </div>
      )}
    </div>
  );
}
