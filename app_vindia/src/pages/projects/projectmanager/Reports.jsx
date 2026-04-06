import { useState, useRef, useEffect } from "react";
import "../../../styles/Reports.css";

// ── Today's date (real) ───────────────────────────────────────
const TODAY = new Date("2026-04-06"); // Monday Apr 6 2026

// ── Generate all project weeks from Jan 5, 2026 ──────────────
function makeWeek(monStr, label) {
  return { startDate: new Date(monStr), short: label };
}

const WEEKS_CONFIG = [
  { id: "W01", ...makeWeek("2026-01-05", "Jan 5–9")    },
  { id: "W02", ...makeWeek("2026-01-12", "Jan 12–16")  },
  { id: "W03", ...makeWeek("2026-01-19", "Jan 19–23")  },
  { id: "W04", ...makeWeek("2026-01-26", "Jan 26–30")  },
  { id: "W05", ...makeWeek("2026-02-02", "Feb 2–6")    },
  { id: "W06", ...makeWeek("2026-02-09", "Feb 9–13")   },
  { id: "W07", ...makeWeek("2026-02-16", "Feb 16–20")  },
  { id: "W08", ...makeWeek("2026-02-23", "Feb 23–27")  },
  { id: "W09", ...makeWeek("2026-03-02", "Mar 2–6")    },
  { id: "W10", ...makeWeek("2026-03-09", "Mar 9–13")   },
  { id: "W11", ...makeWeek("2026-03-16", "Mar 16–20")  },
  { id: "W12", ...makeWeek("2026-03-23", "Mar 23–27")  },
  { id: "W13", ...makeWeek("2026-03-30", "Mar 30–Apr 3") },
  { id: "W14", ...makeWeek("2026-04-06", "Apr 6–10")   }, // current week – unlocked
  { id: "W15", ...makeWeek("2026-04-13", "Apr 13–17")  }, // future – locked
  { id: "W16", ...makeWeek("2026-04-20", "Apr 20–24")  }, // future – locked
];

// Unlocked week IDs (startDate <= TODAY)
const UNLOCKED = WEEKS_CONFIG.filter(w => w.startDate <= TODAY).map(w => w.id);

// Default to latest unlocked week
const DEFAULT_IDX = WEEKS_CONFIG.findIndex(w => w.id === UNLOCKED[UNLOCKED.length - 1]);

// ── Data keyed by week ID ─────────────────────────────────────
// Helper to build project data
const mkProject = (overall, tasks, delayed, phases) => ({ overall, weeklyTasks: tasks, delayedMilestones: delayed, phases });
const ph = (n, pr, st, pl, ac) => ({ name: n, progress: pr, status: st, planned: pl, actual: ac });
const DONE = "done", IP = "inprogress", PND = "pending";

