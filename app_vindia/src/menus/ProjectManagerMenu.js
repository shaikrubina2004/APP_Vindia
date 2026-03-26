import { LayoutDashboard, Users, Clock, FileText, Wallet } from "lucide-react";

export const ProjectManagerMenu = [
  {
    name: "PM Dashboard",
    path: "/ProjectManager/Dashboard",
    icon: LayoutDashboard,
  },
  { name: "WBS", path: "/ProjectManager/WBS", icon: Users },
  {
    name: "Cost Tracking",
    path: "/ProjectManager/CostTracking",
    icon: FileText,
  },
  { name: "Payment", path: "/ProjectManager/payment", icon: Wallet },
];
