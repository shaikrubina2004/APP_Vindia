import { useEffect, useState } from "react";
import { Truck, CheckCircle2, X, Inbox, ClipboardList, RefreshCw, MapPin, Building2 } from "lucide-react";
import { getPendingReceipts } from "../../../services/logisticsService";
import { getItems, createGoodsReceipt, getGoodsReceipts } from "../../../services/inventoryService";
import Toast from "../../../components/Toast";
import "./StockIn.css";

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const StockIn = () => {
  const [pending, setPending] = useState([]);
  const [history, setHistory] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [modalShow, setModalShow] = useState(false);
  const [lines, setLines] = useState([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getPendingReceipts(), getItems({ status: "active" }), getGoodsReceipts()])
      .then(([p, it, h]) => { setPending(p.data); setItems(it.data); setHistory(h.data); })
      .catch(() => setToast({ type: "error", text: "Failed to load data" }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const receivedThisWeek = history.filter((h) => {
    const days = (Date.now() - new Date(h.created_at)) / 86400000;
    return days <= 7;
  }).length;

  const openReceive = (delivery) => {
    setActive(delivery);
    setRemarks("");
    setError("");
    setLines(delivery.items.map((it) => ({
      delivery_item_id: it.id, item_id: it.item_id || "", item_name: it.item_name, unit: it.unit,
      ordered_qty: it.ordered_qty, delivered_qty: it.delivered_qty,
      accepted_qty: it.delivered_qty, damaged_qty: it.damaged_qty || 0,
    })));
    requestAnimationFrame(() => setModalShow(true));
  };
  const closeModal = () => { setModalShow(false); setTimeout(() => setActive(null), 150); };

  const updateLine = (idx, field, value) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  const submit = async (e) => {
    e.preventDefault();
    if (lines.some((l) => !l.item_id)) { setError("Map every line to an item in the Item Master before receiving."); return; }
    setSaving(true);
    setError("");
    try {
      await createGoodsReceipt({
        delivery_id: active.id, remarks,
        items: lines.map((l) => ({
          delivery_item_id: l.delivery_item_id, item_id: l.item_id,
          ordered_qty: l.ordered_qty, delivered_qty: l.delivered_qty,
          accepted_qty: Number(l.accepted_qty), damaged_qty: Number(l.damaged_qty),
        })),
      });
      closeModal();
      setToast({ type: "success", text: `${active.delivery_code} received into stock` });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to receive goods");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ops-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="ops-header">
        <div>
          <p className="sin-eyebrow">Inventory Controller</p>
          <h1 className="ops-title">Stock In — Goods Receipt</h1>
          <p className="ops-subtitle">Deliveries marked "Delivered" by Logistics wait here until you verify and receive them into stock.</p>
        </div>
        <button className="ops-icon-btn" onClick={load} title="Refresh"><RefreshCw size={16} /></button>
      </div>

      {!loading && (
        <div className="sin-stats">
          <div className="sin-stat sin-stat-amber">
            <div><span className="sin-stat-value">{pending.length}</span><span className="sin-stat-label">Pending Receipt</span></div>
            <Truck size={20} className="sin-stat-icon" />
          </div>
          <div className="sin-stat sin-stat-emerald">
            <div><span className="sin-stat-value">{receivedThisWeek}</span><span className="sin-stat-label">Received This Week</span></div>
            <CheckCircle2 size={20} className="sin-stat-icon" />
          </div>
          <div className="sin-stat sin-stat-indigo">
            <div><span className="sin-stat-value">{history.length}</span><span className="sin-stat-label">Total Receipts</span></div>
            <ClipboardList size={20} className="sin-stat-icon" />
          </div>
        </div>
      )}

      <div className="ops-card">
        <div className="ops-card-header"><h2><Truck size={18} className="sin-amber" /> Pending Receipt {!loading && `(${pending.length})`}</h2></div>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 16 }} />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="ops-empty"><Inbox size={26} />Nothing waiting. All delivered items have been received.</div>
        ) : (
          <div className="sin-pending-list">
            {pending.map((d) => (
              <div key={d.id} className="sin-pending-card">
                <div className="sin-pending-icon"><Truck size={18} /></div>
                <div className="sin-pending-body">
                  <p className="sin-pending-code">{d.delivery_code} <span className="sin-pending-project"><MapPin size={12} /> {d.project_name}</span></p>
                  <p className="sin-pending-meta"><Building2 size={12} /> {d.vendor_name || "No vendor"} · Delivered {formatDate(d.delivery_date)}</p>
                </div>
                <button onClick={() => openReceive(d)} className="ops-btn ops-btn-primary ops-btn-sm">Receive</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ops-card ops-table-wrap">
        <div className="ops-card-header"><h2><CheckCircle2 size={18} className="sin-emerald" /> Recent Goods Receipts</h2></div>
        {loading ? (
          <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            {[...Array(3)].map((_, i) => <div key={i} className="ops-skeleton" style={{ height: 16 }} />)}
          </div>
        ) : history.length === 0 ? (
          <div className="ops-empty">No goods receipts yet.</div>
        ) : (
          <table className="ops-table">
            <thead><tr><th>GRN</th><th>Delivery</th><th>Project</th><th>Date</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="sin-grn">{h.grn_code}</td>
                  <td>{h.delivery_code}</td>
                  <td>{h.project_name}</td>
                  <td>{new Date(h.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {active && (
        <div className={`ops-modal-overlay ${modalShow ? "ops-modal-show" : ""}`} onClick={closeModal}>
          <div className="ops-modal ops-modal-wide ops-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h2>Receive {active.delivery_code}</h2>
              <button className="ops-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            {error && <p className="ops-alert ops-alert-error">{error}</p>}

            <form onSubmit={submit} className="sin-form">
              <div className="sin-lines">
                {lines.map((l, idx) => {
                  const accepted = Number(l.accepted_qty) || 0;
                  const damaged = Number(l.damaged_qty) || 0;
                  const delivered = Number(l.delivered_qty) || 1;
                  const acceptedPct = Math.min(100, (accepted / delivered) * 100);
                  const damagedPct = Math.min(100 - acceptedPct, (damaged / delivered) * 100);
                  return (
                    <div key={l.delivery_item_id} className="sin-line">
                      <div className="sin-line-head">
                        <p className="sin-line-name">{l.item_name}</p>
                        <p className="sin-line-meta">ordered {l.ordered_qty} · delivered {l.delivered_qty} {l.unit}</p>
                      </div>
                      <div className="ops-form-row sin-line-grid">
                        <div className="ops-form-group">
                          <label className="ops-label">Map to Item Master *</label>
                          <select required className="ops-select" value={l.item_id} onChange={(e) => updateLine(idx, "item_id", e.target.value)}>
                            <option value="">Select…</option>
                            {items.map((it) => <option key={it.id} value={it.id}>{it.item_name} ({it.item_code})</option>)}
                          </select>
                        </div>
                        <div className="ops-form-group">
                          <label className="ops-label">Accepted Qty</label>
                          <input type="number" min="0" className="ops-input" value={l.accepted_qty} onChange={(e) => updateLine(idx, "accepted_qty", e.target.value)} />
                        </div>
                        <div className="ops-form-group">
                          <label className="ops-label">Damaged Qty</label>
                          <input type="number" min="0" className="ops-input" value={l.damaged_qty} onChange={(e) => updateLine(idx, "damaged_qty", e.target.value)} />
                        </div>
                      </div>
                      <div className="ops-progress-track">
                        <div className="ops-progress-fill ops-fill-emerald" style={{ width: `${acceptedPct}%` }} />
                        <div className="ops-progress-fill ops-fill-red" style={{ width: `${damagedPct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="ops-form-group">
                <label className="ops-label">Remarks</label>
                <textarea rows={2} className="ops-textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>

              <div className="ops-modal-footer">
                <button type="button" onClick={closeModal} className="ops-btn ops-btn-outline">Cancel</button>
                <button disabled={saving} className="ops-btn ops-btn-primary">{saving ? "Receiving…" : "Confirm Receipt"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockIn;