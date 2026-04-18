import "./QuantitySurveyorDashboard.css";

const BOQ = [
  { id:1,  item:"Excavation",          unit:"m³", qty:450,  rate:280,   milestone:"Foundation", actual:320 },
  { id:2,  item:"PCC M10 Concrete",    unit:"m³", qty:80,   rate:4200,  milestone:"Foundation", actual:80  },
  { id:3,  item:"RCC M25 Footings",    unit:"m³", qty:120,  rate:6800,  milestone:"Foundation", actual:95  },
  { id:4,  item:"TMT Steel Fe500",     unit:"MT",  qty:28,   rate:68000, milestone:"Structure",  actual:18  },
  { id:5,  item:"Brick Masonry",       unit:"m³", qty:340,  rate:3200,  milestone:"Structure",  actual:120 },
  { id:6,  item:"RCC Slab M25",        unit:"m³", qty:95,   rate:7200,  milestone:"Structure",  actual:45  },
  { id:7,  item:"Internal Plaster",    unit:"m²", qty:1800, rate:180,   milestone:"Finishing",  actual:0   },
  { id:8,  item:"External Plaster",    unit:"m²", qty:620,  rate:220,   milestone:"Finishing",  actual:0   },
  { id:9,  item:"Flooring (Vitrified)",unit:"m²", qty:950,  rate:850,   milestone:"Finishing",  actual:0   },
  { id:10, item:"Electrical Conduit",  unit:"m",  qty:2400, rate:95,    milestone:"MEP",        actual:800 },
  { id:11, item:"Plumbing (uPVC)",     unit:"m",  qty:680,  rate:320,   milestone:"MEP",        actual:200 },
  { id:12, item:"Drainage Lines",      unit:"m",  qty:240,  rate:480,   milestone:"MEP",        actual:60  },
];

const MILESTONES = ["Foundation","Structure","Finishing","MEP"];
const fmt = (n) => "₹" + Number(n).toLocaleString("en-IN");
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

export default function QSCostReport() {
  const mData = MILESTONES.map(ms => {
    const items   = BOQ.filter(b => b.milestone === ms);
    const planned = items.reduce((s, b) => s + b.qty * b.rate, 0);
    const actual  = items.reduce((s, b) => s + b.actual * b.rate, 0);
    const diff    = planned - actual;
    const p       = pct(actual, planned);
    return { ms, planned, actual, diff, p, items: items.length };
  });

  const totalPlanned = mData.reduce((s, d) => s + d.planned, 0);
  const totalActual  = mData.reduce((s, d) => s + d.actual, 0);
  const totalDiff    = totalPlanned - totalActual;

  return (
    <div className="qsd-page">
      <div className="qs-page-hdr">
        <div>
          <div className="qs-page-title">Cost Report</div>
          <div className="qs-page-sub">Planned vs actual cost analysis — milestone and item-level breakdown</div>
        </div>
      </div>

      {/* Hero cards */}
      <div className="qscost-hero-grid">
        <div className="qscost-hero planned">
          <div className="qscost-hero-lbl">Total Planned</div>
          <div className="qscost-hero-val">{fmt(totalPlanned)}</div>
        </div>
        <div className="qscost-hero actual">
          <div className="qscost-hero-lbl">Actual to Date</div>
          <div className="qscost-hero-val">{fmt(totalActual)}</div>
        </div>
        <div className={`qscost-hero ${totalDiff >= 0 ? "under" : "over"}`}>
          <div className="qscost-hero-lbl">{totalDiff >= 0 ? "Under Budget" : "Over Budget"}</div>
          <div className="qscost-hero-val">{fmt(Math.abs(totalDiff))}</div>
        </div>
      </div>

      {/* Milestone bar chart */}
      <div className="qsd-card" style={{ marginBottom: 18 }}>
        <div className="qsd-card-title" style={{ marginBottom: 18 }}>Milestone Cost Breakdown</div>
        {mData.map(d => (
          <div key={d.ms} className="qscost-ms-row">
            <div className="qscost-ms-info">
              <div style={{ fontSize:13, fontWeight:700 }}>{d.ms}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{d.items} items</div>
            </div>
            <div className="qscost-ms-bars">
              <div className="qscost-bar-row">
                <span className="qscost-bar-lbl">Planned</span>
                <div className="qscost-track">
                  <div className="qscost-fill fill-planned" style={{ width:"100%" }}>
                    <span>{fmt(d.planned)}</span>
                  </div>
                </div>
              </div>
              <div className="qscost-bar-row">
                <span className="qscost-bar-lbl">Actual</span>
                <div className="qscost-track">
                  <div className="qscost-fill fill-actual" style={{ width:`${Math.min(100, d.p)}%` }}>
                    {d.p > 8 && <span>{fmt(d.actual)}</span>}
                  </div>
                </div>
              </div>
            </div>
            <div className={`qscost-diff ${d.diff >= 0 ? "qs-text-green" : "qs-text-red"}`}>
              {d.diff >= 0 ? "▼" : "▲"} {fmt(Math.abs(d.diff))}
            </div>
          </div>
        ))}
      </div>

      {/* Item-level table */}
      <div className="qsd-card">
        <div className="qsd-card-title" style={{ marginBottom: 14 }}>Item-Level Cost Detail</div>
        <div className="qs-table-wrap">
          <table className="qs-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Milestone</th>
                <th>BOQ Qty</th>
                <th>Rate</th>
                <th>Planned Cost</th>
                <th>Actual Qty</th>
                <th>Actual Cost</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {BOQ.map(b => {
                const plan = b.qty * b.rate;
                const act  = b.actual * b.rate;
                const v    = plan - act;
                return (
                  <tr key={b.id}>
                    <td className="qs-td-bold">{b.item}</td>
                    <td><span className="qs-badge qs-badge--outline">{b.milestone}</span></td>
                    <td className="qs-td-mono">{b.qty} {b.unit}</td>
                    <td className="qs-td-mono">{fmt(b.rate)}</td>
                    <td className="qs-td-mono">{fmt(plan)}</td>
                    <td className="qs-td-mono">{b.actual} {b.unit}</td>
                    <td className="qs-td-mono">{fmt(act)}</td>
                    <td className={`qs-td-mono ${v >= 0 ? "qs-text-green" : "qs-text-red"}`}>
                      {v >= 0 ? "+" : ""}{fmt(v)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} style={{ fontSize:11, textTransform:"uppercase", letterSpacing:"0.06em", color:"#94a3b8" }}>TOTAL</td>
                <td className="qs-td-mono">{fmt(totalPlanned)}</td>
                <td />
                <td className="qs-td-mono">{fmt(totalActual)}</td>
                <td className={`qs-td-mono ${totalDiff >= 0 ? "qs-text-green" : "qs-text-red"}`}>
                  {totalDiff >= 0 ? "+" : ""}{fmt(totalDiff)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}