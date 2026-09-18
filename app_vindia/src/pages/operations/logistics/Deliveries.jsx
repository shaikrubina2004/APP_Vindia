import { useEffect, useState } from "react";
import { Plus, X, Truck, PackageCheck, AlertTriangle, PackageX, ClipboardList } from "lucide-react";
import { getDeliveries, createDelivery, dispatchDelivery, markInTransit, markDelivered, markDelayed, getOpenPurchaseOrders } from "../../../services/logisticsService";
import { getProjects } from "../../../services/projectService";
import Toast from "../../../components/Toast";
import axios from "axios";
import "./Deliveries.css";

const financeApi = axios.create({ baseURL: "http://localhost:5000/api/finance" });
financeApi.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

const STATUS_BADGE = {
  scheduled: "ops-badge-gray", dispatched: "ops-badge-sky", in_transit: "ops-badge-indigo",
  delivered: "ops-badge-emerald", delayed: "ops-badge-red", cancelled: "ops-badge-gray",
};
const STATUS_STEPS = ["scheduled", "dispatched", "in_transit", "delivered"];
const STATUS_TABS = ["all", "scheduled", "dispatched", "in_transit", "delivered", "delayed"];
const emptyItemRow = { item_name: "", unit: "", ordered_qty: "" };

const StatusStepper = ({ status }) => {
  if (status === "cancelled") return <span className="del-step-cancelled">Cancelled</span>;
  const idx = status === "delayed" ? -1 : STATUS_STEPS.indexOf(status);
  return (
    <div className="del-stepper">
      {STATUS_STEPS.map((s, i) => (
        <div key={s} title={s.replace("_", " ")}
          className={`del-step ${status === "delayed" ? "del-step-delayed" : i <= idx ? "del-step-done" : "del-step-pending"}`} />
      ))}
    </div>
  );
};

const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createShow, setCreateShow] = useState(false);
  const [createForm, setCreateForm] = useState({ project_id: "", vendor_id: "", expected_date: "", remarks: "" });
  const [createItems, setCreateItems] = useState([{ ...emptyItemRow }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [sourceMode, setSourceMode] = useState("po"); // "po" | "manual"
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState("");
  const [materialRequestId, setMaterialRequestId] = useState(null);

  const [actionModal, setActionModal] = useState(null);
  const [actionShow, setActionShow] = useState(false);
  const [actionForm, setActionForm] = useState({});

  const load = () => {
    setLoading(true);
    getDeliveries(statusFilter === "all" ? {} : { status: statusFilter }).then((res) => setDeliveries(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  useEffect(() => {
    getProjects().then((res) => setProjects(res.data)).catch(() => setProjects([]));
    financeApi.get("/vendors").then((res) => setVendors(res.data?.data || [])).catch(() => setVendors([]));
    getOpenPurchaseOrders().then((res) => setPurchaseOrders(res.data)).catch(() => setPurchaseOrders([]));
  }, []);

  const openCreateModal = () => {
    setCreateOpen(true);
    setSourceMode(purchaseOrders.length ? "po" : "manual");
    requestAnimationFrame(() => setCreateShow(true));
  };
  const closeCreateModal = () => { setCreateShow(false); setTimeout(() => setCreateOpen(false), 150); };

  const applyPurchaseOrder = (poId) => {
    setSelectedPoId(poId);
    const po = purchaseOrders.find((p) => String(p.id) === String(poId));
    if (!po) return;
    setCreateForm((f) => ({
      ...f,
      project_id: po.project_id || f.project_id,
      vendor_id: po.vendor_id || f.vendor_id,
    }));
    setMaterialRequestId(po.material_request_id || null);
    setCreateItems(
      (po.items || []).map((i) => ({ item_name: i.item_name, unit: i.unit || "", ordered_qty: i.ordered_qty }))
    );
  };

  const switchToManual = () => {
    setSourceMode("manual");
    setSelectedPoId("");
    setMaterialRequestId(null);
    setCreateItems([{ ...emptyItemRow }]);
  };

  const addItemRow = () => setCreateItems((r) => [...r, { ...emptyItemRow }]);
  const updateItemRow = (idx, field, val) => setCreateItems((r) => r.map((row, i) => (i === idx ? { ...row, [field]: val } : row)));
  const removeItemRow = (idx) => setCreateItems((r) => r.filter((_, i) => i !== idx));

  const submitCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await createDelivery({
        ...createForm,
        purchase_order_id: sourceMode === "po" ? (selectedPoId || null) : null,
        material_request_id: materialRequestId,
        items: createItems.filter((i) => i.item_name && i.ordered_qty),
      });
      closeCreateModal();
      setCreateForm({ project_id: "", vendor_id: "", expected_date: "", remarks: "" });
      setCreateItems([{ ...emptyItemRow }]);
      setSelectedPoId("");
      setMaterialRequestId(null);
      setToast({ type: "success", text: "Delivery created" });
      load();
      getOpenPurchaseOrders().then((res) => setPurchaseOrders(res.data)).catch(() => {});
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to create delivery");
    } finally {
      setSaving(false);
    }
  };

  const openAction = (type, delivery) => {
    setActionModal({ type, delivery });
    setError("");
    requestAnimationFrame(() => setActionShow(true));
    if (type === "deliver") {
      setActionForm({
        delivery_date: "", received_by_name: "", remarks: "",
        delivered_qtys: delivery.items.map((it) => ({ delivery_item_id: it.id, delivered_qty: it.ordered_qty, damaged_qty: 0 })),
      });
    } else if (type === "dispatch") {
      setActionForm({
        vehicle_number: "", driver_name: "", transporter: "", dispatch_date: "",
        dispatched_qtys: delivery.items.map((it) => ({ delivery_item_id: it.id, dispatched_qty: it.ordered_qty })),
      });
    } else {
      setActionForm({ delay_reason: "", new_eta: "" });
    }
  };
  const closeAction = () => { setActionShow(false); setTimeout(() => setActionModal(null), 150); };

  const submitAction = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { type, delivery } = actionModal;
      if (type === "dispatch") await dispatchDelivery(delivery.id, actionForm);
      else if (type === "deliver") await markDelivered(delivery.id, actionForm);
      else if (type === "delay") await markDelayed(delivery.id, actionForm);
      closeAction();
      setToast({ type: "success", text: `${delivery.delivery_code} updated` });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Action failed");
    } finally {
      setSaving(false);
    }
  };

  const quickInTransit = async (d) => {
    try {
      await markInTransit(d.id);
      setToast({ type: "success", text: `${d.delivery_code} is now in transit` });
      load();
    } catch (err) {
      setToast({ type: "error", text: err?.response?.data?.error || "Failed to update" });
    }
  };

  return (
    <div className="ops-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="ops-header">
        <h1 className="ops-title">Deliveries</h1>
        <button onClick={openCreateModal} className="ops-btn ops-btn-primary"><Plus size={16} /> New Delivery</button>
      </div>

      <div className="ops-tabs">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`ops-tab ${statusFilter === s ? "ops-tab-active" : ""}`}>
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="ops-card ops-table-wrap">
        <table className="ops-table">
          <thead><tr><th>Delivery</th><th>Project</th><th>Vendor</th><th>Progress</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} style={{ padding: "10px 20px" }}><div className="ops-skeleton" style={{ height: 14 }} /></td>)}</tr>
              ))
            ) : deliveries.length === 0 ? (
              <tr><td colSpan={6} className="ops-table-empty"><PackageX size={28} /><br />No deliveries found.</td></tr>
            ) : (
              deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="del-code">{d.delivery_code}</td>
                  <td>{d.project_name}</td>
                  <td>{d.vendor_name || "—"}</td>
                  <td><StatusStepper status={d.status} /></td>
                  <td><span className={`ops-badge ${STATUS_BADGE[d.status]}`}><span className="ops-badge-dot" />{d.status.replace("_", " ")}</span></td>
                  <td className="del-actions">
                    {d.status === "scheduled" && <button onClick={() => openAction("dispatch", d)} className="del-action-btn del-action-sky">Dispatch</button>}
                    {d.status === "dispatched" && <button onClick={() => quickInTransit(d)} className="del-action-btn del-action-indigo">In Transit</button>}
                    {["dispatched", "in_transit", "delayed"].includes(d.status) && <button onClick={() => openAction("deliver", d)} className="del-action-btn del-action-emerald">Delivered</button>}
                    {["scheduled", "dispatched", "in_transit"].includes(d.status) && <button onClick={() => openAction("delay", d)} className="del-action-btn del-action-red">Delay</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE DELIVERY MODAL */}
      {createOpen && (
        <div className={`ops-modal-overlay ${createShow ? "ops-modal-show" : ""}`} onClick={closeCreateModal}>
          <div className="ops-modal ops-modal-wide ops-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h2><Truck size={18} /> New Delivery</h2>
              <button className="ops-modal-close" onClick={closeCreateModal}><X size={18} /></button>
            </div>
            {error && <p className="ops-alert ops-alert-error">{error}</p>}
            <form onSubmit={submitCreate} className="del-form">
              <div className="del-source-toggle">
                <button type="button" className={`ops-tab ${sourceMode === "po" ? "ops-tab-active" : ""}`} onClick={() => setSourceMode("po")}>
                  <ClipboardList size={14} /> From Purchase Order
                </button>
                <button type="button" className={`ops-tab ${sourceMode === "manual" ? "ops-tab-active" : ""}`} onClick={switchToManual}>
                  Manual Entry
                </button>
              </div>

              {sourceMode === "po" && (
                <div className="ops-form-group">
                  <label className="ops-label">Purchase Order *</label>
                  {purchaseOrders.length === 0 ? (
                    <p className="ops-alert ops-alert-info">No open purchase orders right now — switch to Manual Entry, or ask Procurement to issue one.</p>
                  ) : (
                    <select required className="ops-select" value={selectedPoId} onChange={(e) => applyPurchaseOrder(e.target.value)}>
                      <option value="">Select a PO…</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_code} — {po.vendor_name || "No vendor"} · {po.project_name || "No project"}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedPoId && <p className="del-po-hint">Project, vendor and materials below were filled in from this PO — edit if needed.</p>}
                </div>
              )}

              <div className="ops-form-row">
                <div className="ops-form-group">
                  <label className="ops-label">Project *</label>
                  <select required className="ops-select" value={createForm.project_id} onChange={(e) => setCreateForm({ ...createForm, project_id: e.target.value })}>
                    <option value="">Select…</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="ops-form-group">
                  <label className="ops-label">Vendor</label>
                  <select className="ops-select" value={createForm.vendor_id} onChange={(e) => setCreateForm({ ...createForm, vendor_id: e.target.value })}>
                    <option value="">Select…</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="ops-form-group">
                <label className="ops-label">Expected Date</label>
                <input type="date" className="ops-input" value={createForm.expected_date} onChange={(e) => setCreateForm({ ...createForm, expected_date: e.target.value })} />
              </div>

              <div className="ops-form-group">
                <label className="ops-label">Materials {sourceMode === "po" && selectedPoId && "(from PO — edit if needed)"}</label>
                <div className="del-item-rows">
                  {createItems.map((row, idx) => (
                    <div key={idx} className="del-item-row">
                      <input placeholder="Material" className="ops-input del-item-name" value={row.item_name} onChange={(e) => updateItemRow(idx, "item_name", e.target.value)} />
                      <input placeholder="Unit" className="ops-input del-item-unit" value={row.unit} onChange={(e) => updateItemRow(idx, "unit", e.target.value)} />
                      <input placeholder="Qty" type="number" className="ops-input del-item-qty" value={row.ordered_qty} onChange={(e) => updateItemRow(idx, "ordered_qty", e.target.value)} />
                      <button type="button" onClick={() => removeItemRow(idx)} className="del-item-remove">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItemRow} className="del-add-item">+ Add another item</button>
              </div>

              <div className="ops-form-group">
                <label className="ops-label">Remarks</label>
                <input className="ops-input" value={createForm.remarks} onChange={(e) => setCreateForm({ ...createForm, remarks: e.target.value })} />
              </div>

              <div className="ops-modal-footer">
                <button type="button" onClick={closeCreateModal} className="ops-btn ops-btn-outline">Cancel</button>
                <button disabled={saving} className="ops-btn ops-btn-primary">{saving ? "Creating…" : "Create Delivery"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISPATCH / DELIVER / DELAY MODAL */}
      {actionModal && (
        <div className={`ops-modal-overlay ${actionShow ? "ops-modal-show" : ""}`} onClick={closeAction}>
          <div className="ops-modal ops-scrollbar" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h2>
                {actionModal.type === "deliver" && <PackageCheck size={18} />}
                {actionModal.type === "delay" && <AlertTriangle size={18} />}
                {actionModal.type === "dispatch" && <Truck size={18} />}
                {actionModal.type === "dispatch" && "Dispatch Delivery"}
                {actionModal.type === "deliver" && "Mark Delivered"}
                {actionModal.type === "delay" && "Mark Delayed"}
                {" — "}{actionModal.delivery.delivery_code}
              </h2>
              <button className="ops-modal-close" onClick={closeAction}><X size={18} /></button>
            </div>
            {error && <p className="ops-alert ops-alert-error">{error}</p>}

            <form onSubmit={submitAction} className="del-form">
              {actionModal.type === "dispatch" && (
                <>
                  <div className="ops-form-row">
                    <div className="ops-form-group"><label className="ops-label">Vehicle Number</label>
                      <input className="ops-input" value={actionForm.vehicle_number} onChange={(e) => setActionForm({ ...actionForm, vehicle_number: e.target.value })} /></div>
                    <div className="ops-form-group"><label className="ops-label">Driver Name</label>
                      <input className="ops-input" value={actionForm.driver_name} onChange={(e) => setActionForm({ ...actionForm, driver_name: e.target.value })} /></div>
                  </div>
                  <div className="ops-form-group"><label className="ops-label">Transporter</label>
                    <input className="ops-input" value={actionForm.transporter} onChange={(e) => setActionForm({ ...actionForm, transporter: e.target.value })} /></div>
                </>
              )}

              {actionModal.type === "deliver" && (
                <>
                  <div className="ops-form-row">
                    <div className="ops-form-group"><label className="ops-label">Delivery Date</label>
                      <input type="date" className="ops-input" value={actionForm.delivery_date} onChange={(e) => setActionForm({ ...actionForm, delivery_date: e.target.value })} /></div>
                    <div className="ops-form-group"><label className="ops-label">Received By</label>
                      <input className="ops-input" value={actionForm.received_by_name} onChange={(e) => setActionForm({ ...actionForm, received_by_name: e.target.value })} /></div>
                  </div>
                  <div className="del-deliver-lines">
                    {actionModal.delivery.items.map((it, idx) => (
                      <div key={it.id} className="del-deliver-row">
                        <span className="del-deliver-name">{it.item_name}</span>
                        <input type="number" placeholder="Delivered qty" className="ops-input" value={actionForm.delivered_qtys[idx].delivered_qty}
                          onChange={(e) => { const arr = [...actionForm.delivered_qtys]; arr[idx].delivered_qty = e.target.value; setActionForm({ ...actionForm, delivered_qtys: arr }); }} />
                        <input type="number" placeholder="Damaged qty" className="ops-input" value={actionForm.delivered_qtys[idx].damaged_qty}
                          onChange={(e) => { const arr = [...actionForm.delivered_qtys]; arr[idx].damaged_qty = e.target.value; setActionForm({ ...actionForm, delivered_qtys: arr }); }} />
                      </div>
                    ))}
                  </div>
                </>
              )}

              {actionModal.type === "delay" && (
                <>
                  <div className="ops-form-group"><label className="ops-label">Delay Reason *</label>
                    <input required className="ops-input" value={actionForm.delay_reason} onChange={(e) => setActionForm({ ...actionForm, delay_reason: e.target.value })} /></div>
                  <div className="ops-form-group"><label className="ops-label">New Expected Date</label>
                    <input type="date" className="ops-input" value={actionForm.new_eta} onChange={(e) => setActionForm({ ...actionForm, new_eta: e.target.value })} /></div>
                </>
              )}

              <div className="ops-form-group">
                <label className="ops-label">Remarks</label>
                <input className="ops-input" value={actionForm.remarks || ""} onChange={(e) => setActionForm({ ...actionForm, remarks: e.target.value })} />
              </div>

              <div className="ops-modal-footer">
                <button type="button" onClick={closeAction} className="ops-btn ops-btn-outline">Cancel</button>
                <button disabled={saving} className="ops-btn ops-btn-primary">{saving ? "Saving…" : "Confirm"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deliveries;