const PROJECT_DATA = {
  W01: mkProject(8,  18, 0, [
    ph("Foundation",    25, IP,  30, 5 ),
    ph("Structure",     0,  PND, 60, 0 ),
    ph("Roofing",       0,  PND, 45, 0 ),
    ph("Interior Walls",0,  PND, 40, 0 ),
    ph("Electrical",    0,  PND, 30, 0 ),
    ph("Plumbing",      0,  PND, 25, 0 ),
    ph("Finishing",     0,  PND, 35, 0 ),
    ph("Landscaping",   0,  PND, 20, 0 ),
  ]),
  W02: mkProject(16, 22, 0, [
    ph("Foundation",    55, IP,  30, 12),
    ph("Structure",     0,  PND, 60, 0 ),
    ph("Roofing",       0,  PND, 45, 0 ),
    ph("Interior Walls",0,  PND, 40, 0 ),
    ph("Electrical",    0,  PND, 30, 0 ),
    ph("Plumbing",      0,  PND, 25, 0 ),
    ph("Finishing",     0,  PND, 35, 0 ),
    ph("Landscaping",   0,  PND, 20, 0 ),
  ]),
  W03: mkProject(22, 20, 0, [
    ph("Foundation",    80, IP,  30, 20),
    ph("Structure",     5,  IP,  60, 2 ),
    ph("Roofing",       0,  PND, 45, 0 ),
    ph("Interior Walls",0,  PND, 40, 0 ),
    ph("Electrical",    0,  PND, 30, 0 ),
    ph("Plumbing",      0,  PND, 25, 0 ),
    ph("Finishing",     0,  PND, 35, 0 ),
    ph("Landscaping",   0,  PND, 20, 0 ),
  ]),
  W04: mkProject(28, 19, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     18,  IP,   60, 8 ),
    ph("Roofing",       0,   PND,  45, 0 ),
    ph("Interior Walls",0,   PND,  40, 0 ),
    ph("Electrical",    0,   PND,  30, 0 ),
    ph("Plumbing",      0,   PND,  25, 0 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  W05: mkProject(34, 17, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     38,  IP,   60, 18),
    ph("Roofing",       0,   PND,  45, 0 ),
    ph("Interior Walls",0,   PND,  40, 0 ),
    ph("Electrical",    0,   PND,  30, 0 ),
    ph("Plumbing",      0,   PND,  25, 0 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  W06: mkProject(39, 16, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     58,  IP,   60, 28),
    ph("Roofing",       0,   PND,  45, 0 ),
    ph("Interior Walls",0,   PND,  40, 0 ),
    ph("Electrical",    0,   PND,  30, 0 ),
    ph("Plumbing",      0,   PND,  25, 0 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  W07: mkProject(44, 14, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     80,  IP,   60, 40),
    ph("Roofing",       5,   IP,   45, 2 ),
    ph("Interior Walls",0,   PND,  40, 0 ),
    ph("Electrical",    0,   PND,  30, 0 ),
    ph("Plumbing",      0,   PND,  25, 0 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  W08: mkProject(50, 15, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       20,  IP,   45, 10),
    ph("Interior Walls",5,   IP,   40, 2 ),
    ph("Electrical",    0,   PND,  30, 0 ),
    ph("Plumbing",      0,   PND,  25, 0 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  W09: mkProject(54, 13, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       32,  IP,   45, 16),
    ph("Interior Walls",12,  IP,   40, 5 ),
    ph("Electrical",    5,   IP,   30, 2 ),
    ph("Plumbing",      2,   IP,   25, 1 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  // Mar 9–13
  W10: mkProject(58, 14, 0, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       45,  IP,   45, 22),
    ph("Interior Walls",20,  IP,   40, 9 ),
    ph("Electrical",    10,  IP,   30, 4 ),
    ph("Plumbing",      5,   IP,   25, 2 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  // Mar 16–20
  W11: mkProject(62, 11, 1, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       60,  IP,   45, 32),
    ph("Interior Walls",35,  IP,   40, 18),
    ph("Electrical",    20,  IP,   30, 9 ),
    ph("Plumbing",      10,  IP,   25, 4 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  // Mar 23–27
  W12: mkProject(65, 13, 1, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       75,  IP,   45, 42),
    ph("Interior Walls",48,  IP,   40, 30),
    ph("Electrical",    28,  IP,   30, 13),
    ph("Plumbing",      15,  IP,   25, 7 ),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  // Mar 30–Apr 3
  W13: mkProject(68, 9, 1, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       85,  IP,   45, 50),
    ph("Interior Walls",60,  IP,   40, 44),
    ph("Electrical",    35,  IP,   30, 18),
    ph("Plumbing",      20,  IP,   25, 10),
    ph("Finishing",     0,   PND,  35, 0 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
  // Apr 6–10 (current)
  W14: mkProject(71, 8, 1, [
    ph("Foundation",    100, DONE, 30, 32),
    ph("Structure",     100, DONE, 60, 58),
    ph("Roofing",       95,  IP,   45, 54),
    ph("Interior Walls",72,  IP,   40, 52),
    ph("Electrical",    45,  IP,   30, 22),
    ph("Plumbing",      30,  IP,   25, 14),
    ph("Finishing",     5,   IP,   35, 2 ),
    ph("Landscaping",   0,   PND,  20, 0 ),
  ]),
};

const PROJECT_MILESTONES = [
  { name: "Site Clearance",      date: "01 Jan 2026", status: "done"    },
  { name: "Foundation Complete", date: "15 Feb 2026", status: "done"    },
  { name: "Structure Complete",  date: "10 Apr 2026", status: "done"    },
  { name: "Roofing Complete",    date: "20 May 2026", status: "delayed" },
  { name: "Interior Done",       date: "15 Jul 2026", status: "pending" },
  { name: "Handover",            date: "30 Sep 2026", status: "pending" },
];

// ── Cost data ─────────────────────────────────────────────────
const mkCost = (budget, spent, cats) => ({ budget, spent, categories: cats });
const cat = (n, b, s) => ({ name: n, budget: b, spent: s });

const COST_DATA = {
  W01: mkCost(87500, 12000, [cat("Materials",35000,9000),cat("Labour",24000,2000),cat("Equipment",15000,1000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W02: mkCost(87500, 28000, [cat("Materials",35000,20000),cat("Labour",24000,5000),cat("Equipment",15000,3000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W03: mkCost(87500, 42000, [cat("Materials",35000,30000),cat("Labour",24000,8000),cat("Equipment",15000,4000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W04: mkCost(87500, 55000, [cat("Materials",35000,38000),cat("Labour",24000,12000),cat("Equipment",15000,5000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W05: mkCost(87500, 64000, [cat("Materials",35000,42000),cat("Labour",24000,16000),cat("Equipment",15000,6000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W06: mkCost(87500, 72000, [cat("Materials",35000,45000),cat("Labour",24000,19000),cat("Equipment",15000,8000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W07: mkCost(87500, 78000, [cat("Materials",35000,48000),cat("Labour",24000,21000),cat("Equipment",15000,9000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W08: mkCost(87500, 83000, [cat("Materials",35000,51000),cat("Labour",24000,22000),cat("Equipment",15000,10000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W09: mkCost(87500, 84000, [cat("Materials",35000,52000),cat("Labour",24000,22500),cat("Equipment",15000,10000),cat("Subcontract",8500,0),cat("Overheads",3500,0),cat("Contingency",1500,0)]),
  W10: mkCost(87500, 85000, [cat("Materials",35000,32000),cat("Labour",24000,25500),cat("Equipment",15000,14200),cat("Subcontract",8500,7800),cat("Overheads",3500,4200),cat("Contingency",1500,1300)]),
  W11: mkCost(87500, 102500,[cat("Materials",35000,40000),cat("Labour",24000,28000),cat("Equipment",15000,18500),cat("Subcontract",8500,9200),cat("Overheads",3500,5800),cat("Contingency",1500,1000)]),
  W12: mkCost(87500, 96250, [cat("Materials",35000,38000),cat("Labour",24000,26000),cat("Equipment",15000,17000),cat("Subcontract",8500,9500),cat("Overheads",3500,4500),cat("Contingency",1500,1250)]),
  W13: mkCost(87500, 45000, [cat("Materials",35000,18000),cat("Labour",24000,14000),cat("Equipment",15000,7000),cat("Subcontract",8500,4000),cat("Overheads",3500,1500),cat("Contingency",1500,500)]),
  W14: mkCost(87500, 58000, [cat("Materials",35000,22000),cat("Labour",24000,18000),cat("Equipment",15000,10000),cat("Subcontract",8500,5000),cat("Overheads",3500,2000),cat("Contingency",1500,1000)]),
};

// ── Timesheet data ────────────────────────────────────────────
const mkTS = (h, eff, workers, emps) => ({ totalHours: h, avgEfficiency: eff, activeWorkers: workers, employees: emps });
const emp = (n, r, h, t, e) => ({ name: n, role: r, hours: h, tasks: t, efficiency: e });

const TIMESHEET_DATA = {
  W01: mkTS(240, 82, 4, [emp("Rajesh Kumar","Site Engineer",60,8,90),emp("Suresh Nair","Manager",50,10,95),emp("Anita Desai","Architect",72,12,88),emp("Priya Sharma","Site Engineer",58,9,76)]),
  W02: mkTS(280, 83, 4, [emp("Rajesh Kumar","Site Engineer",68,9,91),emp("Suresh Nair","Manager",52,11,95),emp("Anita Desai","Architect",74,13,88),emp("Priya Sharma","Site Engineer",60,10,77)]),
  W03: mkTS(310, 84, 5, [emp("Rajesh Kumar","Site Engineer",66,10,92),emp("Priya Sharma","Site Engineer",58,10,82),emp("Anita Desai","Architect",58,9,89),emp("Suresh Nair","Manager",48,12,96),emp("Kavita Rao","Electrician",38,6,80)]),
  W04: mkTS(330, 85, 5, [emp("Rajesh Kumar","Site Engineer",66,11,93),emp("Priya Sharma","Site Engineer",60,10,83),emp("Anita Desai","Architect",60,9,90),emp("Suresh Nair","Manager",50,13,96),emp("Kavita Rao","Electrician",40,7,81)]),
  W05: mkTS(345, 85, 5, [emp("Rajesh Kumar","Site Engineer",64,11,93),emp("Priya Sharma","Site Engineer",62,10,84),emp("Anita Desai","Architect",58,9,90),emp("Suresh Nair","Manager",50,14,96),emp("Kavita Rao","Electrician",40,7,82)]),
  W06: mkTS(358, 86, 5, [emp("Rajesh Kumar","Site Engineer",66,11,93),emp("Priya Sharma","Site Engineer",62,10,85),emp("Anita Desai","Architect",60,9,91),emp("Suresh Nair","Manager",48,14,97),emp("Kavita Rao","Electrician",42,7,82)]),
  W07: mkTS(370, 86, 6, [emp("Rajesh Kumar","Site Engineer",64,11,93),emp("Priya Sharma","Site Engineer",60,10,85),emp("Anita Desai","Architect",58,9,91),emp("Suresh Nair","Manager",48,14,96),emp("Kavita Rao","Electrician",42,7,82),emp("Mohan Das","Plumber",38,6,78)]),
  W08: mkTS(374, 86, 6, [emp("Rajesh Kumar","Site Engineer",62,11,93),emp("Priya Sharma","Site Engineer",58,10,85),emp("Anita Desai","Architect",56,9,91),emp("Suresh Nair","Manager",46,14,96),emp("Kavita Rao","Electrician",40,7,82),emp("Mohan Das","Plumber",38,6,77)]),
  W09: mkTS(376, 86, 6, [emp("Rajesh Kumar","Site Engineer",60,11,93),emp("Priya Sharma","Site Engineer",58,10,86),emp("Anita Desai","Architect",56,9,91),emp("Suresh Nair","Manager",46,14,96),emp("Kavita Rao","Electrician",40,7,82),emp("Mohan Das","Plumber",36,6,77)]),
  W10: mkTS(380, 86, 6, [emp("Rajesh Kumar","Site Engineer",58,12,94),emp("Priya Sharma","Site Engineer",54,10,88),emp("Anita Desai","Architect",48,9,91),emp("Suresh Nair","Manager",44,15,96),emp("Kavita Rao","Electrician",40,7,82),emp("Mohan Das","Plumber",36,6,76)]),
  W11: mkTS(420, 88, 7, [emp("Rajesh Kumar","Site Engineer",62,13,94),emp("Priya Sharma","Site Engineer",58,11,89),emp("Anita Desai","Architect",52,9,91),emp("Suresh Nair","Manager",48,17,96),emp("Kavita Rao","Electrician",44,8,83),emp("Mohan Das","Plumber",38,7,79),emp("Arun Singh","Carpenter",26,5,85)]),
  W12: mkTS(395, 87, 7, [emp("Rajesh Kumar","Site Engineer",60,12,93),emp("Priya Sharma","Site Engineer",56,10,87),emp("Anita Desai","Architect",48,9,91),emp("Suresh Nair","Manager",46,16,96),emp("Kavita Rao","Electrician",42,7,82),emp("Mohan Das","Plumber",38,6,78),emp("Arun Singh","Carpenter",22,4,84)]),
  W13: mkTS(445, 89, 7, [emp("Rajesh Kumar","Site Engineer",68,13,95),emp("Priya Sharma","Site Engineer",62,11,89),emp("Anita Desai","Architect",56,9,92),emp("Suresh Nair","Manager",52,14,97),emp("Kavita Rao","Electrician",46,8,82),emp("Mohan Das","Plumber",38,5,80),emp("Arun Singh","Carpenter",28,5,86)]),
  W14: mkTS(460, 90, 7, [emp("Rajesh Kumar","Site Engineer",70,14,95),emp("Priya Sharma","Site Engineer",64,12,90),emp("Anita Desai","Architect",58,10,93),emp("Suresh Nair","Manager",54,15,97),emp("Kavita Rao","Electrician",48,9,83),emp("Mohan Das","Plumber",40,6,82),emp("Arun Singh","Carpenter",30,6,87)]),
};

// ── Incident data ─────────────────────────────────────────────
const mkInc = (total, open, closed, byP, byS, recent) => ({ total, open, closed, byPriority: byP, byStatus: byS, recent });

const INCIDENT_DATA = {
  W01: mkInc(3, 3, 0, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:0,color:"#22c55e"}],[{label:"Created",count:2},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:0},{label:"Closed",count:0}],[{id:"INC-001",title:"Site access road uneven",priority:"P2",status:"Assigned",age:"2d"},{id:"INC-002",title:"Worker safety brief needed",priority:"P1",status:"Created",age:"1d"},{id:"INC-003",title:"Equipment staging area",priority:"P2",status:"Created",age:"3d"}]),
  W02: mkInc(4, 2, 2, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:1},{label:"Closed",count:1}],[{id:"INC-004",title:"Soil test delay",priority:"P1",status:"Assigned",age:"1d"},{id:"INC-005",title:"Rebar delivery late",priority:"P2",status:"Created",age:"2d"},{id:"INC-006",title:"Concrete mixer fault",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-007",title:"Minor PPE violation",priority:"P3",status:"Closed",age:"4d"}]),
  W03: mkInc(5, 2, 3, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-008",title:"Foundation trench cave-in",priority:"P1",status:"Assigned",age:"6h"},{id:"INC-009",title:"Cement quality issue",priority:"P2",status:"Created",age:"1d"},{id:"INC-010",title:"Survey marker moved",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-011",title:"Night guard absent",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-012",title:"Dust control needed",priority:"P3",status:"Closed",age:"4d"}]),
  W04: mkInc(4, 1, 3, [{label:"P1 Urgent",count:0,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:0},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-013",title:"Shuttering leak",priority:"P2",status:"Assigned",age:"1d"},{id:"INC-014",title:"Waterproofing material short",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-015",title:"Curing blanket missing",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-016",title:"Loader noise complaint",priority:"P3",status:"Closed",age:"5d"}]),
  W05: mkInc(5, 2, 3, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-017",title:"Rebar bending accident",priority:"P1",status:"Assigned",age:"4h"},{id:"INC-018",title:"Column alignment off",priority:"P2",status:"Created",age:"1d"},{id:"INC-019",title:"Concrete pump fault",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-020",title:"Cable trip hazard",priority:"P3",status:"Resolved",age:"3d"},{id:"INC-021",title:"Scaffolding label worn",priority:"P3",status:"Closed",age:"4d"}]),
  W06: mkInc(4, 1, 3, [{label:"P1 Urgent",count:0,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:0},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-022",title:"Beam splice misalignment",priority:"P2",status:"Assigned",age:"1d"},{id:"INC-023",title:"Steel delivery incorrect grade",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-024",title:"Welding sparks — fire risk",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-025",title:"Worker fatigue reported",priority:"P3",status:"Closed",age:"5d"}]),
  W07: mkInc(6, 2, 4, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:3},{label:"Closed",count:1}],[{id:"INC-026",title:"Crane cable fraying",priority:"P1",status:"Assigned",age:"3h"},{id:"INC-027",title:"Slab formwork creak",priority:"P2",status:"Created",age:"1d"},{id:"INC-028",title:"Water seeping into base",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-029",title:"Safety net gap",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-030",title:"Helmet strap broken",priority:"P3",status:"Resolved",age:"4d"},{id:"INC-031",title:"Paint spillage",priority:"P3",status:"Closed",age:"5d"}]),
  W08: mkInc(5, 2, 3, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-032",title:"Roof slab crack",priority:"P1",status:"Assigned",age:"5h"},{id:"INC-033",title:"Plumbing pipe misaligned",priority:"P2",status:"Created",age:"1d"},{id:"INC-034",title:"Electric earthing fault",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-035",title:"Concrete over-pour",priority:"P2",status:"Resolved",age:"3d"},{id:"INC-036",title:"Dusty work area",priority:"P3",status:"Closed",age:"4d"}]),
  W09: mkInc(5, 2, 3, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-037",title:"Roofing sheet gap",priority:"P1",status:"Assigned",age:"4h"},{id:"INC-038",title:"Interior wall crack",priority:"P2",status:"Created",age:"1d"},{id:"INC-039",title:"Tile batch mismatch",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-040",title:"Wiring exposed — Zone A",priority:"P3",status:"Resolved",age:"3d"},{id:"INC-041",title:"Scaffold board loose",priority:"P3",status:"Closed",age:"4d"}]),
  W10: mkInc(8, 4, 4, [{label:"P1 Urgent",count:2,color:"#ef4444"},{label:"P2 Medium",count:4,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:2},{label:"Assigned",count:1},{label:"In Progress",count:1},{label:"Resolved",count:2},{label:"Closed",count:2}],[{id:"INC-042",title:"Water leakage in Block B",priority:"P1",status:"In Progress",age:"3h"},{id:"INC-043",title:"Electrical wiring exposed",priority:"P1",status:"Assigned",age:"5h"},{id:"INC-044",title:"Design revision — staircase",priority:"P2",status:"Created",age:"1d"},{id:"INC-045",title:"Material delivery delay",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-046",title:"Scaffolding loose bolt",priority:"P2",status:"Closed",age:"3d"}]),
  W11: mkInc(6, 2, 4, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:3,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:0},{label:"Assigned",count:0},{label:"In Progress",count:2},{label:"Resolved",count:1},{label:"Closed",count:3}],[{id:"INC-047",title:"Crack in Block A wall",priority:"P1",status:"In Progress",age:"1d"},{id:"INC-048",title:"Drainage blockage",priority:"P2",status:"In Progress",age:"1d"},{id:"INC-049",title:"Safety net repair",priority:"P2",status:"Closed",age:"3d"},{id:"INC-050",title:"Fire exit obstructed",priority:"P2",status:"Closed",age:"4d"},{id:"INC-051",title:"Paint peeling 3rd floor",priority:"P3",status:"Resolved",age:"2d"}]),
  W12: mkInc(5, 2, 3, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:2,color:"#22c55e"}],[{label:"Created",count:0},{label:"Assigned",count:1},{label:"In Progress",count:1},{label:"Resolved",count:2},{label:"Closed",count:1}],[{id:"INC-052",title:"Concrete mix quality issue",priority:"P1",status:"In Progress",age:"6h"},{id:"INC-053",title:"Worker safety gear missing",priority:"P2",status:"Assigned",age:"1d"},{id:"INC-054",title:"Wiring short circuit Block C",priority:"P2",status:"Resolved",age:"2d"},{id:"INC-055",title:"Painting quality lobby",priority:"P3",status:"Closed",age:"3d"},{id:"INC-056",title:"Door frame misaligned",priority:"P3",status:"Resolved",age:"4d"}]),
  W13: mkInc(5, 3, 2, [{label:"P1 Urgent",count:2,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:2},{label:"Assigned",count:0},{label:"In Progress",count:1},{label:"Resolved",count:2},{label:"Closed",count:0}],[{id:"INC-057",title:"Water leakage — roof slab",priority:"P1",status:"In Progress",age:"2h"},{id:"INC-058",title:"Equipment breakdown — crane",priority:"P1",status:"Created",age:"4h"},{id:"INC-059",title:"Tile crack in staircase",priority:"P2",status:"Created",age:"6h"},{id:"INC-060",title:"Painting overspray Block D",priority:"P3",status:"Resolved",age:"2d"},{id:"INC-061",title:"Minor plumbing leak",priority:"P2",status:"Resolved",age:"3d"}]),
  W14: mkInc(4, 2, 2, [{label:"P1 Urgent",count:1,color:"#ef4444"},{label:"P2 Medium",count:2,color:"#f59e0b"},{label:"P3 Low",count:1,color:"#22c55e"}],[{label:"Created",count:1},{label:"Assigned",count:1},{label:"In Progress",count:0},{label:"Resolved",count:1},{label:"Closed",count:1}],[{id:"INC-062",title:"Roofing overhang crack",priority:"P1",status:"Assigned",age:"3h"},{id:"INC-063",title:"Electrical panel sparking",priority:"P2",status:"Created",age:"5h"},{id:"INC-064",title:"Plumbing joint leak",priority:"P2",status:"Resolved",age:"1d"},{id:"INC-065",title:"Flooring tile chip",priority:"P3",status:"Closed",age:"2d"}]),
};

// ── Timesheet trend for chart (all unlocked weeks) ────────────
function getTSTrend(currentId) {
  const idx = WEEKS_CONFIG.findIndex(w => w.id === currentId);
  const start = Math.max(0, idx - 3);
  return WEEKS_CONFIG.slice(start, idx + 1)
    .filter(w => TIMESHEET_DATA[w.id])
    .map(w => ({ week: w.id, hours: TIMESHEET_DATA[w.id].totalHours, label: w.short.split("–")[0] }));
}

// ── Helpers ───────────────────────────────────────────────────
const fmt = (n) => n >= 1000000 ? `₹${(n/1000000).toFixed(2)}M` : `₹${(n/1000).toFixed(0)}K`;
const pct = (a, b) => b ? Math.round((a / b) * 100) : 0;
const getDelta = (curr, prev, higherIsBetter = true) => {
  if (prev == null) return null;
  const diff = curr - prev;
  if (diff === 0) return { val: 0, dir: "flat" };
  return { val: Math.abs(diff), dir: (higherIsBetter ? diff > 0 : diff < 0) ? "up" : "down" };
};

function DeltaBadge({ delta, suffix = "" }) {
  if (!delta || delta.dir === "flat") return null;
  return (
    <span className={`rpt-delta rpt-delta-${delta.dir}`}>
      {delta.dir === "up" ? "▲" : "▼"} {delta.val}{suffix}
    </span>
  );
}

function Bar({ value, max = 100, color = "var(--primary-blue)", height = 6 }) {
  const w = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="rpt-bar-track" style={{ height }}>
      <div className="rpt-bar-fill" style={{ width: `${w}%`, background: color, height }} />
    </div>
  );
}

function EfficiencyCell({ value }) {
  const isHigh = value >= 90, isMid = value >= 80;
  const fill  = isHigh ? "#22c55e" : isMid ? "#f59e0b" : "#ef4444";
  const bg    = isHigh ? "#dcfce7" : isMid ? "#fef3c7" : "#fee2e2";
  const color = isHigh ? "#15803d" : isMid ? "#b45309" : "#dc2626";
  return (
    <div className="rpt-eff-cell">
      <div className="rpt-eff-bar-wrap">
        <div className="rpt-eff-track">
          <div className="rpt-eff-fill" style={{ width: `${value}%`, background: fill }} />
        </div>
      </div>
      <span className="rpt-eff-pill" style={{ background: bg, color }}>{value}%</span>
    </div>
  );
}

// ── Bar Chart — absolute-positioned bars (always flush bottom) ─
function BarChart({ data, valueKey, labelKey, activeKey = null }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="rpt-chart">
      {data.map((d, i) => {
        const isActive = d[labelKey] === activeKey || (activeKey === null && i === data.length - 1);
        const heightPct = Math.round((d[valueKey] / max) * 100);
        return (
          <div key={i} className={`rpt-chart-col${isActive ? " rpt-chart-col-active" : ""}`}
            style={{ opacity: activeKey && !isActive ? 0.35 : 1 }}>
            <span className="rpt-chart-val">{d[valueKey]}</span>
            <div className="rpt-chart-bar-wrap">
              <div className="rpt-chart-bar"
                style={{ height: `${heightPct}%`, background: isActive ? "var(--primary-blue)" : "#c7d9ef" }} />
            </div>
            <span className="rpt-chart-label">{d[labelKey] || d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Dual Bar Chart ────────────────────────────────────────────
function DualBarChart({ data, activeIndex = -1 }) {
  const max = Math.max(...data.flatMap(d => [d.budget, d.spent]), 1);
  return (
    <div className="rpt-chart rpt-dual-chart">
      {data.map((d, i) => {
        const isActive = i === activeIndex;
        return (
          <div key={i} className={`rpt-chart-col${isActive ? " rpt-chart-col-active" : ""}`}
            style={{ opacity: activeIndex >= 0 && !isActive ? 0.35 : 1 }}>
            <div className="rpt-chart-bar-wrap rpt-dual-wrap">
              <div className="rpt-dual-bar-pair">
                <div className="rpt-dual-bar rpt-bar-budget"
                  style={{ height: `${Math.round((d.budget / max) * 100)}%` }} />
                <div className={`rpt-dual-bar rpt-bar-spent${d.spent > d.budget ? " rpt-bar-over" : ""}`}
                  style={{ height: `${Math.round((d.spent / max) * 100)}%` }} />
              </div>
            </div>
            <span className="rpt-chart-label">{d.week}</span>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ value, max = 100, size = 80, stroke = 10, color = "var(--primary-blue)" }) {
  const r = (size - stroke) / 2, circ = 2 * Math.PI * r, p = Math.min(value / max, 1);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e6e8ec" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${circ*p} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={size*0.18} fontWeight="700" fill={color}>{Math.round(p*100)}%</text>
    </svg>
  );
}

function exportCSV(filename, rows) {
  const csv = rows.map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = filename; a.click();
}
function exportPDF(name, label) {
  const w = window.open("","_blank");
  w.document.write(`<html><head><title>${name}</title><style>body{font-family:'Segoe UI',sans-serif;padding:32px;color:#1a1a2e}h1{color:#1e5a96;font-size:22px}p{color:#7a7a8a;font-size:12px}table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1e5a96;color:white;padding:8px 12px}td{padding:8px 12px;border-bottom:1px solid #e6e8ec}</style></head><body><h1>${name}</h1><p>${new Date().toLocaleString()} | Greenfield Towers — ${label}</p></body></html>`);
  w.document.close(); w.print();
}

// ── Inline Week Selector ──────────────────────────────────────
function WeekSelector({ weekIndex, setWeekIndex }) {
  const trackRef = useRef(null);

  useEffect(() => {
    const el = trackRef.current?.querySelector(".rpt-wc-chip-active");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [weekIndex]);

  const canPrev = weekIndex > 0;
  const canNext = weekIndex < WEEKS_CONFIG.findIndex(w => w.startDate > TODAY) - 1 + 1;

  return (
    <div className="rpt-wc">
      <button className="rpt-wc-arrow" onClick={() => canPrev && setWeekIndex(i => i - 1)} disabled={!canPrev}>‹</button>
      <div className="rpt-wc-track" ref={trackRef}>
        {WEEKS_CONFIG.map((w, i) => {
          const isFuture = w.startDate > TODAY;
          const isActive = weekIndex === i && !isFuture;
          return (
            <button key={w.id}
              className={`rpt-wc-chip${isActive ? " rpt-wc-chip-active" : ""}${isFuture ? " rpt-wc-chip-locked" : ""}`}
              onClick={() => !isFuture && setWeekIndex(i)}
              disabled={isFuture}
              title={isFuture ? "Not yet available" : w.id}>
              {isFuture
                ? <><span className="rpt-wc-lock">🔒</span><span className="rpt-wc-id">{w.id}</span></>
                : <><span className="rpt-wc-id">{w.id}</span><span className="rpt-wc-dates">{w.short}</span></>
              }
            </button>
          );
        })}
      </div>
      <button className="rpt-wc-arrow" onClick={() => setWeekIndex(i => Math.min(i + 1, WEEKS_CONFIG.length - 1))}
        disabled={weekIndex >= WEEKS_CONFIG.findIndex(w => w.startDate > TODAY) - 1}>›</button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function Reports() {
  const [activeReport, setActiveReport] = useState("project");
  const [weekIndex, setWeekIndex] = useState(DEFAULT_IDX);

  const wCfg     = WEEKS_CONFIG[weekIndex];
  const wId      = wCfg.id;
  const prevId   = weekIndex > 0 ? WEEKS_CONFIG[weekIndex - 1].id : null;
  const weekLabel = `${wCfg.id} — ${wCfg.short}`;

  const projNow  = PROJECT_DATA[wId]   || PROJECT_DATA["W14"];
  const projPrev = prevId ? PROJECT_DATA[prevId] : null;
  const costNow  = COST_DATA[wId]      || COST_DATA["W14"];
  const costPrev = prevId ? COST_DATA[prevId] : null;
  const tsNow    = TIMESHEET_DATA[wId] || TIMESHEET_DATA["W14"];
  const tsPrev   = prevId ? TIMESHEET_DATA[prevId] : null;
  const incNow   = INCIDENT_DATA[wId]  || INCIDENT_DATA["W14"];
  const incPrev  = prevId ? INCIDENT_DATA[prevId] : null;

  const tsTrend = getTSTrend(wId);

  const projDelta  = getDelta(projNow.overall,     projPrev?.overall);
  const costDelta  = getDelta(costNow.spent,        costPrev?.spent, false);
  const tsDeltaH   = getDelta(tsNow.totalHours,    tsPrev?.totalHours);
  const tsDeltaE   = getDelta(tsNow.avgEfficiency,  tsPrev?.avgEfficiency);
  const tsDeltaW   = getDelta(tsNow.activeWorkers,  tsPrev?.activeWorkers);
  const incDeltaT  = getDelta(incNow.total,         incPrev?.total, false);
  const incDeltaO  = getDelta(incNow.open,          incPrev?.open,  false);

  const COST_TREND_DATA = [
    { week: "W10", budget: 87500, spent: COST_DATA.W10.spent },
    { week: "W11", budget: 87500, spent: COST_DATA.W11.spent },
    { week: "W12", budget: 87500, spent: COST_DATA.W12.spent },
    { week: "W13", budget: 87500, spent: COST_DATA.W13.spent },
    ...(wId === "W14" ? [{ week: "W14", budget: 87500, spent: COST_DATA.W14.spent }] : []),
  ];
  const costTrendActiveIdx = COST_TREND_DATA.findIndex(d => d.week === wId);

  const REPORTS = [
    { id: "project",   label: "Project Report",  icon: "📈" },
    { id: "cost",      label: "Cost Report",      icon: "💰" },
    { id: "timesheet", label: "Timesheet Report", icon: "⏱" },
    { id: "incident",  label: "Incident Report",  icon: "🚨" },
  ];

  const handleExcelExport = () => {
    if (activeReport === "project") {
      exportCSV(`project_${wId}.csv`,[["Phase","Progress %","Planned","Actual","Status"],...projNow.phases.map(p=>[p.name,p.progress,p.planned,p.actual,p.status])]);
    } else if (activeReport === "cost") {
      exportCSV(`cost_${wId}.csv`,[["Category","Budget","Spent","Remaining","Usage %"],...costNow.categories.map(c=>[c.name,c.budget,c.spent,c.budget-c.spent,pct(c.spent,c.budget)])]);
    } else if (activeReport === "timesheet") {
      exportCSV(`timesheet_${wId}.csv`,[["Employee","Role","Hours","Tasks","Efficiency %"],...tsNow.employees.map(e=>[e.name,e.role,e.hours,e.tasks,e.efficiency])]);
    } else {
      exportCSV(`incidents_${wId}.csv`,[["ID","Title","Priority","Status","Age"],...incNow.recent.map(i=>[i.id,i.title,i.priority,i.status,i.age])]);
    }
  };

  return (
    <div className="rpt-page">
      {/* Header */}
      <div className="rpt-header">
        <div className="rpt-header-title">
          <h1>Reports</h1>
          <p>Weekly project analytics — Greenfield Towers</p>
        </div>
        <WeekSelector weekIndex={weekIndex} setWeekIndex={setWeekIndex} />
        <div className="rpt-export-group">
          <button className="rpt-export-btn rpt-excel" onClick={handleExcelExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/>
            </svg>
            Export Excel
          </button>
          <button className="rpt-export-btn rpt-pdf" onClick={() => { const r=REPORTS.find(r=>r.id===activeReport); exportPDF(r.label, weekLabel); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rpt-tabs">
        {REPORTS.map(r => (
          <button key={r.id} className={`rpt-tab${activeReport===r.id?" rpt-tab-active":""}`} onClick={() => setActiveReport(r.id)}>
            <span className="rpt-tab-icon">{r.icon}</span>{r.label}
          </button>
        ))}
      </div>

      {/* ══ PROJECT ══ */}
      {activeReport === "project" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={projNow.overall} color="#1e5a96" size={72} />
              <div>
                <span className="rpt-kpi-label">Overall Progress</span>
                <span className="rpt-kpi-val">{projNow.overall}%</span>
                <DeltaBadge delta={projDelta} suffix="%" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Phases Complete</span>
                <span className="rpt-kpi-val">{projNow.phases.filter(p=>p.status==="done").length} / {projNow.phases.length}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Delayed Milestones</span>
                <span className="rpt-kpi-val">{projNow.delayedMilestones}</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Tasks This Week</span>
                <span className="rpt-kpi-val">{projNow.weeklyTasks}</span>
              </div>
            </div>
          </div>

          <div className="rpt-trend-strip">
            <span className="rpt-trend-label">Progress Trend</span>
            <div className="rpt-sparkline">
              {WEEKS_CONFIG.filter(w => w.startDate <= TODAY && PROJECT_DATA[w.id]).map((w, i) => {
                const val = PROJECT_DATA[w.id].overall;
                const isAct = w.id === wId;
                return (
                  <div key={w.id} className={`rpt-spark-col${isAct?" spark-active":""}`}>
                    <span className="rpt-spark-val">{val}%</span>
                    <div className="rpt-spark-bar-wrap">
                      <div className="rpt-spark-bar" style={{ height: `${val}%`, background: isAct ? "var(--primary-blue)" : "#c7d9ef" }} />
                    </div>
                    <span className="rpt-spark-week">{w.id}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Phase Progress</h3><span className="rpt-card-sub">Planned vs Actual days</span></div>
              <div className="rpt-phase-list">
                {projNow.phases.map((p, i) => (
                  <div key={i} className="rpt-phase-row">
                    <div className="rpt-phase-info">
                      <span className="rpt-phase-name">{p.name}</span>
                      <div className="rpt-phase-days">
                        <span className="rpt-days-planned">Plan: {p.planned}d</span>
                        {p.actual > 0 && (
                          <span className={`rpt-days-actual ${p.actual > p.planned ? "over" : "under"}`}>
                            Act: {p.actual}d {p.actual > p.planned ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rpt-phase-bar-area">
                      <Bar value={p.progress} color={p.status==="done"?"#22c55e":p.status==="inprogress"?"#1e5a96":"#e6e8ec"} />
                      <span className="rpt-phase-pct">{p.progress}%</span>
                    </div>
                    <span className={`rpt-phase-status rpt-ps-${p.status}`}>
                      {p.status==="done"?"✔ Done":p.status==="inprogress"?"◐ Active":"○ Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Milestones</h3><span className="rpt-card-sub">Key project dates</span></div>
              <div className="rpt-milestone-list">
                {PROJECT_MILESTONES.map((m, i) => (
                  <div key={i} className="rpt-milestone-row">
                    <div className={`rpt-ms-dot rpt-ms-${m.status}`}>{m.status==="done"?"✔":m.status==="delayed"?"!":"○"}</div>
                    <div className="rpt-ms-info">
                      <span className="rpt-ms-name">{m.name}</span>
                      <span className="rpt-ms-date">{m.date}</span>
                    </div>
                    <span className={`rpt-ms-badge rpt-ms-${m.status}`}>
                      {m.status==="done"?"Complete":m.status==="delayed"?"Delayed":"Upcoming"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ COST ══ */}
      {activeReport === "cost" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={pct(costNow.spent,costNow.budget)} color={costNow.spent>costNow.budget?"#ef4444":"#1e5a96"} size={72} />
              <div>
                <span className="rpt-kpi-label">Budget Used</span>
                <span className="rpt-kpi-val">{pct(costNow.spent,costNow.budget)}%</span>
                {costNow.spent>costNow.budget && <span className="rpt-over-badge">Over Budget</span>}
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">₹</div>
              <div><span className="rpt-kpi-label">Weekly Budget</span><span className="rpt-kpi-val">{fmt(costNow.budget)}</span></div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costNow.spent>costNow.budget?"kpi-red":"kpi-amber"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Weekly Spent</span>
                <span className="rpt-kpi-val">{fmt(costNow.spent)}</span>
                <DeltaBadge delta={costDelta} suffix="K" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className={`rpt-kpi-icon ${costNow.budget-costNow.spent<0?"kpi-red":"kpi-green"}`}>₹</div>
              <div>
                <span className="rpt-kpi-label">Remaining</span>
                <span className="rpt-kpi-val">{fmt(Math.abs(costNow.budget-costNow.spent))}</span>
                {costNow.spent>costNow.budget && <span className="rpt-over-badge">Overspent</span>}
              </div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Budget vs Spent</h3>
                <div className="rpt-legend">
                  <span className="rpt-legend-dot" style={{background:"#c7d9ef"}} /> Budget
                  <span className="rpt-legend-dot" style={{background:"#1e5a96"}} /> Spent
                </div>
              </div>
              <div className="rpt-cost-list">
                {costNow.categories.map((c, i) => {
                  const up = pct(c.spent,c.budget), over = c.spent>c.budget;
                  return (
                    <div key={i} className="rpt-cost-row">
                      <span className="rpt-cost-name">{c.name}</span>
                      <div className="rpt-cost-bars">
                        <div className="rpt-cost-bar-track">
                          <div className="rpt-cost-bar-budget" style={{width:"100%"}} />
                          <div className={`rpt-cost-bar-spent${over?" over-budget":""}`} style={{width:`${Math.min(up,100)}%`}} />
                        </div>
                        <span className={`rpt-cost-pct${over?" text-red":""}`}>{up}%</span>
                      </div>
                      <div className="rpt-cost-amounts">
                        <span className="rpt-cost-spent">{fmt(c.spent)}</span>
                        <span className="rpt-cost-budget">/ {fmt(c.budget)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Weekly Spend Trend</h3>
                <div className="rpt-legend">
                  <span className="rpt-legend-dot" style={{background:"#c7d9ef"}} /> Budget
                  <span className="rpt-legend-dot" style={{background:"#1e5a96"}} /> Spent
                </div>
              </div>
              <DualBarChart data={COST_TREND_DATA} activeIndex={costTrendActiveIdx} />
            </div>
          </div>
        </div>
      )}

      {/* ══ TIMESHEET ══ */}
      {activeReport === "timesheet" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Week Hours</span>
                <span className="rpt-kpi-val">{tsNow.totalHours}</span>
                <DeltaBadge delta={tsDeltaH} suffix="h" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Active Workers</span>
                <span className="rpt-kpi-val">{tsNow.activeWorkers}</span>
                <DeltaBadge delta={tsDeltaW} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Avg Efficiency</span>
                <span className="rpt-kpi-val">{tsNow.avgEfficiency}%</span>
                <DeltaBadge delta={tsDeltaE} suffix="%" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Tasks</span>
                <span className="rpt-kpi-val">{tsNow.employees.reduce((s,e)=>s+e.tasks,0)}</span>
              </div>
            </div>
          </div>

          <div className="rpt-ts-grid">
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Employee Productivity</h3>
                <span className="rpt-card-sub">{weekLabel} — hours &amp; efficiency</span>
              </div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead><tr><th>Employee</th><th>Role</th><th>Hours</th><th>Tasks</th><th>Efficiency</th></tr></thead>
                  <tbody>
                    {tsNow.employees.map((e, i) => (
                      <tr key={i}>
                        <td><div className="rpt-emp-cell"><div className="rpt-emp-avatar">{e.name.charAt(0)}</div>{e.name}</div></td>
                        <td><span className="rpt-role-badge">{e.role}</span></td>
                        <td><strong>{e.hours}h</strong></td>
                        <td>{e.tasks}</td>
                        <td><EfficiencyCell value={e.efficiency} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header">
                <h3>Weekly Hours Trend</h3>
                <span className="rpt-card-sub">Recent weeks comparison</span>
              </div>
              <BarChart data={tsTrend} valueKey="hours" labelKey="week" activeKey={wId} />
            </div>
          </div>
        </div>
      )}

      {/* ══ INCIDENT ══ */}
      {activeReport === "incident" && (
        <div className="rpt-content">
          <div className="rpt-kpi-row">
            <div className="rpt-kpi-card">
              <Donut value={incNow.total>0?pct(incNow.closed,incNow.total):100} color="#22c55e" size={72} />
              <div>
                <span className="rpt-kpi-label">Resolution Rate</span>
                <span className="rpt-kpi-val">{incNow.total>0?pct(incNow.closed,incNow.total):100}%</span>
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-blue">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Total Incidents</span>
                <span className="rpt-kpi-val">{incNow.total}</span>
                <DeltaBadge delta={incDeltaT} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-amber">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <span className="rpt-kpi-label">Open</span>
                <span className="rpt-kpi-val">{incNow.open}</span>
                <DeltaBadge delta={incDeltaO} suffix="" />
              </div>
            </div>
            <div className="rpt-kpi-card">
              <div className="rpt-kpi-icon kpi-green">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div><span className="rpt-kpi-label">Closed</span><span className="rpt-kpi-val">{incNow.closed}</span></div>
            </div>
          </div>
          <div className="rpt-grid-2">
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>By Priority</h3><span className="rpt-card-sub">Incident distribution</span></div>
              <div className="rpt-inc-priority-list">
                {incNow.byPriority.map((p, i) => (
                  <div key={i} className="rpt-inc-p-row">
                    <div className="rpt-inc-p-info">
                      <span className="rpt-inc-p-dot" style={{background:p.color}} />
                      <span className="rpt-inc-p-label">{p.label}</span>
                    </div>
                    <Bar value={p.count} max={incNow.total||1} color={p.color} />
                    <span className="rpt-inc-p-count">{p.count}</span>
                  </div>
                ))}
              </div>
              <div className="rpt-card-header" style={{marginTop:20}}><h3>By Status</h3></div>
              <div className="rpt-inc-status-list">
                {incNow.byStatus.map((s, i) => (
                  <div key={i} className="rpt-inc-s-row">
                    <span className="rpt-inc-s-label">{s.label}</span>
                    <div className="rpt-inc-s-bar"><div className="rpt-inc-s-fill" style={{width:`${pct(s.count,incNow.total||1)}%`}} /></div>
                    <span className="rpt-inc-s-count">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rpt-card">
              <div className="rpt-card-header"><h3>Incidents This Week</h3><span className="rpt-card-sub">{weekLabel}</span></div>
              <div className="rpt-table-wrap">
                <table className="rpt-table">
                  <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Age</th></tr></thead>
                  <tbody>
                    {incNow.recent.map((inc, i) => (
                      <tr key={i}>
                        <td><code className="rpt-inc-id">{inc.id}</code></td>
                        <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.title}</td>
                        <td><span className={`rpt-p-badge rpt-p-${inc.priority.toLowerCase()}`}>{inc.priority}</span></td>
                        <td><span className={`rpt-s-badge rpt-s-${inc.status.toLowerCase().replace(/ /g,"-")}`}>{inc.status}</span></td>
                        <td className="rpt-age">{inc.age}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="rpt-open-closed">
                <div className="rpt-oc-bar">
                  <div className="rpt-oc-open"   style={{width:`${pct(incNow.open,   incNow.total||1)}%`}} />
                  <div className="rpt-oc-closed"  style={{width:`${pct(incNow.closed, incNow.total||1)}%`}} />
                </div>
                <div className="rpt-oc-legend">
                  <span><span className="rpt-oc-dot open" /> Open ({incNow.open})</span>
                  <span><span className="rpt-oc-dot closed" /> Closed ({incNow.closed})</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}