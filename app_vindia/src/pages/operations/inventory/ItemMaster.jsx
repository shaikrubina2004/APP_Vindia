import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, X, PackageX } from "lucide-react";
import { getItems, createItem, updateItem, deleteItem } from "../../../services/inventoryService";
import Toast from "../../../components/Toast";
import "./ItemMaster.css";

const emptyForm = { item_name: "", category: "", unit: "", description: "", minimum_stock: 0, maximum_stock: "" };

const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} style={{ padding: "10px 20px" }}><div className="ops-skeleton" style={{ height: 14 }} /></td>
    ))}
  </tr>
);

const ItemMaster = () => {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalShow, setModalShow] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    getItems({ search })
      .then((res) => setItems(res.data))
      .catch(() => setToast({ type: "error", text: "Failed to load items" }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const openModal = () => { setModalOpen(true); requestAnimationFrame(() => setModalShow(true)); };
  const closeModal = () => { setModalShow(false); setTimeout(() => setModalOpen(false), 150); };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setError(""); openModal(); };
  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name, category: item.category || "", unit: item.unit,
      description: item.description || "", minimum_stock: item.minimum_stock, maximum_stock: item.maximum_stock || "",
    });
    setError("");
    openModal();
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) await updateItem(editingId, form);
      else await createItem(form);
      closeModal();
      setToast({ type: "success", text: editingId ? "Item updated" : "Item created" });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteItem(id);
      setToast({ type: "success", text: "Item removed" });
      setConfirmDelete(null);
      load();
    } catch {
      setToast({ type: "error", text: "Failed to delete item" });
    }
  };

  return (
    <div className="ops-page">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="ops-header">
        <div>
          <h1 className="ops-title">Item Master</h1>
          <p className="ops-subtitle">{items.length} material{items.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <button onClick={openCreate} className="ops-btn ops-btn-primary"><Plus size={16} /> New Item</button>
      </div>

      <div className="im-search">
        <Search size={16} className="im-search-icon" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item name or code…" className="ops-input im-search-input" />
      </div>

      <div className="ops-card ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Code</th><th>Name</th><th>Category</th><th>Unit</th><th>Min / Max</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="ops-table-empty"><PackageX size={28} /><br />No items yet. Create your first material.</td></tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td className="im-code">{it.item_code}</td>
                  <td className="im-name">{it.item_name}</td>
                  <td>{it.category || "—"}</td>
                  <td>{it.unit}</td>
                  <td>{it.minimum_stock} / {it.maximum_stock ?? "—"}</td>
                  <td>
                    <span className={`ops-badge ${it.status === "active" ? "ops-badge-emerald" : "ops-badge-gray"}`}>
                      <span className="ops-badge-dot" />{it.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button onClick={() => openEdit(it)} className="im-action-btn im-action-edit"><Pencil size={15} /></button>
                    <button onClick={() => setConfirmDelete(it)} className="im-action-btn im-action-delete"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className={`ops-modal-overlay ${modalShow ? "ops-modal-show" : ""}`} onClick={closeModal}>
          <div className="ops-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ops-modal-header">
              <h2>{editingId ? "Edit Item" : "New Item"}</h2>
              <button className="ops-modal-close" onClick={closeModal}><X size={18} /></button>
            </div>

            {error && <p className="ops-alert ops-alert-error">{error}</p>}

            <form onSubmit={save} className="im-form">
              <div className="ops-form-group">
                <label className="ops-label">Item Name *</label>
                <input required className="ops-input" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} />
              </div>
              <div className="ops-form-row">
                <div className="ops-form-group">
                  <label className="ops-label">Category</label>
                  <input className="ops-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                </div>
                <div className="ops-form-group">
                  <label className="ops-label">Unit *</label>
                  <input required placeholder="Bag, Ton, Nos…" className="ops-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
                </div>
              </div>
              <div className="ops-form-row">
                <div className="ops-form-group">
                  <label className="ops-label">Minimum Stock</label>
                  <input type="number" min="0" className="ops-input" value={form.minimum_stock} onChange={(e) => setForm({ ...form, minimum_stock: e.target.value })} />
                </div>
                <div className="ops-form-group">
                  <label className="ops-label">Maximum Stock</label>
                  <input type="number" min="0" className="ops-input" value={form.maximum_stock} onChange={(e) => setForm({ ...form, maximum_stock: e.target.value })} />
                </div>
              </div>
              <div className="ops-form-group">
                <label className="ops-label">Description</label>
                <textarea rows={2} className="ops-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="ops-modal-footer">
                <button type="button" onClick={closeModal} className="ops-btn ops-btn-outline">Cancel</button>
                <button disabled={saving} className="ops-btn ops-btn-primary">{saving ? "Saving…" : "Save Item"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {confirmDelete && (
        <div className="ops-modal-overlay ops-modal-show" onClick={() => setConfirmDelete(null)}>
          <div className="ops-modal" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Delete "{confirmDelete.item_name}"?</h2>
            <p className="ops-muted">If this item already has stock history, it'll be deactivated instead of deleted.</p>
            <div className="ops-modal-footer">
              <button onClick={() => setConfirmDelete(null)} className="ops-btn ops-btn-outline">Cancel</button>
              <button onClick={() => remove(confirmDelete.id)} className="ops-btn ops-btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemMaster;