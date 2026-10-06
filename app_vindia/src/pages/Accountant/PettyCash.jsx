import { useState, useEffect } from "react";
import { useAuth } from "../../context/useAuth";
import accountantService from "../../services/accountantService";
import { getProjects } from "../../services/projectService";
import AccountantResourcePage from "./AccountantResourcePage";
import FinanceWbsSelector, { WbsBadge } from "../../components/accountant/FinanceWbsSelector";

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;
const FM_ROLES = ["finance_manager", "ceo"];

export default function PettyCash() {
  const { user } = useAuth();
  const isFinanceManager = FM_ROLES.includes(user?.role);
  const [balance, setBalance] = useState(null);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    accountantService
      .getPettyCashBalance()
      .then((res) => setBalance(res.data?.data ?? null))
      .catch(() => setBalance(null));
    getProjects()
      .then((res) => setProjects(res?.data?.projects || res?.data || []))
      .catch(() => setProjects([]));
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
        {
          key: "wbs", label: "WBS",
          render: (r) => <WbsBadge code={r.wbs_code} name={r.wbs_name} milestoneCode={r.milestone_code} milestoneName={r.milestone_name} />,
        },
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
        {
          name: "project_id", label: "Project (leave blank for company-level cash)", type: "select",
          options: projects.map((p) => ({ value: p.id, label: p.name })),
        },
        {
          name: "wbs_id", label: "WBS / Milestone", type: "custom", hideLabel: true,
          render: (values, setValue) => (
            <FinanceWbsSelector
              projectId={values.project_id || null}
              projectLabel={projects.find((p) => String(p.id) === String(values.project_id))?.name}
              value={values.wbs_id}
              onChange={(ctx) => setValue("wbs_id", ctx ? String(ctx.wbs_id) : "")}
              fetchWbs={accountantService.getFinanceWbs}
              required={!!values.project_id}
              helperText="Required for project-related petty cash; leave the project blank for genuine company-level cash."
            />
          ),
        },
      ]}
      onCreate={(values) => accountantService.createPettyCash({
        ...values,
        project_id: values.project_id || null,
        wbs_id: values.project_id ? (values.wbs_id || null) : null,
      })}
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
