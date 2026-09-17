// ===== FILE: APP_Vindia/app_vindia/src/pages/Operations/PurchaseOrders/CreatePO.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import financeService from "../../../services/financeService";
import { getProjects } from "../../../services/projectService";
import "./CreatePO.css";

// material_requests.items entries look like:
//   { description, category, qty, unit, spec }
// (see app_vindia/src/pages/siteEngineer/Materialrequest.jsx — BLANK_ITEM)
// purchase_order_items columns are: item_name, unit, ordered_qty
// so pre-filling has to map description -> item_name and qty -> ordered_qty.
const mapRequestItemsToPOItems = (items) => {
  const parsed = typeof items === "string" ? JSON.parse(items) : items;
  if (!Array.isArray(parsed)) return [];
  return parsed.map((it) => ({
    item_name: it.description || "",
    unit: it.unit || "",
    ordered_qty: it.qty || "",
  }));
};

const CreatePO = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [request, setRequest] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);

  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqRes, vendorRes, projRes] = await Promise.all([
        procurementService.getApprovedRequests(),
        financeService.getAllVendors(),
        getProjects(),
      ]);

      const matchedRequest = reqRes.data.find(
        (r) => String(r.id) === String(requestId)
      );

      if (!matchedRequest) {
        setError(
          "This request is no longer available — it may already have a PO, or was not found."
        );
        return;
      }

      const vendorList = vendorRes.data.data || vendorRes.data || [];
      const projectList = projRes.data.projects || projRes.data || [];

      setRequest(matchedRequest);
      setVendors(vendorList);
      setProjects(projectList);
      setItems(mapRequestItemsToPOItems(matchedRequest.items));

      // Best-effort pre-select: material_requests.project is free text,
      // not a projects.id FK, so this only pre-fills on a name match —
      // the officer can always change it.
      const nameMatch = projectList.find(
        (p) =>
          p.name &&
          matchedRequest.project &&
          p.name.trim().toLowerCase() === matchedRequest.project.trim().toLowerCase()
      );
      if (nameMatch) setProjectId(String(nameMatch.id));
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to load data for this purchase order"
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { item_name: "", unit: "", ordered_qty: "" }]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setSaveError(null);

    if (!vendorId) {
      setSaveError("Select a vendor.");
      return;
    }
    if (!projectId) {
      setSaveError("Select a project.");
      return;
    }
    if (
      items.length === 0 ||
      items.some((it) => !it.item_name.trim() || !(Number(it.ordered_qty) > 0))
    ) {
      setSaveError("Every line item needs a name and a positive quantity.");
      return;
    }

    setSaving(true);
    try {
      const res = await procurementService.createPurchaseOrder({
        material_request_id: request.id,
        vendor_id: vendorId,
        project_id: projectId,
        items: items.map((it) => ({
          item_name: it.item_name.trim(),
          unit: it.unit || null,
          ordered_qty: Number(it.ordered_qty),
        })),
      });
      navigate(`/operations/procurement/purchase-orders/${res.data.id}`);
    } catch (err) {
      setSaveError(err.response?.data?.error || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="cpo-state">Loading…</div>;

  if (error) {
    return (
      <div className="cpo-state cpo-state--error">
        {error}
        <button onClick={() => navigate("/operations/procurement/purchase-requests")}>
          Back to Approved Requests
        </button>
      </div>
    );
  }

  return (
    <div className="cpo-page">
      <h1>Create Purchase Order</h1>
      <p className="cpo-subtitle">
        From request: <strong>{request.project || "—"}</strong> / {request.zone || "—"} — {request.purpose || "—"}
      </p>

      <div className="cpo-form-row">
        <label>
          Vendor
          <select value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Select vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Project
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cpo-items-section">
        <div className="cpo-items-header">
          <h2>Line Items</h2>
          <button type="button" className="cpo-add-item-btn" onClick={addItemRow}>
            + Add Item
          </button>
        </div>

        <table className="cpo-items-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Ordered Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={it.item_name}
                    onChange={(e) => updateItem(i, "item_name", e.target.value)}
                    placeholder="Item name"
                  />
                </td>
                <td>
                  <input
                    value={it.unit}
                    onChange={(e) => updateItem(i, "unit", e.target.value)}
                    placeholder="kg / bags / nos"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.ordered_qty}
                    onChange={(e) => updateItem(i, "ordered_qty", e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="cpo-remove-btn"
                    onClick={() => removeItemRow(i)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {saveError && <p className="cpo-save-error">{saveError}</p>}

      <div className="cpo-actions">
        <button
          type="button"
          className="cpo-cancel-btn"
          onClick={() => navigate("/operations/procurement/purchase-requests")}
        >
          Cancel
        </button>
        <button
          type="button"
          className="cpo-submit-btn"
          disabled={saving}
          onClick={handleSubmit}
        >
          {saving ? "Creating…" : "Create Purchase Order"}
        </button>
      </div>
    </div>
  );
};

export default CreatePO;