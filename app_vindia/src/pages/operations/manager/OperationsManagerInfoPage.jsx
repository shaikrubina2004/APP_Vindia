import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList, FileBarChart, ListChecks, Users, Bell } from "lucide-react";
import "./OperationsManagerModule.css";

const CONFIG={
 tasks:{title:"Operations Tasks",text:"Use the existing project task infrastructure for operational task records. This page is the manager entry point; task ownership remains with the existing task module."},
 team:{title:"Operations Team",text:"Employee master data remains owned by HR. This manager view intentionally avoids creating a second employee database."},
 reports:{title:"Operations Reports",text:"Operational reporting is assembled from the Procurement, Logistics, Inventory and Office Administration APIs. Detailed transaction reports remain in their owning modules."},
 notifications:{title:"Operations Notifications",text:"Notifications are delivered through the existing Operations notification service. Use the notification bell in the application shell for unread items."},
};
const ICONS={tasks:ListChecks,team:Users,reports:FileBarChart,notifications:Bell};
export default function OperationsManagerInfoPage({module}){const c=CONFIG[module]||CONFIG.reports;const Icon=ICONS[module]||FileBarChart;return <div className="omm-page"><header className="omm-header"><div><span>Operations &amp; Administration</span><h1>{c.title}</h1><p>{c.text}</p></div><Link to="/operations/manager/dashboard" className="omm-back"><ArrowLeft size={15}/> Dashboard</Link></header><section className="omm-admin-callout"><div><Icon size={24} color="#0A4174"/><h2>Integrated workspace</h2><p>This entry point is intentionally lightweight so Developer 3 does not duplicate HR, project task, or notification business logic already present in the application.</p></div><Link to="/operations/manager/dashboard">Return to control center <ArrowRight size={15}/></Link></section></div>}
