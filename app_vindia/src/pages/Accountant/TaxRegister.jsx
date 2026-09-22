import { useAuth } from "../../context/useAuth";
import accountantService from "../../services/accountantService";
import AccountantResourcePage from "./AccountantResourcePage";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const FM_ROLES = ["finance_manager", "ceo"];

export default function TaxRegister() {
  const { user } = useAuth();
  const isFinanceManager = FM_ROLES.includes(user?.role);

  return (
    <AccountantResourcePage
      title="Tax Register"
      subtitle="Tracks tax on invoices/expenses by filing period. Dedicated schema — existing tables only had a flat tax_amount, not enough for a real register."
      fetchList={() => accountantService.getTaxRegister()}
      emptyLabel="No tax register entries yet."
      columns={[
        { key: "source_type", label: "Source" },
        { key: "tax_type", label: "Tax Type" },
        { key: "taxable_amount", label: "Taxable Amount", render: (r) => formatCurrency(r.taxable_amount) },
        { key: "tax_amount", label: "Tax Amount", render: (r) => formatCurrency(r.tax_amount) },
        { key: "filing_period", label: "Filing Period" },
        {
          key: "status",
          label: "Status",
          render: (r) => <span className={`acs-badge acs-badge-${r.status}`}>{r.status}</span>,
        },
      ]}
      createFields={[
        {
          name: "source_type", label: "Source Type", type: "select", required: true,
          options: [{ value: "invoice", label: "Invoice" }, { value: "expense", label: "Expense" }],
        },
        { name: "source_id", label: "Source ID", type: "number", required: true },
        {
          name: "tax_type", label: "Tax Type", type: "select", required: true,
          options: [{ value: "gst", label: "GST" }, { value: "tds", label: "TDS" }, { value: "other", label: "Other" }],
        },
        { name: "rate", label: "Rate (%)", type: "number" },
        { name: "taxable_amount", label: "Taxable Amount", type: "number", required: true },
        { name: "tax_amount", label: "Tax Amount", type: "number", required: true },
        { name: "filing_period", label: "Filing Period (e.g. 2025-Q3)" },
      ]}
      onCreate={(values) => accountantService.createTaxRegisterEntry(values)}
      rowActions={
        isFinanceManager
          ? [
              {
                label: "Mark Filed",
                variant: "success",
                show: (row) => row.status === "pending",
                onClick: (row) => accountantService.markTaxRegisterFiled(row.id),
              },
            ]
          : undefined
      }
    />
  );
}
