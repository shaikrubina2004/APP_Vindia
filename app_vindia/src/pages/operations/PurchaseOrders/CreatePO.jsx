// ===== FILE: APP_Vindia/app_vindia/src/pages/operations/PurchaseOrders/CreatePO.jsx =====
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import procurementService from "../../../services/procurementService";
import financeService from "../../../services/financeService";
import "./CreatePO.css";

// Approved material requests are the source of truth for Project + WBS.
// Procurement must not select a different project/WBS while creating a PO.
const mapRequestItemsToPOItems = (items) => {
  const parsed = typeof items === "string" ? JSON.parse(items) : items;
  if (!Array.isArray(parsed)) return [];

  return parsed.map((it) => ({
    item_name: it.description || "",
    unit: it.unit || "",
    ordered_qty: it.qty || "",
    unit_price: "",
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
  const [items, setItems] = useState([]);

  const [vendorId, setVendorId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [reqRes, vendorRes] = await Promise.all([
        procurementService.getApprovedRequests(),
        financeService.getAllVendors(),
      ]);

      const matchedRequest = (Array.isArray(reqRes.data) ? reqRes.data : []).find(
        (r) => String(r.id) === String(requestId)
      );

      if (!matchedRequest) {
        setError(
          "This request is no longer available — it may already have a PO, or was not found."
        );
        return;
      }

      const vendorList = vendorRes.data?.data || vendorRes.data || [];

      setRequest(matchedRequest);
      setVendors(vendorList);
      setItems(mapRequestItemsToPOItems(matchedRequest.items));
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Failed to load data for this purchase order"
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
      prev.map((it, i) =>
        i === index ? { ...it, [field]: value } : it
      )
    );
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        item_name: "",
        unit: "",
        ordered_qty: "",
        unit_price: "",
      },
    ]);
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

    if (
      items.length === 0 ||
      items.some(
        (it) =>
          !it.item_name.trim() ||
          !(Number(it.ordered_qty) > 0)
      )
    ) {
      setSaveError(
        "Every line item needs a name and a positive quantity."
      );
      return;
    }

    if (
      items.some(
        (it) =>
          it.unit_price !== "" &&
          !(Number(it.unit_price) >= 0)
      )
    ) {
      setSaveError("Unit price must be a number of 0 or more.");
      return;
    }

    setSaving(true);

    try {
      const res = await procurementService.createPurchaseOrder({
        material_request_id: request.id,
        vendor_id: vendorId,
        items: items.map((it) => ({
          item_name: it.item_name.trim(),
          unit: it.unit || null,
          ordered_qty: Number(it.ordered_qty),
          unit_price:
            it.unit_price === "" ||
            it.unit_price == null
              ? null
              : Number(it.unit_price),
        })),
      });

      navigate(
        `/operations/procurement/purchase-orders/${res.data.id}`
      );
    } catch (err) {
      setSaveError(
        err.response?.data?.error ||
          "Failed to create purchase order"
      );
    } finally {
      setSaving(false);
    }
  };

  const orderTotal = items.reduce(
    (sum, it) =>
      sum +
      (Number(it.ordered_qty) || 0) *
        (Number(it.unit_price) || 0),
    0
  );

  if (loading) {
    return <div className="cpo-state">Loading…</div>;
  }

  if (error) {
    return (
      <div className="cpo-state cpo-state--error">
        {error}
        <button
          onClick={() =>
            navigate(
              "/operations/procurement/purchase-requests"
            )
          }
        >
          Back to Approved Requests
        </button>
      </div>
    );
  }

  return (
    <div className="cpo-page">
      <h1>Create Purchase Order</h1>

      <p className="cpo-subtitle">
        From request:{" "}
        <strong>{request.project_name || request.project || "—"}</strong>{" "}
        / {request.zone || "—"} — {request.purpose || "—"}
      </p>

      {/* PROJECT / WBS CONTEXT */}
      <div
        className="cpo-form-row"
        style={{
          marginBottom: 18,
          padding: 14,
          borderRadius: 10,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
        }}
      >
        <label>
          Project
          <input
            value={
              request.project_name ||
              request.project ||
              "—"
            }
            readOnly
          />
        </label>

        <label>
          WBS Activity
          <input
            value={
              request.wbs_code
                ? `${request.wbs_code} — ${
                    request.wbs_name || ""
                  }`
                : request.wbs_name || "—"
            }
            readOnly
          />
        </label>
      </div>

      <p
        style={{
          margin: "-4px 0 18px",
          fontSize: 12,
          color: "#64748b",
        }}
      >
        Project and WBS are inherited from the approved material
        request and cannot be changed during PO creation.
      </p>

      <div className="cpo-form-row">
        <label>
          Vendor
          <select
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
          >
            <option value="">Select vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="cpo-items-section">
        <div className="cpo-items-header">
          <h2>Line Items</h2>

          <button
            type="button"
            className="cpo-add-item-btn"
            onClick={addItemRow}
          >
            + Add Item
          </button>
        </div>

        <table className="cpo-items-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Ordered Qty</th>
              <th>Unit Price (₹)</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={it.item_name}
                    onChange={(e) =>
                      updateItem(
                        i,
                        "item_name",
                        e.target.value
                      )
                    }
                    placeholder="Item name"
                  />
                </td>

                <td>
                  <input
                    value={it.unit}
                    onChange={(e) =>
                      updateItem(
                        i,
                        "unit",
                        e.target.value
                      )
                    }
                    placeholder="kg / bags / nos"
                  />
                </td>

                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.ordered_qty}
                    onChange={(e) =>
                      updateItem(
                        i,
                        "ordered_qty",
                        e.target.value
                      )
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={it.unit_price ?? ""}
                    onChange={(e) =>
                      updateItem(
                        i,
                        "unit_price",
                        e.target.value
                      )
                    }
                    placeholder="optional"
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

      <p
        className="cpo-hint"
        style={{
          margin: "12px 0 0",
          fontSize: 13,
          color: "#475569",
        }}
      >
        Order total:{" "}
        <b>₹{orderTotal.toLocaleString("en-IN")}</b>

        {orderTotal > 100000
          ? " — above ₹1,00,000, so this PO will go to the Operations Manager for approval before it is issued."
          : ""}
      </p>

      {saveError && (
        <p className="cpo-save-error">{saveError}</p>
      )}

      <div className="cpo-actions">
        <button
          type="button"
          className="cpo-cancel-btn"
          onClick={() =>
            navigate(
              "/operations/procurement/purchase-requests"
            )
          }
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
