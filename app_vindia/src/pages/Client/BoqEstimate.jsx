import { useState } from "react";
import "../../styles/Client.css";

const BOQ = [
  {
    section: "Civil works",
    items: [
      {
        no: "1.1",
        desc: "Earthwork excavation",
        unit: "cum",
        qty: 850,
        rate: 280,
        amount: 238000,
      },
      {
        no: "1.2",
        desc: "PCC M10 (1:3:6)",
        unit: "cum",
        qty: 120,
        rate: 4200,
        amount: 504000,
      },
      {
        no: "1.3",
        desc: "RCC M25 – foundation",
        unit: "cum",
        qty: 310,
        rate: 7800,
        amount: 2418000,
      },
      {
        no: "1.4",
        desc: "RCC M30 – columns & beams",
        unit: "cum",
        qty: 480,
        rate: 8400,
        amount: 4032000,
      },
      {
        no: "1.5",
        desc: "RCC M25 – slabs",
        unit: "cum",
        qty: 560,
        rate: 7600,
        amount: 4256000,
      },
      {
        no: "1.6",
        desc: "Brickwork (230mm)",
        unit: "sqm",
        qty: 3200,
        rate: 680,
        amount: 2176000,
      },
    ],
  },
  {
    section: "Finishing works",
    items: [
      {
        no: "2.1",
        desc: "Internal plastering (12mm)",
        unit: "sqm",
        qty: 6400,
        rate: 180,
        amount: 1152000,
      },
      {
        no: "2.2",
        desc: "External plastering (20mm)",
        unit: "sqm",
        qty: 2800,
        rate: 220,
        amount: 616000,
      },
      {
        no: "2.3",
        desc: "Flooring – vitrified tiles",
        unit: "sqm",
        qty: 3800,
        rate: 860,
        amount: 3268000,
      },
      {
        no: "2.4",
        desc: "Paint – interior 2 coats",
        unit: "sqm",
        qty: 6400,
        rate: 120,
        amount: 768000,
      },
    ],
  },
  {
    section: "MEP works",
    items: [
      {
        no: "3.1",
        desc: "Electrical – wiring & fittings",
        unit: "point",
        qty: 840,
        rate: 1400,
        amount: 1176000,
      },
      {
        no: "3.2",
        desc: "Plumbing – CPVC piping",
        unit: "m",
        qty: 2200,
        rate: 320,
        amount: 704000,
      },
      {
        no: "3.3",
        desc: "Sanitary fixtures – supply",
        unit: "nos",
        qty: 48,
        rate: 12000,
        amount: 576000,
      },
      {
        no: "3.4",
        desc: "HVAC – split units",
        unit: "nos",
        qty: 24,
        rate: 38000,
        amount: 912000,
      },
    ],
  },
];

const fmt = (n) => "₹" + n.toLocaleString("en-IN");

export default function BoqEstimate() {
  const [expandedSections, setExpandedSections] = useState(
    new Set(BOQ.map((s) => s.section)),
  );

  const toggle = (section) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(section) ? next.delete(section) : next.add(section);
      return next;
    });

  const grandTotal = BOQ.reduce(
    (sum, s) => sum + s.items.reduce((ss, i) => ss + i.amount, 0),
    0,
  );

  return (
    <div className="cl-page">
      <div className="cl-page-header">
        <div className="cl-page-header__left">
          <div className="cl-eyebrow">Finance</div>
          <h1 className="cl-page-title">BOQ & Estimates</h1>
          <p className="cl-page-sub">
            Bill of quantities for Greenview Residences – Tower B
          </p>
        </div>
      </div>

      <div className="cl-card">
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
              {BOQ.map((section) => {
                const isOpen = expandedSections.has(section.section);
                const sectionTotal = section.items.reduce(
                  (s, i) => s + i.amount,
                  0,
                );
                return [
                  <tr key={section.section}>
                    <td colSpan={6}>
                      <div
                        className="boq-section-title"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                        }}
                        onClick={() => toggle(section.section)}
                      >
                        <span style={{ fontSize: 16 }}>
                          {isOpen ? "▾" : "▸"}
                        </span>
                        {section.section}
                      </div>
                    </td>
                  </tr>,
                  ...(isOpen
                    ? section.items.map((item) => (
                        <tr key={item.no}>
                          <td>
                            <span className="cl-mono">{item.no}</span>
                          </td>
                          <td>{item.desc}</td>
                          <td style={{ color: "var(--text-muted)" }}>
                            {item.unit}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {item.qty.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {item.rate.toLocaleString()}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>
                            {fmt(item.amount)}
                          </td>
                        </tr>
                      ))
                    : []),
                  <tr
                    key={section.section + "-total"}
                    className="boq-total-row"
                  >
                    <td
                      colSpan={5}
                      style={{ textAlign: "right", paddingRight: 16 }}
                    >
                      Section total
                    </td>
                    <td style={{ textAlign: "right" }}>{fmt(sectionTotal)}</td>
                  </tr>,
                ];
              })}
              <tr className="boq-grand-row">
                <td
                  colSpan={5}
                  style={{ textAlign: "right", paddingRight: 16 }}
                >
                  Grand total
                </td>
                <td style={{ textAlign: "right" }}>{fmt(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
