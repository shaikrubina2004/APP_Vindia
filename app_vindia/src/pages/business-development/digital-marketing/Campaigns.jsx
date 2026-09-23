// src/pages/business-development/digital-marketing/Campaigns.jsx
import React, { useState, useEffect, useMemo } from "react";
import { campaignService } from "../../../services/campaignService";
import "./DigitalMarketing.css";
import "./Campaigns.css";

const STATUS_PILL_CLASS = {
  draft: "camp-pill-draft",
  scheduled: "camp-pill-scheduled",
  active: "camp-pill-active",
  paused: "camp-pill-paused",
  completed: "camp-pill-completed",
};

const PLATFORMS = ["Meta", "Google", "Instagram", "LinkedIn", "YouTube", "Website", "Other"];
const TYPES = ["Lead Generation", "Brand Awareness", "Traffic", "Conversion", "Retargeting", "Other"];
const STATUSES = ["draft", "scheduled", "active", "completed", "paused"];

const emptyForm = {
  name: "", platform: "Meta", campaign_type: "Lead Generation",
  start_date: "", end_date: "", budget: "", target_audience: "",
  status: "draft", description: "", spend: "",
};

const COLUMNS = [
  { key: "name", label: "Campaign", sortable: true },
  { key: "platform", label: "Platform", sortable: true },
  { key: "start_date", label: "Dates", sortable: true },
  { key: "budget", label: "Budget", sortable: true },
  { key: "spend", label: "Spend", sortable: true },
  { key: "leads_count", label: "Leads", sortable: true },
  { key: "conversions_count", label: "Conversions", sortable: true },
  { key: "cost_per_lead", label: "CPL", sortable: true },
  { key: "status", label: "Status", sortable: true },
  { key: "_actions", label: "", sortable: false },
];

