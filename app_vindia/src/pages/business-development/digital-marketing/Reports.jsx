// src/pages/business-development/digital-marketing/Reports.jsx
import React, { useState, useEffect } from "react";
import { marketingService, campaignService } from "../../../services/campaignService";
import "./DigitalMarketing.css";
import "./Reports.css";

function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function BarList({ rows, valueKey = "value" }) {
  if (!rows || !rows.length) return <p className="dm-no-data">No data for this filter.</p>;
  const max = Math.max(...rows.map((r) => r[valueKey] || 0), 1);
  return (
    <div className="rpt-barlist">
      {rows.map((r) => (
        <div key={r.label} className="rpt-barlist-row">
          <div className="rpt-barlist-label">{r.label}</div>
          <div className="rpt-barlist-track">
            <div className="rpt-barlist-fill" style={{ width: `${(r[valueKey] / max) * 100}%` }} />
          </div>
          <div className="rpt-barlist-value">{r[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const [campaigns, setCampaigns] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "", campaign_id: "", platform: "", source: "" });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignService.getAll().then(setCampaigns).catch(() => {});
  }, []);

  const runReport = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const data = await marketingService.getReports(params);
      setReport(data);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { runReport(); /* eslint-disable-next-line */ }, []);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="dm-page">
      <div className="dm-topbar">
        <div>
          <p className="dm-crumb">Business Development · Digital Marketing</p>
          <h1 className="dm-title">Reports</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="dm-card rpt-filter-card">
        <div className="rpt-filter-row">
          <FilterField label="From">
            <input type="date" className="rpt-input" value={filters.from} onChange={set("from")} />
          </FilterField>
          <FilterField label="To">
            <input type="date" className="rpt-input" value={filters.to} onChange={set("to")} />
          </FilterField>
          <FilterField label="Campaign">
            <select className="rpt-input" value={filters.campaign_id} onChange={set("campaign_id")}>
              <option value="">All Campaigns</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </FilterField>
          <FilterField label="Platform">
            <select className="rpt-input" value={filters.platform} onChange={set("platform")}>
              <option value="">All Platforms</option>
              {["Meta", "Google", "Instagram", "LinkedIn", "YouTube", "Website"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </FilterField>
          <FilterField label="Source">
            <select className="rpt-input" value={filters.source} onChange={set("source")}>
              <option value="">All Sources</option>
              {["Meta", "Manual", "Website", "Referral", "Walk-In"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FilterField>
          <button className="dm-btn" onClick={runReport} disabled={loading}>
            {loading ? "Running..." : "Apply Filters"}
          </button>
        </div>
      </div>

      {loading && !report ? (
        <div className="dm-sk rpt-skeleton" />
      ) : !report ? (
        <div className="dm-empty-state"><i className="ti ti-report" /><p>Could not load report data.</p></div>
      ) : (
        <>
          <div className="dm-kpi-row">
            <div className="dm-stat"><div className="dm-stat-icon"><i className="ti ti-users" /></div><p className="dm-stat-val">{report.totalLeads}</p><p className="dm-stat-lbl">Leads (filtered)</p></div>
            <div className="dm-stat"><div className="dm-stat-icon"><i className="ti ti-wallet" /></div><p className="dm-stat-val">{fmtMoney(report.marketingSpend)}</p><p className="dm-stat-lbl">Marketing Spend</p></div>
            <div className="dm-stat"><div className="dm-stat-icon"><i className="ti ti-target" /></div><p className="dm-stat-val">{fmtMoney(report.costPerLead)}</p><p className="dm-stat-lbl">Cost Per Lead</p></div>
          </div>

          <div className="dm-row2 rpt-row2">
            <div className="dm-card">
              <div className="dm-card-head"><h2>Leads by Source</h2></div>
              <BarList rows={report.leadsBySource} />
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><h2>Leads by Campaign</h2></div>
              <BarList rows={report.leadsByCampaign} />
            </div>
          </div>

          <div className="dm-row2 rpt-row2">
            <div className="dm-card">
              <div className="dm-card-head"><h2>Conversions by Source</h2></div>
              <BarList rows={report.conversionsBySource} />
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><h2>Conversions by Campaign</h2></div>
              <BarList rows={report.conversionsByCampaign} />
            </div>
          </div>

          <div className="dm-row2 rpt-row2">
            <div className="dm-card">
              <div className="dm-card-head"><h2>Monthly Leads</h2></div>
              <BarList rows={report.monthlyLeads.map((r) => ({ label: r.month, value: r.value }))} />
            </div>
            <div className="dm-card">
              <div className="dm-card-head"><h2>Monthly Conversions</h2></div>
              <BarList rows={report.monthlyConversions.map((r) => ({ label: r.month, value: r.value }))} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const FilterField = ({ label, children }) => (
  <div className="rpt-filter-field">
    <label>{label}</label>
    {children}
  </div>
);