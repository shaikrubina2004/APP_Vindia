import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import accountantService from "../../services/accountantService";
import AccountantResourcePage from "./AccountantResourcePage";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const FM_ROLES = ["finance_manager", "ceo"];

export default function PettyCash() {
  const { user } = useAuth();
  const isFinanceManager = FM_ROLES.includes(user?.role);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    accountantService
      .getPettyCashBalance()
      .then((res) => setBalance(res.data?.data ?? null))
      .catch(() => setBalance(null));
  }, []);

  return (
    <AccountantResourcePage
      title="Petty Cash"
      subtitle="Small day-to-day cash transactions. Approval/rejection is a Finance Manager action."
      fetchList={() => accountantService.getPettyCash()}
      emptyLabel="No petty cash transactions yet."
      summaryCards={
        balance
          ? [
              { label: "Total Inflow", value: formatCurrency(balance.totalInflow) },
              { label: "Total Outflow", value: formatCurrency(balance.totalOutflow) },
              { label: "Balance", value: formatCurrency(balance.balance) },
            ]
          : undefined
      }
      columns={[
        { key: "transaction_type", label: "Type" },
        { key: "category", label: "Category" },
        { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
        {
          key: "status",
          label: "Status",
          render: (r) => <span className={`acs-badge acs-badge-${r.status}`}>{r.status}</span>,
        },
      ]}
      createFields={[
        {
          name: "transaction_type", label: "Type", type: "select", required: true,
          options: [{ value: "inflow", label: "Inflow" }, { value: "outflow", label: "Outflow" }],
        },
        { name: "amount", label: "Amount", type: "number", required: true },
        { name: "category", label: "Category" },
        { name: "description", label: "Description" },
      ]}
      onCreate={(values) => accountantService.createPettyCash(values)}
      rowActions={
        isFinanceManager
          ? [
              {
                label: "Approve",
                variant: "success",
                show: (row) => row.status === "pending",
                onClick: (row) => accountantService.approvePettyCash(row.id),
              },
              {
                label: "Reject",
                variant: "danger",
                show: (row) => row.status === "pending",
                onClick: (row) => accountantService.rejectPettyCash(row.id),
              },
            ]
          : undefined
      }
    />
  );
}
