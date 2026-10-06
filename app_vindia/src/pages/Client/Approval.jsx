import { useState } from "react";
import { useClientAPI, assetUrl, PageLoader, PageError, fmtDate } from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const STATUS_MAP = {
  approved: ["Approved", "pill--success"],
  pending: ["Pending", "pill--warning"],
  upcoming: ["Upcoming", "pill--neutral"],
  rejected: ["Rejected", "pill--danger"],
};

const iconFor = (a) => {
  const t = `${a.category || ""} ${a.title || ""}`.toLowerCase();
  if (/fire/.test(t)) return "🔥";
  if (/environment|pollution|kspcb/.test(t)) return "🌿";
  if (/structur/.test(t)) return "🏗️";
  if (/electric|bescom|energis/.test(t)) return "⚡";
  if (/occupancy|completion/.test(t)) return "🏠";
  if (/plan|sanction|bbmp|municipal/.test(t)) return "🏛️";
  return "📄";
};

export default function Approval() {
  const [filter, setFilter] = useState("all");
  const { data, loading, error, refetch } = useClientAPI("/client/approvals");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const approvals = data?.approvals || [];
  const present = ["all", ...Object.keys(STATUS_MAP).filter((s) => approvals.some((a) => a.status === s))];
  const filtered = approvals.filter((a) => filter === "all" || a.status === filter);

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Documents</div>
          <h1 className="cl-page-title">Approvals &amp; Clearances</h1>
          <p className="cl-page-sub">
            {approvals.length} record{approvals.length !== 1 ? "s" : ""} maintained by your project team
          </p>
        </div>
        {approvals.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {present.map((f) => (
              <button
                key={f}
                className={`cl-btn ${filter === f ? "cl-btn--primary" : "cl-btn--ghost"}`}
                style={{ padding: "6px 14px", fontSize: "12px" }}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {approvals.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty__icon">📑</div>
          <p>No approvals have been recorded for your project yet. Your project manager will add them here.</p>
        </div>
      ) : (
        <div>
          {filtered.map((apr) => {
            const [label, cls] = STATUS_MAP[apr.status] || [apr.status, "pill--neutral"];
            return (
              <div key={apr.id} className="apr-card">
                <div className="apr-card__icon">{iconFor(apr)}</div>
                <div className="apr-card__body">
                  <div className="apr-card__title">{apr.title}</div>
                  <div className="apr-card__meta">
                    {apr.issued_by ? <>Issued by: {apr.issued_by}</> : "Issuing authority not recorded"}
                    {apr.issued_date && <> · Date: {fmtDate(apr.issued_date)}</>}
                    {apr.valid_until ? <> · Valid until: {fmtDate(apr.valid_until)}</> : apr.validity_note ? <> · Validity: {apr.validity_note}</> : null}
                    {apr.reference_no && <> · Ref: <span className="cl-mono">{apr.reference_no}</span></>}
                  </div>
                  {apr.description && <div className="apr-card__desc">{apr.description}</div>}
                </div>
                <div className="apr-card__right">
                  <span className={`pill ${cls}`}>{label}</span>
                  {apr.status === "approved" && apr.document_url && (
                    <a className="sf-download-btn" style={{ fontSize: 11 }} href={assetUrl(apr.document_url)} target="_blank" rel="noreferrer">
                      ↓ Certificate
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="cl-empty"><p>No records with this status.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
