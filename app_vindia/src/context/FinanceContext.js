import { createContext, useContext, useState, useEffect } from "react";

const FinanceContext = createContext(null);

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
};

// ── Mock data (replace with real API calls via financeService.js) ──────────
const MOCK_KPI = {
  totalBudget: 24600000,
  totalSpent: 17300000,
  remaining: 7300000,
  pendingPayments: 2100000,
  overdueInvoices: 7,
  activeProjects: 8,
};

const MOCK_PROJECTS = [
  { id: 1, name: "Block A – Residential Tower", budget: 9000000, spent: 8200000, status: "critical" },
  { id: 2, name: "Block B – Commercial Wing",   budget: 7000000, spent: 4100000, status: "healthy" },
  { id: 3, name: "Phase 3 – Infrastructure",    budget: 4500000, spent: 3200000, status: "warning" },
  { id: 4, name: "Road & Utilities",            budget: 4100000, spent: 1800000, status: "healthy" },
];

const MOCK_BUDGET_VS_ACTUAL = [
  { month: "Nov", budgeted: 3800000, actual: 3500000 },
  { month: "Dec", budgeted: 4200000, actual: 4600000 },
  { month: "Jan", budgeted: 3600000, actual: 3400000 },
  { month: "Feb", budgeted: 4800000, actual: 5200000 },
  { month: "Mar", budgeted: 3300000, actual: 3100000 },
  { month: "Apr", budgeted: 4100000, actual: 4400000 },
];

const MOCK_CASHFLOW = [
  { month: "Nov", inflow: 4200000, outflow: 3500000 },
  { month: "Dec", inflow: 5100000, outflow: 4600000 },
  { month: "Jan", inflow: 3800000, outflow: 3400000 },
  { month: "Feb", inflow: 6200000, outflow: 5200000 },
  { month: "Mar", inflow: 4900000, outflow: 3100000 },
  { month: "Apr", inflow: 5200000, outflow: 3800000 },
];

const MOCK_PAYMENTS = [
  { id: 1, vendor: "Buildcon Pvt Ltd",  amount: 1840000, dueDate: "2026-05-06", status: "overdue"  },
  { id: 2, vendor: "SteelTech India",   amount:  920000, dueDate: "2026-05-12", status: "pending"  },
  { id: 3, vendor: "CivilWorks Co.",    amount: 2270000, dueDate: "2026-05-15", status: "pending"  },
  { id: 4, vendor: "MEP Solutions",     amount:  680000, dueDate: "2026-05-08", status: "approved" },
  { id: 5, vendor: "Plumbing Works",    amount:  450000, dueDate: "2026-05-18", status: "pending"  },
];

const MOCK_WBS = [
  { category: "Civil Works",     allocated: 8500000, spent: 7100000 },
  { category: "Structural",      allocated: 5200000, spent: 4900000 },
  { category: "MEP",             allocated: 4100000, spent: 2800000 },
  { category: "Finishing",       allocated: 3800000, spent: 1600000 },
  { category: "External Works",  allocated: 3000000, spent: 900000  },
];

// ── Provider ───────────────────────────────────────────────────────────────
export const FinanceProvider = ({ children }) => {
  const [kpi, setKpi]                     = useState(MOCK_KPI);
  const [projects, setProjects]           = useState(MOCK_PROJECTS);
  const [budgetVsActual, setBudgetVsActual] = useState(MOCK_BUDGET_VS_ACTUAL);
  const [cashflow, setCashflow]           = useState(MOCK_CASHFLOW);
  const [payments, setPayments]           = useState(MOCK_PAYMENTS);
  const [wbsData, setWbsData]             = useState(MOCK_WBS);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  // When you wire up a real backend, replace this with:
  // useEffect(() => { financeService.getDashboardData().then(setKpi) }, []);

  const approvePayment = (paymentId) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, status: "approved" } : p))
    );
  };

  const value = {
    kpi, projects, budgetVsActual, cashflow, payments,
    wbsData, loading, error, selectedPeriod,
    setSelectedPeriod, approvePayment,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
};

export default FinanceContext;