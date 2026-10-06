// Small formatting helpers shared by the Operations & Administration screens.

export const inr = (n) => {
  const v = Number(n || 0);
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      })
    : "—";

export const timeAgo = (d) => {
  if (!d) return "";
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

// material_requests.items / purchase_orders.items may arrive as a JSON string.
export const parseItems = (items) => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const isOverdue = (date) => {
  if (!date) return false;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime() < Date.now();
};

export const errorText = (err, fallback = "Something went wrong") =>
  err?.response?.data?.error || err?.response?.data?.message || fallback;

/* status -> badge tone (classes live in opsShared.css / operationsHub.css) */
export const STATUS_TONE = {
  // material requests
  requested: "amber", approved: "sky", delivered: "emerald", rejected: "red",
  // purchase orders
  pending_approval: "amber", issued: "sky", partially_fulfilled: "indigo",
  fulfilled: "emerald", cancelled: "gray",
  // deliveries
  scheduled: "gray", dispatched: "sky", in_transit: "indigo", delayed: "red",
  // office requests
  open: "sky", awaiting_approval: "amber", in_progress: "indigo", resolved: "emerald", closed: "gray",
  // office assets / visitors
  available: "emerald", assigned: "sky", maintenance: "amber", retired: "gray", lost: "red",
  expected: "amber", checked_in: "emerald", checked_out: "gray",
  // priorities
  low: "gray", normal: "sky", high: "amber", urgent: "red",
};
