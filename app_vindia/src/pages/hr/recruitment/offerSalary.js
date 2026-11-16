// ===== FILE: APP_Vindia/app_vindia/src/pages/hr/recruitment/offerSalary.js =====
//
// Helpers for the offer form's salary (Annexure 1 of the offer letter).
//   - HR can type the salary as LPA (2.4), yearly rupees (240000) or monthly
//     rupees (20000); toAnnualRupees() turns it into yearly rupees.
//   - suggestBreakup() proposes the Annexure 1 split. It is only a
//     suggestion: HR can change every figure on the form.

export const DEFAULT_OFFICE_ADDRESS =
  "VIndia Infrasec, G-23, Brigade Archade, Garudacharapalaya, Mahadevapura";

export const SALARY_UNITS = [
  { value: "lpa", label: "LPA (lakhs per year), e.g. 2.4" },
  { value: "annual", label: "₹ per year, e.g. 240000" },
  { value: "monthly", label: "₹ per month, e.g. 20000" },
];

// yearly rupees from what HR typed
export const toAnnualRupees = (value, unit) => {
  const n = Number(value) || 0;
  if (unit === "lpa") return Math.round(n * 100000);
  if (unit === "monthly") return Math.round(n * 12);
  return Math.round(n);
};

export const SALARY_FIELDS = [
  { key: "basic", label: "Basic" },
  { key: "hra", label: "House Rent Allowance" },
  { key: "special_allowance", label: "Special Allowance" },
  { key: "ex_gratia", label: "Ex-Gratia Bonus" },
  { key: "variable_pay", label: "Variable Pay (at 100% target)" },
  { key: "medical_insurance", label: "Medical Insurance Premium" },
];

export const BREAKUP_KEYS = SALARY_FIELDS.map((f) => f.key);

// Suggested split of a YEARLY salary (worked out from the sample offer letter;
// for 2,40,000 it gives the sample's monthly figures: 8,099 / 4,049 / 972 /
// 5,400 / 1,000 / 480 and 20,000 in total):
//   Ex-Gratia Bonus 27%, Variable Pay 5%, Medical Insurance 5,760 fixed.
//   The rest is split Basic : HRA : Special Allowance = 1 : 0.5 : 0.12.
export const suggestBreakup = (annual) => {
  const ctc = Math.round(Number(annual) || 0);
  if (ctc <= 0) {
    return Object.fromEntries(BREAKUP_KEYS.map((k) => [k, ""]));
  }
  const medical = Math.min(5760, ctc);
  const variable = Math.round(ctc * 0.05);
  const exGratia = Math.round(ctc * 0.27);
  const rest = Math.max(0, ctc - medical - variable - exGratia);
  const basic = Math.round(rest / 1.62);
  const hra = Math.round(basic * 0.5);
  const special = Math.max(0, rest - basic - hra); // balances the total
  return {
    basic: String(basic),
    hra: String(hra),
    special_allowance: String(special),
    ex_gratia: String(exGratia),
    variable_pay: String(variable),
    medical_insurance: String(medical),
  };
};

// Total of the six components on the form
export const sumBreakup = (form) =>
  BREAKUP_KEYS.reduce((sum, k) => sum + Math.round(Number(form[k]) || 0), 0);

export const formatINR = (n) => Number(n || 0).toLocaleString("en-IN");