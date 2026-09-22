import { ROLES } from "../roles";

export const FINANCE_PERMISSIONS = {
  [ROLES.ACCOUNTANT]: {
    dashboard: ["view"],

    budget: ["view"],

    expenses: ["view", "create", "edit", "verify"],

    invoices: ["view", "create", "edit"],

    payments: ["view", "prepare"],

    vendors: ["view", "create", "edit"],

    journalEntries: ["view", "create", "edit", "submit"],

    ledger: ["view"],

    pettyCash: ["view", "create", "edit"],

    bankReconciliation: ["view", "create", "edit"],

    taxRegister: ["view", "create", "edit"],

    reports: ["view_basic"],

    settings: [],
  },

  [ROLES.FINANCE_MANAGER]: {
    dashboard: ["view"],

    budget: ["view", "create", "edit", "approve"],

    expenses: ["view", "approve", "reject"],

    invoices: ["view", "approve", "reject"],

    payments: ["view", "release", "reject"],

    vendors: ["view", "approve", "reject"],

    journalEntries: ["view", "approve", "post", "reverse"], // approve: submitted->approved, post: approved->posted

    ledger: ["view", "export"],

    pettyCash: ["view", "approve", "replenish"],

    bankReconciliation: ["view", "approve"],

    taxRegister: ["view", "approve", "export"],

    reports: ["view_basic", "view_advanced", "export"],

    settings: ["view", "edit"],
  },
};