function fmtMoney(n) {
  const v = parseFloat(n) || 0;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "desc" });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [detailCampaign, setDetailCampaign] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const rows = await campaignService.getAll();
      setCampaigns(rows);
    } catch {
      setError("Could not load campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Filter → search → sort pipeline ────────────────────────────
  const filtered = useMemo(() => {
    let rows = statusFilter === "all" ? campaigns : campaigns.filter((c) => c.status === statusFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.platform || "").toLowerCase().includes(q) ||
        (c.campaign_type || "").toLowerCase().includes(q) ||
        (c.target_audience || "").toLowerCase().includes(q)
      );
    }

    if (sort.key) {
      const numeric = ["budget", "spend", "leads_count", "conversions_count", "cost_per_lead"];
      rows = [...rows].sort((a, b) => {
        let av = a[sort.key], bv = b[sort.key];
        if (numeric.includes(sort.key)) { av = parseFloat(av) || 0; bv = parseFloat(bv) || 0; }
        else { av = (av || "").toString().toLowerCase(); bv = (bv || "").toString().toLowerCase(); }
        if (av < bv) return sort.dir === "asc" ? -1 : 1;
        if (av > bv) return sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [campaigns, statusFilter, search, sort]);

  const totals = useMemo(() => {
    const spend = campaigns.reduce((s, c) => s + (parseFloat(c.spend) || 0), 0);
    const leads = campaigns.reduce((s, c) => s + (c.leads_count || 0), 0);
    const conversions = campaigns.reduce((s, c) => s + (c.conversions_count || 0), 0);
    return { spend, leads, conversions, active: campaigns.filter((c) => c.status === "active").length };
  }, [campaigns]);

  const toggleSort = (key) => {
    setSort((prev) => prev.key === key
      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "desc" });
  };

  // Clicking a stat card both filters/sorts the table AND scrolls to it,
  // so the "interactivity" is visible even if the table is off-screen.
  const onStatCardClick = (which) => {
    if (which === "total") { setStatusFilter("all"); setSort({ key: null, dir: "desc" }); }
    if (which === "active") { setStatusFilter("active"); setSort({ key: null, dir: "desc" }); }
    if (which === "leads") { setStatusFilter("all"); setSort({ key: "leads_count", dir: "desc" }); }
    if (which === "spend") { setStatusFilter("all"); setSort({ key: "spend", dir: "desc" }); }
    document.getElementById("campaigns-table-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || "", platform: c.platform || "Meta", campaign_type: c.campaign_type || "",
      start_date: c.start_date ? c.start_date.slice(0, 10) : "",
      end_date: c.end_date ? c.end_date.slice(0, 10) : "",
      budget: c.budget || "", target_audience: c.target_audience || "",
      status: c.status || "draft", description: c.description || "", spend: c.spend || "",
    });
    setModalOpen(true);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim()) return alert("Campaign name is required");
    setSaving(true);
    try {
      if (editing) {
        await campaignService.update(editing.id, form);
      } else {
        await campaignService.create(form);
      }
      setModalOpen(false);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete campaign "${c.name}"? If it has leads attributed to it, it will be archived instead.`)) return;
    try {
      await campaignService.remove(c.id);
      load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to delete campaign");
    }
  };

  const handleStatusChange = async (c, status) => {
    try {
      await campaignService.update(c.id, { status });
      load();
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to update status");
    }
  };

  if (error) return (
    <div className="dm-page">
      <div className="dm-error">
        <i className="ti ti-wifi-off" style={{ fontSize: 40, color: "#ef4444" }} />
        <p>{error}</p>
        <button className="dm-btn" onClick={load}>Retry</button>
      </div>
    </div>
  );

  return (
    <div className="dm-page">
      <div className="dm-topbar">
        <div>
          <p className="dm-crumb">Business Development · Digital Marketing</p>
          <h1 className="dm-title">Campaigns</h1>
        </div>
        <div className="dm-topbar-right">
          <button className="dm-btn" onClick={openCreate}>
            <i className="ti ti-plus" /> New Campaign
          </button>
        </div>
      </div>

      {/* Clickable stat cards — each filters/sorts the table below */}
      <div className="dm-kpi-row">
        <button className="dm-stat camp-stat-clickable" onClick={() => onStatCardClick("total")}>
          <div className="dm-stat-icon"><i className="ti ti-speakerphone" /></div>
          <p className="dm-stat-val">{campaigns.length}</p>
          <p className="dm-stat-lbl">Total Campaigns</p>
        </button>
        <button className="dm-stat camp-stat-clickable" onClick={() => onStatCardClick("active")}>
          <div className="dm-stat-icon"><i className="ti ti-bolt" /></div>
          <p className="dm-stat-val">{totals.active}</p>
          <p className="dm-stat-lbl">Active Now</p>
        </button>
        <button className="dm-stat camp-stat-clickable" onClick={() => onStatCardClick("leads")}>
          <div className="dm-stat-icon"><i className="ti ti-users" /></div>
          <p className="dm-stat-val">{totals.leads}</p>
          <p className="dm-stat-lbl">Campaign Leads</p>
        </button>
        <button className="dm-stat camp-stat-clickable" onClick={() => onStatCardClick("spend")}>
          <div className="dm-stat-icon"><i className="ti ti-wallet" /></div>
          <p className="dm-stat-val">{fmtMoney(totals.spend)}</p>
          <p className="dm-stat-lbl">Total Spend</p>
        </button>
      </div>

      <div className="dm-tabs">
        {["all", ...STATUSES].map((s) => (
          <button key={s} className={`dm-tab ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
            {s === "all" ? "All" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="dm-card dm-card--tall" id="campaigns-table-card" style={{ marginTop: 16 }}>
        <div className="dm-card-head camp-card-head">
          <h2>Campaigns ({filtered.length})</h2>
          <div className="camp-search-wrap">
            <i className="ti ti-search" />
            <input
              className="camp-search-input"
              placeholder="Search by name, platform, audience..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="camp-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
                <i className="ti ti-x" />
              </button>
            )}
          </div>
        </div>

        {loading ? <Sk h={220} /> : filtered.length === 0 ? (
          <div className="dm-empty-state">
            <i className="ti ti-speakerphone" />
            <p>{search || statusFilter !== "all" ? "No campaigns match your filters." : "No campaigns yet."}</p>
          </div>
        ) : (
          <div className="dm-table-wrap">
            <table className="dm-table">
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={col.sortable ? "camp-th-sortable" : undefined}
                      onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    >
                      {col.label}
                      {col.sortable && sort.key === col.key && (
                        <i className={`ti ti-chevron-${sort.dir === "asc" ? "up" : "down"} camp-sort-icon`} />
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="camp-row-clickable" onClick={() => setDetailCampaign(c)}>
                    <td className="dm-td-name">{c.name}</td>
                    <td className="dm-td-muted">{c.platform || "—"}</td>
                    <td className="dm-td-date">{fmtDate(c.start_date)} → {fmtDate(c.end_date)}</td>
                    <td className="dm-td-muted">{fmtMoney(c.budget)}</td>
                    <td className="dm-td-muted">{fmtMoney(c.spend)}</td>
                    <td className="dm-td-muted">{c.leads_count || 0}</td>
                    <td className="dm-td-muted">{c.conversions_count || 0}</td>
                    <td className="dm-td-muted">{fmtMoney(c.cost_per_lead)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <select
                        value={c.status}
                        onChange={(e) => handleStatusChange(c, e.target.value)}
                        className={`dm-pill camp-status-select ${STATUS_PILL_CLASS[c.status] || ""}`}
                      >
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="camp-row-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="dm-btn camp-btn-sm" onClick={() => openEdit(c)}>Edit</button>{" "}
                      <button className="dm-btn camp-btn-delete" onClick={() => handleDelete(c)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create / Edit modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="camp-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="camp-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? "Edit Campaign" : "New Campaign"}</h2>
            <div className="camp-field-grid">
              <Field label="Campaign Name *"><input className="camp-input" value={form.name} onChange={set("name")} /></Field>
              <Field label="Platform">
                <select className="camp-input" value={form.platform} onChange={set("platform")}>
                  {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Campaign Type">
                <select className="camp-input" value={form.campaign_type} onChange={set("campaign_type")}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className="camp-input" value={form.status} onChange={set("status")}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Start Date"><input type="date" className="camp-input" value={form.start_date} onChange={set("start_date")} /></Field>
              <Field label="End Date"><input type="date" className="camp-input" value={form.end_date} onChange={set("end_date")} /></Field>
              <Field label="Budget (₹)"><input type="number" className="camp-input" value={form.budget} onChange={set("budget")} /></Field>
              <Field label="Spend so far (₹)"><input type="number" className="camp-input" value={form.spend} onChange={set("spend")} /></Field>
              <Field label="Target Audience" full><input className="camp-input" value={form.target_audience} onChange={set("target_audience")} placeholder="e.g. Homeowners, 30-55, Bangalore" /></Field>
              <Field label="Description" full><textarea className="camp-input camp-input--textarea" value={form.description} onChange={set("description")} /></Field>
            </div>
            <div className="camp-modal-footer">
              <button className="dm-btn camp-btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="dm-btn" onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Campaign"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Row-click detail view ───────────────────────────── */}
      {detailCampaign && (
        <div className="camp-modal-overlay" onClick={() => setDetailCampaign(null)}>
          <div className="camp-modal camp-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="camp-detail-header">
              <div>
                <h2>{detailCampaign.name}</h2>
                <span className={`dm-pill ${STATUS_PILL_CLASS[detailCampaign.status] || ""}`}>{detailCampaign.status}</span>
              </div>
              <button className="camp-detail-close" onClick={() => setDetailCampaign(null)} aria-label="Close">
                <i className="ti ti-x" />
              </button>
            </div>

            <div className="camp-detail-metrics">
              <div className="camp-detail-metric"><span>{detailCampaign.leads_count || 0}</span><label>Leads</label></div>
              <div className="camp-detail-metric"><span>{detailCampaign.conversions_count || 0}</span><label>Conversions</label></div>
              <div className="camp-detail-metric"><span>{fmtMoney(detailCampaign.cost_per_lead)}</span><label>Cost / Lead</label></div>
              <div className="camp-detail-metric"><span>{fmtMoney(detailCampaign.spend)}</span><label>Spend</label></div>
            </div>

            <div className="camp-detail-grid">
              <DetailRow label="Platform" value={detailCampaign.platform || "—"} />
              <DetailRow label="Campaign Type" value={detailCampaign.campaign_type || "—"} />
              <DetailRow label="Start Date" value={fmtDate(detailCampaign.start_date)} />
              <DetailRow label="End Date" value={fmtDate(detailCampaign.end_date)} />
              <DetailRow label="Budget" value={fmtMoney(detailCampaign.budget)} />
              <DetailRow label="Target Audience" value={detailCampaign.target_audience || "—"} />
            </div>

            {detailCampaign.description && (
              <div className="camp-detail-description">
                <label>Description</label>
                <p>{detailCampaign.description}</p>
              </div>
            )}

            <div className="camp-modal-footer">
              <button className="dm-btn camp-btn-cancel" onClick={() => setDetailCampaign(null)}>Close</button>
              <button className="dm-btn" onClick={() => { openEdit(detailCampaign); setDetailCampaign(null); }}>Edit Campaign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Sk = ({ h = 16 }) => <div className="dm-sk" style={{ height: h }} />;
const Field = ({ label, children, full }) => (
  <div className={full ? "camp-field-grid--full" : undefined}>
    <label className="camp-field-label">{label}</label>
    {children}
  </div>
);
const DetailRow = ({ label, value }) => (
  <div className="camp-detail-row">
    <label>{label}</label>
    <span>{value}</span>
  </div>
);