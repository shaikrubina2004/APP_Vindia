import { useState } from "react";
import { useClientAPI, PageLoader, PageError, fmtDate, fmtINR } from "../../hooks/Useclientapi.jsx";
import "../../styles/Client.css";

const num = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function BoqEstimate() {
  const [closed, setClosed] = useState(new Set());
  const { data, loading, error, refetch } = useClientAPI("/client/boq");

  if (loading) return <PageLoader />;
  if (error) return <PageError message={error} onRetry={refetch} />;

  const boq = data?.boq || [];
  const toggle = (id) =>
    setClosed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">BOQ &amp; Estimates</h1>
          <p className="cl-page-sub">
            {data?.project?.name ? `${data.project.name} · ` : ""}
            Finalised bill of quantities, milestone by milestone
          </p>
        </div>
      </div>

      {boq.length === 0 ? (
        <div className="cl-empty">
          <div className="cl-empty__icon">📋</div>
          <p>
            No finalised estimates yet. A milestone's bill of quantities appears here once your project team and
            quantity surveyor have finalised it.
          </p>
        </div>
      ) : (
        <>
          {boq.map((b) => {
            const isOpen = !closed.has(b.id);
            return (
              <div className="cl-card" key={b.id} style={{ marginBottom: 16 }}>
                <div
                  className="cl-card__head boq-section-title"
                  style={{ cursor: "pointer" }}
                  onClick={() => toggle(b.id)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <span className="cl-card__title">
                    {isOpen ? "▾" : "▸"} {b.milestone_name || `Milestone #${b.id}`}
                  </span>
                  <span className="cl-card__hint">
                    Finalised {fmtDate(b.finalised_date)} · <strong>{fmtINR(b.grand_total)}</strong>
                  </span>
                </div>

                {isOpen && (
                  <div className="cl-table-wrap">
                    <table className="cl-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>No.</th>
                          <th>Description</th>
                          <th>Unit</th>
                          <th style={{ textAlign: "right" }}>Qty</th>
                          <th style={{ textAlign: "right" }}>Rate (₹)</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {b.material_lines.map((l, i) => (
                          <tr key={`m${i}`}>
                            <td><span className="cl-mono">{i + 1}</span></td>
                            <td>{l.description}</td>
                            <td style={{ color: "var(--text-muted)" }}>{l.unit}</td>
                            <td style={{ textAlign: "right" }}>{num(l.quantity)}</td>
                            <td style={{ textAlign: "right" }}>{num(l.rate)}</td>
                            <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtINR(l.amount)}</td>
                          </tr>
                        ))}
                        <tr className="boq-total-row">
                          <td colSpan={5} style={{ textAlign: "right", paddingRight: 16 }}>Materials total</td>
                          <td style={{ textAlign: "right" }}>{fmtINR(b.material_total)}</td>
                        </tr>

                        {b.labour_lines.length > 0 && (
                          <>
                            <tr>
                              <td colSpan={6}><div className="boq-section-title">Labour</div></td>
                            </tr>
                            {b.labour_lines.map((l, i) => (
                              <tr key={`l${i}`}>
                                <td><span className="cl-mono">L{i + 1}</span></td>
                                <td>{l.type}</td>
                                <td style={{ color: "var(--text-muted)" }}>{l.workers} workers</td>
                                <td style={{ textAlign: "right" }}>{num(l.days)} days</td>
                                <td />
                                <td style={{ textAlign: "right", fontWeight: 600 }}>{fmtINR(l.amount)}</td>
                              </tr>
                            ))}
                            <tr className="boq-total-row">
                              <td colSpan={5} style={{ textAlign: "right", paddingRight: 16 }}>Labour total</td>
                              <td style={{ textAlign: "right" }}>{fmtINR(b.labour_total)}</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}

          <div className="cl-card">
            <div className="cl-table-wrap">
              <table className="cl-table">
                <tbody>
                  <tr className="boq-grand-row">
                    <td style={{ textAlign: "right", paddingRight: 16 }}>Grand total (all finalised milestones)</td>
                    <td style={{ textAlign: "right", width: 220 }}>{fmtINR(data?.grand_total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
