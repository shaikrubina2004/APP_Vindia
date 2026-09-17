import { createContext, useContext, useEffect, useState } from "react";
import financeService from "../services/financeService";

const FinanceContext = createContext(null);

export const FinanceProvider = ({ children }) => {
  const [dashboard, setDashboard] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [receivablesPayables, setReceivablesPayables] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      setError("");

      const [
        dashboardResponse,
        budgetsResponse,
        expensesResponse,
        invoicesResponse,
        paymentsResponse,
        vendorsResponse,
        receivablesResponse,
      ] = await Promise.all([
        financeService.getDashboard(),
        financeService.getAllBudgets(),
        financeService.getAllExpenses(),
        financeService.getAllInvoices(),
        financeService.getAllPayments(),
        financeService.getAllVendors(),
        financeService.getReceivablesPayables(),
      ]);

      setDashboard(
        dashboardResponse?.data?.data ||
          dashboardResponse?.data ||
          null
      );

      setBudgets(
        budgetsResponse?.data?.data ||
          budgetsResponse?.data ||
          []
      );

      setExpenses(
        expensesResponse?.data?.data ||
          expensesResponse?.data ||
          []
      );

      setInvoices(
        invoicesResponse?.data?.data ||
          invoicesResponse?.data ||
          []
      );

      setPayments(
        paymentsResponse?.data?.data ||
          paymentsResponse?.data ||
          []
      );

      setVendors(
        vendorsResponse?.data?.data ||
          vendorsResponse?.data ||
          []
      );

      setReceivablesPayables(
        receivablesResponse?.data?.data ||
          receivablesResponse?.data ||
          null
      );
    } catch (err) {
      console.error("Finance data loading error:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load finance data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  // -----------------------------
  // Budget methods
  // -----------------------------

  const createBudget = async (payload) => {
    const response = await financeService.createBudget(payload);
    await loadFinanceData();
    return response;
  };

  const updateBudget = async (id, payload) => {
    const response = await financeService.updateBudget(id, payload);
    await loadFinanceData();
    return response;
  };

  const deleteBudget = async (id) => {
    const response = await financeService.deleteBudget(id);
    await loadFinanceData();
    return response;
  };

  // -----------------------------
  // Expense methods
  // -----------------------------

  const createExpense = async (payload) => {
    const response = await financeService.createExpense(payload);
    await loadFinanceData();
    return response;
  };

  const updateExpense = async (id, payload) => {
    const response = await financeService.updateExpense(id, payload);
    await loadFinanceData();
    return response;
  };

  const deleteExpense = async (id) => {
    const response = await financeService.deleteExpense(id);
    await loadFinanceData();
    return response;
  };

  // -----------------------------
  // Invoice methods
  // -----------------------------

  const createInvoice = async (payload) => {
    const response = await financeService.createInvoice(payload);
    await loadFinanceData();
    return response;
  };

  const updateInvoiceStatus = async (id, status) => {
    const response = await financeService.updateInvoiceStatus(
      id,
      status
    );

    await loadFinanceData();
    return response;
  };

  const deleteInvoice = async (id) => {
    const response = await financeService.deleteInvoice(id);
    await loadFinanceData();
    return response;
  };

  // -----------------------------
  // Payment methods
  // -----------------------------

  const createPayment = async (payload) => {
    const response = await financeService.createPayment(payload);
    await loadFinanceData();
    return response;
  };

  const updatePayment = async (id, payload) => {
    const response = await financeService.updatePayment(id, payload);
    await loadFinanceData();
    return response;
  };

  const deletePayment = async (id) => {
    const response = await financeService.deletePayment(id);
    await loadFinanceData();
    return response;
  };

  // -----------------------------
  // Vendor methods
  // -----------------------------

  const createVendor = async (payload) => {
    const response = await financeService.createVendor(payload);
    await loadFinanceData();
    return response;
  };

  const updateVendor = async (id, payload) => {
    const response = await financeService.updateVendor(id, payload);
    await loadFinanceData();
    return response;
  };

  const toggleVendorStatus = async (id, status) => {
    const response = await financeService.toggleVendorStatus(
      id,
      status
    );

    await loadFinanceData();
    return response;
  };

  const deleteVendor = async (id) => {
    const response = await financeService.deleteVendor(id);
    await loadFinanceData();
    return response;
  };

  const value = {
    dashboard,
    budgets,
    expenses,
    invoices,
    payments,
    vendors,
    receivablesPayables,

    loading,
    error,

    refreshFinance: loadFinanceData,

    createBudget,
    updateBudget,
    deleteBudget,

    createExpense,
    updateExpense,
    deleteExpense,

    createInvoice,
    updateInvoiceStatus,
    deleteInvoice,

    createPayment,
    updatePayment,
    deletePayment,

    createVendor,
    updateVendor,
    toggleVendorStatus,
    deleteVendor,
  };

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);

  if (!context) {
    throw new Error(
      "useFinance must be used inside FinanceProvider"
    );
  }

  return context;
};

export default FinanceContext;