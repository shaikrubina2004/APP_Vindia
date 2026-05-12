import "../../styles/Client.css";

const PAYMENTS = [
  {
    id: 1,
    title: "Mobilisation advance",
    amount: 850000,
    date: "Jan 18, 2024",
    status: "paid",
    mode: "NEFT",
    ref: "NEFT24018001",
  },
  {
    id: 2,
    title: "Foundation milestone payment",
    amount: 2280000,
    date: "Mar 28, 2024",
    status: "paid",
    mode: "RTGS",
    ref: "RTGS24088002",
  },
  {
    id: 3,
    title: "Structural work – Phase 2",
    amount: 1420000,
    date: "Due May 14, 2024",
    status: "pending",
    mode: "—",
    ref: "INV-2024-003",
  },
  {
    id: 4,
    title: "MEP rough-in milestone",
    amount: 1850000,
    date: "Est. Aug 2024",
    status: "upcoming",
    mode: "—",
    ref: "—",
  },
  {
    id: 5,
    title: "Finishing works – interim",
    amount: 2200000,
    date: "Est. Oct 2024",
    status: "upcoming",
    mode: "—",
    ref: "—",
  },
  {
    id: 6,
    title: "Final completion & handover",
    amount: 3900000,
    date: "Est. Dec 2024",
    status: "upcoming",
    mode: "—",
    ref: "—",
  },
];

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

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
const LABEL_MAP = { paid: "Paid", pending: "Due", upcoming: "Upcoming" };

const totalContract = PAYMENTS.reduce((s, p) => s + p.amount, 0);
const totalPaid = PAYMENTS.filter((p) => p.status === "paid").reduce(
  (s, p) => s + p.amount,
  0,
);
const totalPending = PAYMENTS.filter((p) => p.status === "pending").reduce(
  (s, p) => s + p.amount,
  0,
);

export default function ClientPayment() {
  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">Payments</h1>
          <p className="cl-page-sub">
            Payment schedule for Greenview Residences – Tower B
          </p>
        </div>
      </div>

      <div
        className="cl-stats"
        style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 24 }}
      >
        <div className="stat-card">
          <div className="stat-card__icon">📋</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Total contract</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {fmt(totalContract)}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">✅</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Total paid</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {fmt(totalPaid)}
            </span>
            <span className="stat-card__sub stat-card__sub--success">
              2 payments cleared
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card__icon">⏳</div>
          <div className="stat-card__body">
            <span className="stat-card__label">Pending amount</span>
            <span className="stat-card__value" style={{ fontSize: 18 }}>
              {fmt(totalPending)}
            </span>
            <span className="stat-card__sub stat-card__sub--danger">
              Due May 14
            </span>
          </div>
        </div>
      </div>

      <div className="cl-card">
        <div className="cl-card__head">
          <span className="cl-card__title">Payment schedule</span>
          <span className="cl-card__hint">Timeline view</span>
        </div>
        <div className="pay-timeline">
          {PAYMENTS.map((p) => (
            <div key={p.id} className="pay-item">
              <div className={`pay-dot ${DOT_MAP[p.status]}`}>
                {p.status === "paid" ? "✓" : p.status === "pending" ? "!" : "○"}
              </div>
              <div className="pay-content">
                <div className="pay-content__title">{p.title}</div>
                <div className="pay-content__meta">
                  {p.date}
                  {p.mode !== "—" && <> · {p.mode}</>}
                  {p.ref !== "—" && (
                    <>
                      {" "}
                      ·{" "}
                      <span
                        style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
                      >
                        {p.ref}
                      </span>
                    </>
                  )}
                </div>
                <div className="pay-content__amount">{fmt(p.amount)}</div>
              </div>
              <span className={`pill ${PILL_MAP[p.status]}`}>
                {LABEL_MAP[p.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
