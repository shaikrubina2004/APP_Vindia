import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, FileText, Map, Users, Bell, BarChart3 } from "lucide-react";
import "./OfficeAdminModule.css";
const CONFIG={
 employees:{title:"Employees",icon:Users,text:"Employee master data remains owned by HR. Office Administration receives a read-only entry point instead of creating a duplicate employee system."},
 attendance:{title:"Attendance",icon:CalendarDays,text:"Attendance remains an HR-owned record. Office Administration should use the existing attendance service rather than maintaining a second attendance table."},
 documents:{title:"Office Documents",icon:FileText,text:"Use the existing document infrastructure for administrative documents. A separate office document engine is not created here."},
 travel:{title:"Travel & Admin",icon:Map,text:"Travel requests remain in the existing HR travel workflow. This page is an administrative coordination entry point."},
 reports:{title:"Office Reports",icon:BarChart3,text:"Office reports are based on the Office Administration request, facility, supply, visitor and asset APIs."},
 notifications:{title:"Office Notifications",icon:Bell,text:"Notifications use the existing application notification infrastructure; no duplicate notification store is created."},
};
export default function OfficeAdminReferencePage({module}){const c=CONFIG[module]||CONFIG.reports;const Icon=c.icon;return <div className="oam-page"><header className="oam-header"><div><span>Office Administration</span><h1>{c.title}</h1><p>{c.text}</p></div><Link to="/office-administrator/dashboard" className="oam-actions"><ArrowLeft size={15}/> Dashboard</Link></header><section className="oam-card"><div style={{display:"flex",gap:12,alignItems:"flex-start"}}><Icon size={23} color="#0A4174"/><div><h2>Existing system integration</h2><p style={{color:"#64748b",fontSize:13,lineHeight:1.6,marginTop:6}}>{c.text}</p><Link to="/office-administrator/dashboard" className="oam-primary" style={{marginTop:12}}>Back to Office Administration <ArrowRight size={15}/></Link></div></div></section></div>}
