import AppLayout from "./AppLayout";
import accountantMenu from "../menus/AccountantMenu";
import { ProjectProvider } from "../context/ProjectContext";
import { useAuth } from "../context/useAuth";
import { ROLES } from "../roles";
import "../pages/Accountant/AccountantShared.css";

const FINANCE_MANAGER_MENU_PATHS = new Set([
  "/accountant/receivables-payables",
  "/accountant/daily-update",
  "/accountant/journal-entries",
  "/accountant/chart-of-accounts",
  "/accountant/general-ledger",
  "/accountant/bank-reconciliation",
  "/accountant/tax-register",
  "/accountant/petty-cash",
  "/accountant/reports",
]);

const CEO_MENU_PATHS = new Set([
  ...FINANCE_MANAGER_MENU_PATHS,
].filter((path) => path !== "/accountant/daily-update"));

function AccountantLayout({ children }) {
  const { user } = useAuth();
  const role = String(user?.role || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const menuItems =
    role === ROLES.ACCOUNTANT
      ? accountantMenu
      : accountantMenu.filter(({ path }) =>
          (role === ROLES.FINANCE_MANAGER
            ? FINANCE_MANAGER_MENU_PATHS
            : CEO_MENU_PATHS
          ).has(path)
        );

  return (
    <ProjectProvider>
      <AppLayout menuItems={menuItems}>
        <div className="accountant-content-frame">{children}</div>
      </AppLayout>
    </ProjectProvider>
  );
}

export default AccountantLayout;