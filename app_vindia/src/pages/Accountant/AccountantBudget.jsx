import accountantService from "../../services/accountantService";
import AccountantResourcePage from "./AccountantResourcePage";
import { WbsBadge } from "../../components/accountant/FinanceWbsSelector";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

export default function AccountantBudget() {
  return (
    <AccountantResourcePage
      title="Budget"
      subtitle="View-only for the Accountant role. Creating and editing budgets is a Finance Manager action (financeRoutes.js: 'Restricted to Finance Manager and CEO') — not exposed here, and not mounted on the Accountant backend router."
      fetchList={() => accountantService.getBudgets()}
      emptyLabel="No budgets yet."
      columns={[
        { key: "category", label: "Category" },
        {
          key: "wbs", label: "WBS",
          render: (r) => <WbsBadge code={r.wbs_code} name={r.wbs_name} milestoneCode={r.milestone_code} milestoneName={r.milestone_name} />,
        },
        { key: "allocated_amount", label: "Allocated", render: (r) => formatCurrency(r.allocated_amount) },
        { key: "spent_amount", label: "Spent (auto)", render: (r) => formatCurrency(r.spent_amount) },
        { key: "fiscal_year", label: "Fiscal Year" },
      ]}
      // No createFields/onCreate: Accountant is view-only on budgets.
    />
  );
}
