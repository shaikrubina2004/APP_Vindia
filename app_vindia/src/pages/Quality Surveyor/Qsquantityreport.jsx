import { useState } from "react";
<<<<<<< HEAD
import "./Qssubmissions.css";
=======
import "./QuantitySurveyorDashboard.css";
>>>>>>> parent of 227e783 (dasah)

const SEED_BOQ = [
  { id:1,  item:"Excavation",         unit:"m³", qty:450,  rate:280,   milestone:"Foundation", actual:320 },
  { id:2,  item:"PCC M10 Concrete",   unit:"m³", qty:80,   rate:4200,  milestone:"Foundation", actual:80  },
  { id:3,  item:"RCC M25 Footings",   unit:"m³", qty:120,  rate:6800,  milestone:"Foundation", actual:95  },
  { id:4,  item:"TMT Steel Fe500",    unit:"MT",  qty:28,   rate:68000, milestone:"Structure",  actual:18  },
  { id:5,  item:"Brick Masonry",      unit:"m³", qty:340,  rate:3200,  milestone:"Structure",  actual:120 },
  { id:6,  item:"RCC Slab M25",       unit:"m³", qty:95,   rate:7200,  milestone:"Structure",  actual:45  },
  { id:7,  item:"Internal Plaster",   unit:"m²", qty:1800, rate:180,   milestone:"Finishing",  actual:0   },
  { id:8,  item:"External Plaster",   unit:"m²", qty:620,  rate:220,   milestone:"Finishing",  actual:0   },
  { id:9,  item:"Flooring (Vitrified)",unit:"m²",qty:950,  rate:850,   milestone:"Finishing",  actual:0   },
  { id:10, item:"Electrical Conduit", unit:"m",  qty:2400, rate:95,    milestone:"MEP",        actual:800 },
  { id:11, item:"Plumbing (uPVC)",    unit:"m",  qty:680,  rate:320,   milestone:"MEP",        actual:200 },
  { id:12, item:"Drainage Lines",     unit:"m",  qty:240,  rate:480,   milestone:"MEP",        actual:60  },
];

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const progColor = (p) => p >= 100 ? "#16a34a" : p >= 50 ? "#2563eb" : p > 0 ? "#d97706" : "#94a3b8";

export default function QSQuantityReport() {
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? SEED_BOQ : SEED_BOQ.filter(b => b.milestone === filter);

  const summary = {
    notStarted:  filtered.filter(b => b.actual === 0).length,
    inProgress:  filtered.filter(b => b.actual > 0 && b.actual < b.qty).length,
    completed:   filtered.filter(b => b.actual >= b.qty && b.qty > 0).length,
    overrun:     filtered.filter(b => b.actual > b.qty).length,
  };

  return (
    <div className="qsd-page">
      <div className="qs-page-hdr">
        <div>
          <div className="qs-page-title">Quantity Report</div>
          <div className="qs-page-sub">BOQ vs actual field quantities — comparison and completion analysis</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="qsqr-summary-grid">
        {[
          { label:"Not Started", val: summary.notStarted,  color:"grey"   },
          { label:"In Progress", val: summary.inProgress,  color:"blue"   },
          { label:"Completed",   val: summary.completed,   color:"green"  },
          { label:"Overrun",     val: summary.overrun,     color:"red"    },
        ].map(s => (
          <div key={s.label} className={`qsqr-sum-card qsqr-sum--${s.color}`}>
            <div className="qsqr-sum-val">{s.val}</div>
            <div className="qsqr-sum-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="qs-filter-bar">
        {["All","Foundation","Structure","Finishing","MEP"].map(m => (
          <button key={m} className={`qs-filter-pill${filter === m ? " active" : ""}`} onClick={() => setFilter(m)}>{m}</button>
        ))}
      </div>

      <div className="qs-table-wrap">
        <table className="qs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Item / Activity</th>
              <th>Unit</th>
              <th>Milestone</th>
              <th>BOQ Qty</th>
              <th>Actual Qty</th>
              <th>Remaining</th>
              <th>Completion</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b, i) => {
              const rem  = b.qty - b.actual;
              const comp = pct(b.actual, b.qty);
              let qStatus = "Pending";
              let qCls    = "qs-badge--grey";
              if (comp >= 100)      { qStatus = "Complete";    qCls = "qs-badge--green";  }
              else if (comp >= 50)  { qStatus = "In Progress"; qCls = "qs-badge--blue";   }
              else if (comp > 0)    { qStatus = "Started";     qCls = "qs-badge--yellow"; }

              const chipCls = b.actual === 0 ? "chip-grey" : comp >= 100 ? "chip-green" : "chip-blue";

              return (
                <tr key={b.id}>
                  <td className="qs-td-muted">{i + 1}</td>
                  <td className="qs-td-bold">{b.item}</td>
                  <td>{b.unit}</td>
                  <td><span className="qs-badge qs-badge--outline">{b.milestone}</span></td>
                  <td className="qs-td-mono">{b.qty.toLocaleString()}</td>
                  <td><span className={`qs-qty-chip ${chipCls}`}>{b.actual}</span></td>
                  <td className={`qs-td-mono${rem < 0 ? " qs-text-red" : ""}`}>{rem.toLocaleString()}</td>
                  <td>
                    <div className="qs-prog" style={{ minWidth: 110 }}>
                      <div className="qs-prog-track">
                        <div className="qs-prog-fill" style={{ width: `${Math.min(100, comp)}%`, background: progColor(comp) }} />
                      </div>
                      <span className="qs-prog-lbl">{comp}%</span>
                    </div>
                  </td>
                  <td><span className={`qs-badge ${qCls}`}>{qStatus}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Milestone breakdown */}
      <div className="qsd-card" style={{ marginTop: 20 }}>
        <div className="qsd-card-title" style={{ marginBottom: 18 }}>Milestone Quantity Progress</div>
        {["Foundation","Structure","Finishing","MEP"].map(ms => {
          const items   = SEED_BOQ.filter(b => b.milestone === ms);
          const totalQ  = items.reduce((s, b) => s + b.qty, 0);
          const actualQ = items.reduce((s, b) => s + b.actual, 0);
          const p       = pct(actualQ, totalQ);
          return (
            <div key={ms} style={{ marginBottom: 16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom: 6 }}>
                <span style={{ fontSize:13, fontWeight:600 }}>{ms}</span>
                <span style={{ fontSize:12, color:"#94a3b8", fontFamily:"var(--qs-mono)" }}>
                  {actualQ.toLocaleString()} / {totalQ.toLocaleString()} units · {p}%
                </span>
              </div>
              <div className="qs-prog-track" style={{ height: 10, borderRadius: 5 }}>
                <div className="qs-prog-fill" style={{ width:`${p}%`, background: progColor(p), borderRadius:5 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}