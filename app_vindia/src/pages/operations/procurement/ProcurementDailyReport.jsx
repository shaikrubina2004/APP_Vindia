// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/procurement/ProcurementDailyReport.jsx =====
import { useState, useEffect, useCallback } from "react";
import procurementService from "../../../services/procurementService";
import "./ProcurementDailyReport.css";

const todayStr = () => new Date().toISOString().split("T")[0];

const EMPTY_FOLLOWUP = { po_reference: "", note: "" };
const EMPTY_CALL = { vendor_name: "", purpose: "", outcome: "" };
const EMPTY_APPROVAL = { description: "", waiting_on: "" };

const ProcurementDailyReport = () => {
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  const [posIssued, setPosIssued] = useState([]);
  const [poFollowups, setPoFollowups] = useState([{ ...EMPTY_FOLLOWUP }]);
  const [vendorCalls, setVendorCalls] = useState([{ ...EMPTY_CALL }]);
  const [pendingApprovals, setPendingApprovals] = useState([{ ...EMPTY_APPROVAL }]);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSaveMsg(null);
    try {
      const res = await procurementService.getDailyReport(date);
      const { report, posIssued: issued } = res.data;

      setPosIssued(issued || []);

      if (report) {
        setPoFollowups(report.po_followups?.length ? report.po_followups : [{ ...EMPTY_FOLLOWUP }]);
        setVendorCalls(report.vendor_calls?.length ? report.vendor_calls : [{ ...EMPTY_CALL }]);
        setPendingApprovals(
          report.pending_approvals?.length ? report.pending_approvals : [{ ...EMPTY_APPROVAL }]
        );
        setNotes(report.notes || "");
      } else {
        setPoFollowups([{ ...EMPTY_FOLLOWUP }]);
        setVendorCalls([{ ...EMPTY_CALL }]);
        setPendingApprovals([{ ...EMPTY_APPROVAL }]);
        setNotes("");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load this day's report");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    load();
  }, [load]);

  // ── generic row helpers ──────────────────────────────────
  const updateRow = (setter, index, field, value) =>
    setter((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  const addRow = (setter, empty) => setter((prev) => [...prev, { ...empty }]);

  const removeRow = (setter, index) =>
    setter((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const clean = (rows, keys) =>
    rows.filter((r) => keys.some((k) => (r[k] || "").trim() !== ""));

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await procurementService.saveDailyReport({
        report_date: date,
        po_followups: clean(poFollowups, ["po_reference", "note"]),
        vendor_calls: clean(vendorCalls, ["vendor_name", "purpose", "outcome"]),
        pending_approvals: clean(pendingApprovals, ["description", "waiting_on"]),
        notes: notes.trim() || null,
      });
      setSaveMsg("Saved.");
    } catch (err) {
      setSaveMsg(err.response?.data?.error || "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="pdr-state">Loading…</div>;

  return (
    <div className="pdr-page">
      <div className="pdr-header">
        <div>
          <h1>Daily Report</h1>
          <p>POs issued (auto), plus follow-ups, vendor calls, and pending approvals you log.</p>
        </div>
        <input
          type="date"
          className="pdr-date-input"
          value={date}
          max={todayStr()}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && <p className="pdr-error">{error}</p>}

      <div className="pdr-section">
        <h2>POs Issued This Day <span className="pdr-auto-tag">auto</span></h2>
        {posIssued.length === 0 ? (
          <p className="pdr-empty">No purchase orders were issued on this date.</p>
        ) : (
          <table className="pdr-table">
            <thead>
              <tr>
                <th>PO Code</th>
                <th>Vendor</th>
                <th>Project</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {posIssued.map((po) => (
                <tr key={po.id}>
                  <td>{po.po_code}</td>
                  <td>{po.vendor_name || "—"}</td>
                  <td>{po.project_name || "—"}</td>
                  <td className="pdr-po-status">{po.status.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pdr-section">
        <div className="pdr-section-header">
          <h2>PO Follow-ups</h2>
          <button className="pdr-add-btn" onClick={() => addRow(setPoFollowups, EMPTY_FOLLOWUP)}>
            + Add
          </button>
        </div>
        {poFollowups.map((row, i) => (
          <div className="pdr-row" key={i}>
            <input
              placeholder="PO code / reference"
              value={row.po_reference}
              onChange={(e) => updateRow(setPoFollowups, i, "po_reference", e.target.value)}
            />
            <input
              placeholder="What happened (e.g. confirmed dispatch date with vendor)"
              value={row.note}
              onChange={(e) => updateRow(setPoFollowups, i, "note", e.target.value)}
            />
            <button className="pdr-remove-btn" onClick={() => removeRow(setPoFollowups, i)}>✕</button>
          </div>
        ))}
      </div>

      <div className="pdr-section">
        <div className="pdr-section-header">
          <h2>Vendor Calls</h2>
          <button className="pdr-add-btn" onClick={() => addRow(setVendorCalls, EMPTY_CALL)}>
            + Add
          </button>
        </div>
        {vendorCalls.map((row, i) => (
          <div className="pdr-row pdr-row--three" key={i}>
            <input
              placeholder="Vendor name"
              value={row.vendor_name}
              onChange={(e) => updateRow(setVendorCalls, i, "vendor_name", e.target.value)}
            />
            <input
              placeholder="Purpose of call"
              value={row.purpose}
              onChange={(e) => updateRow(setVendorCalls, i, "purpose", e.target.value)}
            />
            <input
              placeholder="Outcome"
              value={row.outcome}
              onChange={(e) => updateRow(setVendorCalls, i, "outcome", e.target.value)}
            />
            <button className="pdr-remove-btn" onClick={() => removeRow(setVendorCalls, i)}>✕</button>
          </div>
        ))}
      </div>

      <div className="pdr-section">
        <div className="pdr-section-header">
          <h2>Pending Approvals</h2>
          <button className="pdr-add-btn" onClick={() => addRow(setPendingApprovals, EMPTY_APPROVAL)}>
            + Add
          </button>
        </div>
        {pendingApprovals.map((row, i) => (
          <div className="pdr-row" key={i}>
            <input
              placeholder="What's waiting on approval"
              value={row.description}
              onChange={(e) => updateRow(setPendingApprovals, i, "description", e.target.value)}
            />
            <input
              placeholder="Waiting on (e.g. PM, Finance)"
              value={row.waiting_on}
              onChange={(e) => updateRow(setPendingApprovals, i, "waiting_on", e.target.value)}
            />
            <button className="pdr-remove-btn" onClick={() => removeRow(setPendingApprovals, i)}>✕</button>
          </div>
        ))}
      </div>

      <div className="pdr-section">
        <h2>Notes</h2>
        <textarea
          className="pdr-notes"
          rows={4}
          placeholder="Anything else worth logging for the day…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {saveMsg && <p className="pdr-save-msg">{saveMsg}</p>}

      <div className="pdr-actions">
        <button className="pdr-save-btn" disabled={saving} onClick={handleSave}>
          {saving ? "Saving…" : "Save Report"}
        </button>
      </div>
    </div>
  );
};

export default ProcurementDailyReport;