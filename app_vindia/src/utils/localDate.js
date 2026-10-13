// ===== FILE: APP_Vindia/app_vindia/src/utils/localDate.js =====
// Calendar-date helpers in the USER'S timezone.
//
// Why this exists: `new Date().toISOString().slice(0, 10)` is the date in UTC. For a user in
// India (UTC+5:30) it returns *yesterday* between 00:00 and 05:30 — so "today" defaults,
// "diary submitted today?" checks, filters and due-date maths were off by one day for
// part of every morning. Use these instead; they only read local year/month/day.
const pad = (n) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" using the local calendar day. */
export const toLocalISO = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Today's local date, "YYYY-MM-DD". */
export const todayISO = () => toLocalISO(new Date());

/** Local date `n` days from today (negative = past). */
export const addDaysISO = (n, from = new Date()) => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
};

/** First 10 chars of an ISO-ish string, or "" — safe for values already in YYYY-MM-DD. */
export const dayPart = (iso) => String(iso || "").slice(0, 10);

/** Is this "YYYY-MM-DD…" value today (local)? */
export const isTodayISO = (iso) => dayPart(iso) === todayISO();

/** Parse "YYYY-MM-DD" as a LOCAL date (new Date("2026-10-12") is UTC midnight and can land on the
    previous day when formatted in a western timezone). */
export const parseLocalISO = (iso) => {
  const [y, m, d] = dayPart(iso).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
