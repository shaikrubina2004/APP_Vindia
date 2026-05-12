// ── Indian Rupee formatters ────────────────────────────────────────────────

/**
 * Format a number as Indian Rupees with Cr / L shorthand.
 * formatINR(24600000)  → "₹2.46 Cr"
 * formatINR(1840000)   → "₹18.4 L"
 * formatINR(45000)     → "₹45,000"
 */
export const formatINR = (amount) => {
  if (amount == null) return "—";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
  if (abs >= 100000)   return `${sign}₹${(abs / 100000).toFixed(1)} L`;
  return `${sign}₹${abs.toLocaleString("en-IN")}`;
};

/**
 * Full rupee format with paise, e.g. ₹18,40,000.00
 */
export const formatINRFull = (amount) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount ?? 0);

/**
 * Return percentage string, e.g. 0.714 → "71.4%"
 */
export const formatPercent = (value, decimals = 1) =>
  `${(value * 100).toFixed(decimals)}%`;

/**
 * Budget utilisation ratio (spent / budget), clamped 0–1
 */
export const utilisation = (spent, budget) =>
  budget > 0 ? Math.min(spent / budget, 1) : 0;

/**
 * Returns a status label based on utilisation
 */
export const utilisationStatus = (spent, budget) => {
  const ratio = utilisation(spent, budget);
  if (ratio >= 0.95) return "critical";
  if (ratio >= 0.80) return "warning";
  return "healthy";
};