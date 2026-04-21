import { useState, useRef } from "react";

/* ══════════════════════════════════════════════════════
   ARCHITECT TASK PAGE — Full ERP Module
   Palette: #001D39 · #0A4174 · #49769F · #4E8EA2
            #6EA2B3 · #7BBDE8 · #BDD8E9 · #f0f5f9
══════════════════════════════════════════════════════ */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:opsz,wght@9..144,300;9..144,600;9..144,700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --navy:#001D39;--b1:#0A4174;--b2:#49769F;--b3:#4E8EA2;
  --b4:#6EA2B3;--b5:#7BBDE8;--b6:#BDD8E9;--bg:#f0f5f9;
  --white:#fff;--border:#d0e4f0;--border2:#c0d8ec;
  --danger:#c0392b;--warn:#e6a817;--ok:#1c5e35;
  --fd:'Fraunces',serif;--fm:'DM Mono',monospace;--r:12px;
}
/* ── Base ── (NORMAL FONTS) */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: var(--bg);
  color: var(--navy);
  font-size: 13px;
  line-height: 1.55;
}

.tp{background:var(--white);border-bottom:1px solid var(--border);padding:0 32px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:30}
.tp-crumb{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--b4)}
.tp-crumb b{color:var(--navy);font-weight:600}
.tp-right{display:flex;align-items:center;gap:8px}
.proj-pill{font-size:11px;font-weight:600;background:var(--b6);color:var(--b1);border:1px solid var(--b5);border-radius:20px;padding:4px 13px}

.ph{padding:24px 32px 0;display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:20px}
.ph-title{font-family:var(--fd);font-size:30px;font-weight:700;color:var(--navy);letter-spacing:-.5px}
.ph-sub{font-size:12px;color:var(--b4);margin-top:3px}
.ph-right{display:flex;gap:8px}

.btn{font-family:var(--fm);font-size:12px;font-weight:500;border-radius:8px;padding:8px 15px;border:none;cursor:pointer;transition:all .17s;display:inline-flex;align-items:center;gap:6px}
.btn:active{transform:scale(.97)}
.btn-p{background:linear-gradient(135deg,var(--b1),var(--navy));color:#fff;box-shadow:0 4px 14px rgba(10,65,116,.2)}
.btn-p:hover{box-shadow:0 6px 20px rgba(10,65,116,.3);transform:translateY(-1px)}
.btn-s{background:var(--white);color:var(--b1);border:1px solid var(--border2)}
.btn-s:hover{background:var(--bg);border-color:var(--b5)}
.btn-g{background:none;color:var(--b4);border:1px solid var(--border)}
.btn-g:hover{background:var(--bg);color:var(--b1);border-color:var(--b5)}
.btn-d{background:#fdecea;color:var(--danger);border:1px solid #f5c6c1}
.btn-d:hover{background:#fbd5d1}
.btn-sm{padding:5px 10px;font-size:11px;border-radius:6px}

.tabs{padding:0 32px;display:flex;gap:2px;border-bottom:1px solid var(--border);background:var(--white);overflow-x:auto}
.tab{font-family:var(--fm);font-size:12px;font-weight:500;padding:13px 16px;border:none;background:none;color:var(--b4);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s;margin-bottom:-1px;white-space:nowrap;display:flex;align-items:center;gap:6px}
.tab:hover{color:var(--b1)}
.tab.on{color:var(--b1);border-bottom-color:var(--b1)}
.tc{font-size:10px;background:var(--bg);color:var(--b2);border:1px solid var(--border);border-radius:10px;padding:1px 6px}
.tab.on .tc{background:var(--b6);border-color:var(--b5);color:var(--b1)}

.body{padding:0 32px 60px}

.kpi-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:13px;margin:20px 0}
.kc{background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:16px 18px;transition:box-shadow .2s,transform .2s}
.kc:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,29,57,.08)}
.kc-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--b4);margin-bottom:5px}
.kc-val{font-family:var(--fd);font-size:26px;font-weight:700;color:var(--navy);line-height:1}
.kc-val.red{color:var(--danger)}
.kc-val.amber{color:var(--warn)}
.kc-val.green{color:var(--ok)}
.kc-meta{font-size:11px;color:var(--b4);margin-top:4px}
.kc-bar{height:3px;border-radius:2px;background:var(--border);margin-top:10px;overflow:hidden}
.kc-fill{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--b3),var(--b5));transition:width .6s}

.fbar{display:flex;align-items:center;gap:9px;margin-bottom:16px;flex-wrap:wrap}
.fsearch{flex:1;min-width:200px;max-width:280px;background:var(--white);border:1px solid var(--border2);border-radius:8px;padding:8px 13px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;transition:border-color .15s}
.fsearch:focus{border-color:var(--b5);box-shadow:0 0 0 3px rgba(123,189,232,.12)}
.fsearch::placeholder{color:var(--b4)}
.fsel{background:var(--white);border:1px solid var(--border2);border-radius:8px;padding:8px 11px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;cursor:pointer}
.chip{font-size:11px;font-weight:600;padding:5px 11px;border-radius:20px;border:1px solid var(--border);background:var(--white);color:var(--b4);cursor:pointer;transition:all .14s}
.chip:hover,.chip.on{background:var(--b1);color:#fff;border-color:var(--b1)}
.fcount{margin-left:auto;font-size:11px;color:var(--b4)}

.ttw{background:var(--white);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:20px}
.tt{width:100%;border-collapse:collapse}
.tt thead tr{background:var(--bg);border-bottom:1px solid var(--border)}
.tt th{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--b4);padding:11px 14px;text-align:left;white-space:nowrap;cursor:pointer;user-select:none}
.tt th:hover{color:var(--b1)}
.tt td{padding:12px 14px;border-bottom:1px solid #f0f7fc;vertical-align:middle}
.tt tbody tr{transition:background .12s;cursor:pointer}
.tt tbody tr:hover{background:rgba(123,189,232,.05)}
.tt tbody tr:last-child td{border-bottom:none}

.sb{font-size:10px;font-weight:600;padding:3px 9px;border-radius:6px;white-space:nowrap}
.s-todo    {background:#f4f6f9;color:#49769F;border:1px solid #d0e4f0}
.s-inprog  {background:#e6f0fa;color:#0A4174;border:1px solid #7BBDE8}
.s-review  {background:#fef9ec;color:#7a5200;border:1px solid #f5e0a0}
.s-done    {background:#eaf4ee;color:#1c5e35;border:1px solid #a8d9b8}
.s-over    {background:#fdecea;color:#9b2219;border:1px solid #f5c6c1}
.s-blocked {background:#fff3e0;color:#8a4500;border:1px solid #ffcc80}
.s-hold    {background:#f4f0fa;color:#4a3b8c;border:1px solid #c5b8e8}
.s-pend    {background:#fef9ec;color:#7a5200;border:1px solid #f5e0a0}
.s-appr    {background:#eaf4ee;color:#1c5e35;border:1px solid #a8d9b8}
.s-rej     {background:#fdecea;color:#9b2219;border:1px solid #f5c6c1}
.s-nr      {background:#f4f6f9;color:#49769F;border:1px solid #d0e4f0}

.pdot{width:8px;height:8px;border-radius:50%;display:inline-block;flex-shrink:0}
.pu{background:var(--danger)}.ph2{background:var(--warn)}.pm{background:var(--b3)}.pl{background:#a0aec0}

.t-id{font-family:var(--fm);font-size:11px;color:var(--b1);font-weight:600}
.t-name{font-size:13px;font-weight:500;color:var(--navy)}
.t-name.done{text-decoration:line-through;color:var(--b4)}
.t-sub{font-size:11px;color:var(--b4);margin-top:2px}
.avp{display:inline-flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:20px;padding:3px 9px 3px 4px;font-size:11px;color:var(--b1)}
.av{width:20px;height:20px;border-radius:50%;background:var(--b6);color:var(--b1);font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.pw{width:70px}
.pb{height:5px;border-radius:3px;background:var(--border);overflow:hidden}
.pf{height:100%;border-radius:3px;background:linear-gradient(90deg,var(--b3),var(--b5))}
.pl2{font-size:10px;color:var(--b4);margin-top:2px;text-align:right}
.dok{color:var(--b2);font-size:12px;font-weight:500}
.dsoon{color:var(--warn);font-size:12px;font-weight:600}
.dover{color:var(--danger);font-size:12px;font-weight:700}
.ltag{font-size:10px;display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:5px;border:1px solid var(--border);color:var(--b2);background:var(--bg);cursor:pointer;transition:all .13s;white-space:nowrap}
.ltag:hover{border-color:var(--b5);color:var(--b1)}

.kb{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.kbc{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:13px;min-height:380px}
.kbch{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}
.kbct{font-size:12px;font-weight:700;color:var(--navy);display:flex;align-items:center;gap:7px}
.kbcc{font-size:10px;background:var(--white);border:1px solid var(--border);color:var(--b4);border-radius:10px;padding:1px 7px}
.kbcard{background:var(--white);border:1px solid var(--border);border-radius:9px;padding:13px;margin-bottom:9px;cursor:pointer;transition:box-shadow .15s,transform .15s}
.kbcard:hover{box-shadow:0 6px 20px rgba(0,29,57,.09);transform:translateY(-2px)}
.kbcard-title{font-size:12px;font-weight:600;color:var(--navy);margin-bottom:5px;line-height:1.4}
.kbcard-sub{font-size:11px;color:var(--b4);margin-bottom:8px}
.kbcard-flags{display:flex;gap:4px;flex-wrap:wrap;margin-top:8px}

.detail-overlay{position:fixed;inset:0;background:rgba(0,29,57,.35);z-index:40;backdrop-filter:blur(2px)}
.detail-drawer{position:fixed;right:0;top:0;bottom:0;width:660px;background:var(--white);border-left:1px solid var(--border2);z-index:41;overflow-y:auto;display:flex;flex-direction:column;animation:slideIn .25s cubic-bezier(.4,0,.2,1)}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.dd-head{padding:20px 24px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px;position:sticky;top:0;background:var(--white);z-index:2}
.dd-head-left{flex:1}
.dd-id{font-size:11px;font-family:var(--fm);color:var(--b1);font-weight:600;margin-bottom:3px}
.dd-title{font-family:var(--fd);font-size:20px;font-weight:700;color:var(--navy);line-height:1.2}
.dd-sub{font-size:12px;color:var(--b4);margin-top:4px}
.dd-body{padding:20px 24px;flex:1}
.dds{margin-bottom:22px}
.ddst{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--b4);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.ddst::after{content:'';flex:1;height:1px;background:var(--border)}
.dg2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.dfl{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--b4);margin-bottom:5px}
.dfv{font-size:13px;color:var(--navy);font-weight:500}
.dd-sel{background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:7px 10px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;width:100%;cursor:pointer}
.dd-sel:focus{border-color:var(--b5)}
.dd-input{background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:7px 10px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;width:100%}
.dd-input:focus{border-color:var(--b5)}

.cl-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #f0f7fc;cursor:pointer}
.cl-item:last-child{border-bottom:none}
.clck{width:17px;height:17px;border-radius:4px;border:2px solid var(--b5);background:#fff;flex-shrink:0;margin-top:1px;position:relative;cursor:pointer;transition:all .14s}
.clck.on{background:var(--b1);border-color:var(--b1)}
.clck.on::after{content:'';position:absolute;top:2px;left:4px;width:6px;height:9px;border:2px solid #fff;border-top:none;border-left:none;transform:rotate(45deg)}
.cl-text{font-size:12px;color:var(--navy);font-weight:500}
.cl-text.on{text-decoration:line-through;color:var(--b4)}
.cl-meta{font-size:11px;color:var(--b4);margin-top:2px}
.cl-add{display:flex;gap:8px;margin-top:10px}
.cl-input{flex:1;background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:7px 11px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none}
.cl-input:focus{border-color:var(--b5)}
.cl-input::placeholder{color:var(--b4)}

.cmt{padding:10px 0;border-bottom:1px solid #f0f7fc}
.cmt:last-child{border-bottom:none}
.cmt-head{display:flex;align-items:center;gap:8px;margin-bottom:5px}
.cmt-av{width:26px;height:26px;border-radius:50%;background:var(--b6);color:var(--b1);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.cmt-name{font-size:12px;font-weight:600;color:var(--navy)}
.cmt-time{font-size:11px;color:var(--b4);margin-left:auto}
.cmt-text{font-size:12px;color:var(--navy);line-height:1.5;padding-left:34px}
.cmt-box{display:flex;gap:9px;margin-top:12px;align-items:flex-end}
.cmt-ta{flex:1;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;resize:none;height:68px;transition:border-color .15s}
.cmt-ta:focus{border-color:var(--b5);box-shadow:0 0 0 3px rgba(123,189,232,.1)}
.cmt-ta::placeholder{color:var(--b4)}

.hist-item{display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f7fc}
.hist-item:last-child{border-bottom:none}
.hdot{width:8px;height:8px;border-radius:50%;background:var(--b5);flex-shrink:0;margin-top:4px}
.htext{font-size:12px;color:var(--navy)}
.htime{font-size:11px;color:var(--b4);margin-top:2px}

.att-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}
.att-card{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 12px;cursor:pointer;transition:all .14s;display:flex;align-items:center;gap:9px}
.att-card:hover{border-color:var(--b5);background:var(--white)}
.att-icon{font-size:20px;flex-shrink:0}
.att-name{font-size:11px;font-weight:500;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.att-type{font-size:10px;color:var(--b4)}

.lnk-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #f0f7fc;cursor:pointer;transition:background .12s;border-radius:6px}
.lnk-row:hover{background:rgba(123,189,232,.05);margin:0 -4px;padding:9px 4px}
.lnk-row:last-child{border-bottom:none}
.lnk-icon{width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0}
.lnk-title{font-size:12px;font-weight:500;color:var(--navy)}
.lnk-meta{font-size:11px;color:var(--b4)}
.lnk-badge{margin-left:auto;font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;flex-shrink:0}

.so-banner{background:linear-gradient(135deg,rgba(10,65,116,.04),rgba(123,189,232,.1));border:1px solid var(--b5);border-radius:9px;padding:13px 16px;display:flex;align-items:center;gap:12px;margin-bottom:14px}
.so-title{font-size:13px;font-weight:600;color:var(--b1)}
.so-sub{font-size:11px;color:var(--b4)}
.inc-tag{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:4px 10px;border-radius:6px;background:#fdecea;color:var(--danger);border:1px solid #f5c6c1;cursor:pointer;margin-bottom:6px}

.modal{
  width: 100%;
  max-width: 600px;

  transform: translateY(40px); /* 👈 THIS is the real fix */

  background: var(--white);
  border: 1px solid var(--border2);
  border-radius: 16px;
  padding: 28px;

  max-height: 88vh;
  overflow-y: auto;
}
.modal{
  width:100%;
  max-width:600px;   /* clean fixed center width */

  margin:auto;       /* ensures centering inside flex */

  background:var(--white);
  border:1px solid var(--border2);
  border-radius:16px;
  padding:28px;

  max-height:88vh;
  overflow-y:auto;
}
.modal-title{font-family:var(--fd);font-size:21px;font-weight:700;color:var(--navy);margin-bottom:3px}
.modal-sub{font-size:12px;color:var(--b4);margin-bottom:22px}
.mf{margin-bottom:15px}
.ml3{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--b4);margin-bottom:5px}
.mi{width:100%;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;transition:border-color .15s}
.mi:focus{border-color:var(--b5);box-shadow:0 0 0 3px rgba(123,189,232,.1)}
.mi::placeholder{color:var(--b4)}
.ms3{width:100%;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;cursor:pointer}
.mta{width:100%;background:var(--bg);border:1px solid var(--border2);border-radius:8px;padding:9px 12px;font-family:var(--fm);font-size:12px;color:var(--navy);outline:none;resize:vertical;min-height:80px}
.mta::placeholder{color:var(--b4)}
.m2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.m3g{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.mdiv{height:1px;background:var(--border);margin:18px 0}
.mact{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.upz{border:2px dashed var(--b5);border-radius:9px;padding:18px;text-align:center;cursor:pointer;transition:all .15s;background:rgba(123,189,232,.04)}
.upz:hover{border-color:var(--b1);background:rgba(10,65,116,.04)}
.upz-icon{font-size:26px;margin-bottom:5px}
.upz-text{font-size:12px;color:var(--b2);font-weight:500}
.upz-sub{font-size:11px;color:var(--b4);margin-top:3px}

.toast{position:fixed;bottom:22px;right:22px;background:var(--navy);color:#fff;font-family:var(--fm);font-size:12px;padding:10px 16px;border-radius:9px;z-index:100;pointer-events:none;transition:opacity .3s,transform .3s;box-shadow:0 8px 24px rgba(0,29,57,.3)}
.toast.h{opacity:0;transform:translateY(8px)}
.toast.s{opacity:1;transform:translateY(0)}

@keyframes fu{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:translateY(0)}}
.body>*{animation:fu .33s ease both}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--b5);border-radius:3px}
@media(max-width:900px){
  .kpi-strip{grid-template-columns:repeat(3,1fr)}
  .kb{grid-template-columns:1fr 1fr}
  .detail-drawer{width:100%}
  .att-grid{grid-template-columns:1fr 1fr}
}
`;

/* ─── DATA ─────────────────────────────── */
const INIT_TASKS = [
  {
    id:"T-001",title:"Level 4 Floor Plan — Block A",
    desc:"Develop complete floor plan for Level 4, Block A including room layouts, door schedules, and coordination overlays with structural and MEP drawings.",
    project:"Skyward Residency",phase:"Design Development",status:"In Progress",priority:"High",
    due:"2026-04-22",assignee:"Arjun K.",role:"Lead Architect",initials:"AK",progress:65,
    signoff:"Pending",
    drawings:["DWG-A101 · L4 Floor Plan Rev C","DWG-A102 · L4 Reflected Ceiling"],
    rfi:["RFI-041 · Beam depth Grid B-12","RFI-028 · Window vent sizes"],
    incidents:[],
    logs:["Apr 17 · Completed grid set-up, column lines verified","Apr 16 · MEP overlay received from T. Kumar"],
    checklist:[
      {id:1,text:"Set up drawing grid and column lines",done:true},
      {id:2,text:"Complete room layouts Level 4",done:true},
      {id:3,text:"Coordinate with structural on slab edges",done:false},
      {id:4,text:"Add door and window schedule references",done:false},
      {id:5,text:"Upload final Rev C to document store",done:false},
    ],
    comments:[
      {av:"AK",name:"Arjun K.",time:"Apr 17, 2:14 PM",text:"Grid setup complete. Need structural confirmation on slab edge at Grid D before I can finalise west wing."},
      {av:"SM",name:"S. Mehta",time:"Apr 17, 4:32 PM",text:"Structural confirmation expected tomorrow. Eng. Sharma will send sketch."},
    ],
    history:[
      {text:"Status changed: Not Started → In Progress",by:"Arjun K.",time:"Apr 15, 9:00 AM"},
      {text:"Checklist item completed: grid setup",by:"Arjun K.",time:"Apr 16, 11:30 AM"},
      {text:"Comment added",by:"S. Mehta",time:"Apr 17, 4:32 PM"},
    ],
    attachments:[{name:"L4-FloorPlan-RevC.dwg",type:"DWG",icon:"📐"},{name:"MEP-Overlay-L4.pdf",type:"PDF",icon:"📄"},{name:"Site-Photo-GridD.jpg",type:"JPG",icon:"🖼️"}],
  },
  {
    id:"T-002",title:"Facade Material Specification",
    desc:"Prepare full material specification document for south wing curtain wall facade including fire ratings, thermal performance, and supplier details.",
    project:"Skyward Residency",phase:"Design Development",status:"Under Review",priority:"Urgent",
    due:"2026-04-20",assignee:"S. Mehta",role:"Architect",initials:"SM",progress:90,
    signoff:"Pending",
    drawings:["DWG-A201 · Facade Elevation Rev D","DWG-A202 · Curtain Wall Detail"],
    rfi:[],incidents:[],
    logs:["Apr 17 · Document submitted for QA review","Apr 15 · Supplier quotations compiled"],
    checklist:[
      {id:1,text:"Compile thermal performance data",done:true},
      {id:2,text:"Confirm fire rating compliance BS EN 13501",done:true},
      {id:3,text:"Get supplier sign-off on sample colours",done:true},
      {id:4,text:"Submit to QA for review",done:true},
      {id:5,text:"Incorporate QA comments",done:false},
    ],
    comments:[{av:"QA",name:"QA Team",time:"Apr 17, 10:00 AM",text:"Minor gap in fire rating certificate for Unit Type B panels. Please address before client submission."}],
    history:[{text:"Status changed: In Progress → Under Review",by:"S. Mehta",time:"Apr 17, 9:45 AM"}],
    attachments:[{name:"Facade-Spec-RevD.pdf",type:"PDF",icon:"📄"},{name:"Sample-Board.jpg",type:"JPG",icon:"🖼️"}],
  },
  {
    id:"T-003",title:"Staircase Detail Drawing — Core B",
    desc:"Produce construction detail drawings for main staircase in Core B including sections, handrail specifications, and finishes.",
    project:"Skyward Residency",phase:"Construction Docs",status:"To Do",priority:"Medium",
    due:"2026-04-28",assignee:"P. Rao",role:"Junior Architect",initials:"PR",progress:0,
    signoff:"Not Required",drawings:[],rfi:["RFI-035 · Handrail spec SS vs aluminium"],incidents:[],logs:[],
    checklist:[
      {id:1,text:"Obtain structural Core B dimensions",done:false},
      {id:2,text:"Draft staircase section drawings",done:false},
      {id:3,text:"Specify handrail materials and fixings",done:false},
      {id:4,text:"QA review and sign-off",done:false},
    ],
    comments:[],
    history:[{text:"Task created and assigned to P. Rao",by:"Arjun K.",time:"Apr 14, 8:30 AM"}],
    attachments:[],
  },
  {
    id:"T-004",title:"MEP Coordination — Level 5 Ceiling",
    desc:"Resolve HVAC and electrical duct clash on Level 5 ceiling grid. Coordinate with MEP consultants and revise ceiling height if required.",
    project:"Skyward Residency",phase:"Construction Docs",status:"Blocked",priority:"Urgent",
    due:"2026-04-19",assignee:"Arjun K.",role:"Lead Architect",initials:"AK",progress:30,
    signoff:"Not Required",drawings:["DWG-M501 · MEP Plan Level 5"],rfi:["RFI-041 · Beam depth Grid B-12"],
    incidents:["INC-023 · HVAC duct clash Level 5 — Apr 15"],
    logs:["Apr 16 · Clash detected on BIM model, escalated to MEP lead"],
    checklist:[
      {id:1,text:"Export clash report from BIM model",done:true},
      {id:2,text:"Coordinate with MEP lead on resolution",done:false},
      {id:3,text:"Revise ceiling grid if required",done:false},
      {id:4,text:"Update drawings and redistribute",done:false},
    ],
    comments:[
      {av:"TK",name:"T. Kumar",time:"Apr 16, 3:00 PM",text:"MEP lead confirmed two options: (1) drop ceiling 150mm, (2) re-route duct via risers."},
      {av:"AK",name:"Arjun K.",time:"Apr 16, 5:15 PM",text:"Option 2 preferred. Blocked pending structural confirmation on riser shaft."},
    ],
    history:[
      {text:"Status changed: In Progress → Blocked",by:"Arjun K.",time:"Apr 16, 5:20 PM"},
      {text:"Incident INC-023 linked",by:"System",time:"Apr 15, 4:00 PM"},
    ],
    attachments:[{name:"BIM-ClashReport-L5.pdf",type:"PDF",icon:"📄"},{name:"MEP-Plan-L5-Rev2.dwg",type:"DWG",icon:"📐"}],
  },
  {
    id:"T-005",title:"Lobby Interior Finish Schedule",
    desc:"Prepare comprehensive interior finish schedule for lobby areas across all blocks including flooring, wall cladding, ceiling finishes, and joinery.",
    project:"Skyward Residency",phase:"Schematic Design",status:"Done",priority:"Low",
    due:"2026-04-15",assignee:"A. Jain",role:"Interior Designer",initials:"AJ",progress:100,
    signoff:"Approved",drawings:["DWG-I101 · Lobby Finish Schedule"],rfi:[],incidents:[],
    logs:["Apr 14 · Client approved finish selections","Apr 12 · Final schedule compiled"],
    checklist:[
      {id:1,text:"Compile flooring specifications",done:true},
      {id:2,text:"Specify wall cladding materials",done:true},
      {id:3,text:"Prepare ceiling finish matrix",done:true},
      {id:4,text:"Client presentation and approval",done:true},
      {id:5,text:"Upload to ERP document store",done:true},
    ],
    comments:[{av:"CL",name:"Client (Mr. Rajan)",time:"Apr 14, 11:00 AM",text:"Finish selections confirmed. Approved to proceed to procurement."}],
    history:[
      {text:"Client sign-off received — APPROVED",by:"System",time:"Apr 14, 11:45 AM"},
      {text:"Status changed: Under Review → Done",by:"A. Jain",time:"Apr 14, 12:00 PM"},
    ],
    attachments:[{name:"Lobby-FinishSchedule-v3.pdf",type:"PDF",icon:"📄"},{name:"Material-Samples.jpg",type:"JPG",icon:"🖼️"}],
  },
  {
    id:"T-006",title:"Window Schedule — Block B",
    desc:"Compile and finalise window schedule for Block B including performance specifications, glazing type, frame colour, and hardware.",
    project:"Skyward Residency",phase:"Design Development",status:"In Progress",priority:"Medium",
    due:"2026-04-26",assignee:"A. Jain",role:"Interior Designer",initials:"AJ",progress:70,
    signoff:"Pending",drawings:["DWG-A501 · Window Schedule Rev C"],rfi:["RFI-028 · Window vent compliance"],incidents:[],
    logs:["Apr 17 · 70% complete, glazing type confirmed"],
    checklist:[
      {id:1,text:"Compile window types from drawings",done:true},
      {id:2,text:"Confirm glazing performance specs",done:true},
      {id:3,text:"Specify frame colours with client",done:true},
      {id:4,text:"Hardware and ironmongery schedule",done:false},
      {id:5,text:"Submit to contractor for pricing",done:false},
    ],
    comments:[],
    history:[{text:"Task created",by:"Arjun K.",time:"Apr 12, 9:00 AM"},{text:"Status: To Do → In Progress",by:"A. Jain",time:"Apr 13, 10:30 AM"}],
    attachments:[{name:"Window-Schedule-RevC.xlsx",type:"XLSX",icon:"📊"}],
  },
  {
    id:"T-007",title:"Site Plan Update — Phase 2 Boundary",
    desc:"Update site plan to reflect surveyed Phase 2 boundary, access roads, site hoardings, and contractor compound.",
    project:"Green Valley Towers",phase:"Schematic Design",status:"Done",priority:"Medium",
    due:"2026-04-10",assignee:"T. Kumar",role:"Technician",initials:"TK",progress:100,
    signoff:"Approved",drawings:["DWG-S001 · Site Plan Rev E"],rfi:[],incidents:[],
    logs:["Apr 10 · Submitted and approved by PM"],
    checklist:[
      {id:1,text:"Receive surveyor boundary data",done:true},
      {id:2,text:"Update site plan drawing",done:true},
      {id:3,text:"PM review and approval",done:true},
    ],
    comments:[],
    history:[{text:"Approved by Project Manager",by:"PM",time:"Apr 10, 3:00 PM"},{text:"Status: Under Review → Done",by:"T. Kumar",time:"Apr 10, 3:15 PM"}],
    attachments:[{name:"SitePlan-RevE.dwg",type:"DWG",icon:"📐"}],
  },
];

const STATUSES_LIST = ["All Statuses","To Do","In Progress","Under Review","Done","Blocked"];
const PHASES_LIST   = ["All Phases","Schematic Design","Design Development","Construction Docs"];
const PROJS_LIST    = ["All Projects","Skyward Residency","Green Valley Towers"];
const ROLES_LIST = [
  "Arjun K. (Lead Architect)",
  "S. Mehta (Architect)",
  "P. Rao (Junior Architect)",
  "T. Kumar (Technician)",
  "A. Jain (Interior Designer)",
  "R. Singh (Draftsman)",
  "V. Patel (3D Visualizer)",
  "A. Desai (Interior Designer)",
  "N. Gupta (BIM Modeler)"
];
const KB_COLS       = [{label:"To Do",key:"To Do"},{label:"In Progress",key:"In Progress"},{label:"Under Review",key:"Under Review"},{label:"Done",key:"Done"}];

const sClass = s => ({"To Do":"s-todo","In Progress":"s-inprog","Under Review":"s-review","Done":"s-done","Blocked":"s-blocked","On Hold":"s-hold","Pending":"s-pend","Approved":"s-appr","Rejected":"s-rej","Not Required":"s-nr"}[s]||"s-todo");
const pClass = p => ({Urgent:"pu",High:"ph2",Medium:"pm",Low:"pl"}[p]||"pl");
const dClass = d => { const diff=(new Date(d)-new Date())/86400000; return diff<0?"dover":diff<3?"dsoon":"dok"; };

/* ─── COMPONENT ─── */
export default function ArchitectTaskPage() {
  const [tab, setTab]         = useState("List");
  const [tasks, setTasks]     = useState(INIT_TASKS);
  const [search, setSearch]   = useState("");
  const [fSt, setFSt]         = useState("All Statuses");
  const [fPh, setFPh]         = useState("All Phases");
  const [fPr, setFPr]         = useState("All");
  const [fProj, setFProj]     = useState("All Projects");
  const [sortCol, setSortCol] = useState("due");
  const [sortAsc, setSortAsc] = useState(true);
  const [detail, setDetail]   = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newCmt, setNewCmt]   = useState("");
  const [newCl, setNewCl]     = useState("");
  const [toast, setToast]     = useState({msg:"",show:false});
  const [nt, setNt]           = useState({title:"",desc:"",project:"Skyward Residency",phase:"Design Development",status:"To Do",priority:"High",due:"",assignee:"Arjun K. (Lead Architect)",signoff:"Not Required",reminder:false});

  const toast_ = msg => { setToast({msg,show:true}); setTimeout(()=>setToast(t=>({...t,show:false})),2800); };

  const upd = (id, patch) => {
    setTasks(prev => prev.map(t => t.id===id ? {...t,...patch} : t));
  };

  // keep detail in sync
  const openDetail = t => setDetail(t);
  const syncDetail = id => { const t = tasks.find(x=>x.id===id); if(t) setDetail(t); };

  const toggleCl = (tid, cid) => {
    setTasks(prev => prev.map(t => t.id===tid ? {...t, checklist: t.checklist.map(c => c.id===cid ? {...c,done:!c.done} : c)} : t));
    syncDetail(tid);
  };

  const addCl = tid => {
    if(!newCl.trim()) return;
    const item = {id:Date.now(),text:newCl.trim(),done:false};
    setTasks(prev => prev.map(t => t.id===tid ? {...t, checklist:[...t.checklist,item]} : t));
    setNewCl(""); toast_("Checklist item added ✓"); syncDetail(tid);
  };

  const addCmt = tid => {
    if(!newCmt.trim()) return;
    const c = {av:"AK",name:"Arjun K.",time:"Just now",text:newCmt.trim()};
    setTasks(prev => prev.map(t => t.id===tid ? {...t, comments:[...t.comments,c], history:[{text:"Comment added by Arjun K.",by:"Arjun K.",time:"Just now"},...t.history]} : t));
    setNewCmt(""); toast_("Comment posted ✓"); syncDetail(tid);
  };

  const filtered = tasks.filter(t => {
    if(search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.id.toLowerCase().includes(search.toLowerCase())) return false;
    if(fSt!=="All Statuses" && t.status!==fSt) return false;
    if(fPh!=="All Phases" && t.phase!==fPh) return false;
    if(fPr!=="All" && t.priority!==fPr) return false;
    if(fProj!=="All Projects" && t.project!==fProj) return false;
    return true;
  }).sort((a,b) => {
    let av=a[sortCol]||"", bv=b[sortCol]||"";
    if(sortCol==="due"){av=new Date(av);bv=new Date(bv);}
    return sortAsc?(av>bv?1:-1):(av<bv?1:-1);
  });

  const st = {
    total:tasks.length,
    overdue:tasks.filter(t=>new Date(t.due)<new Date()&&t.status!=="Done").length,
    week:tasks.filter(t=>{const d=(new Date(t.due)-new Date())/86400000;return d>=0&&d<=7;}).length,
    high:tasks.filter(t=>t.priority==="High"||t.priority==="Urgent").length,
    pso:tasks.filter(t=>t.signoff==="Pending").length,
    done:tasks.filter(t=>t.status==="Done").length,
  };

  const sort = col => { if(sortCol===col) setSortAsc(!sortAsc); else { setSortCol(col); setSortAsc(true); } };

  const TABS_LIST = [
    {name:"List",count:tasks.length},
    {name:"Board",count:null},
    {name:"Checklist",count:tasks.reduce((a,t)=>a+t.checklist.filter(c=>!c.done).length,0)},
  ];

  /* live-sync detail with tasks state */
  const liveDetail = detail ? tasks.find(t=>t.id===detail.id)||null : null;

  return (
    <>
      <style>{CSS}</style>

      

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Task Board</div>
          <div className="ph-sub">Architect · Skyward Residency &amp; Green Valley Towers · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        <div className="ph-right">
  <button className="btn btn-p" onClick={()=>setShowNew(true)}>
    ＋ New Task
  </button>
</div>
      </div>

      {/* TABS */}
      <div className="tabs">
        {TABS_LIST.map(t=>(
          <button key={t.name} className={`tab${tab===t.name?" on":""}`} onClick={()=>setTab(t.name)}>
            {t.name}{t.count!==null&&<span className="tc">{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="body">

        {/* KPI STRIP */}
        <div className="kpi-strip">
          {[
            {label:"Total Tasks",val:st.total,meta:"All projects",pct:100,col:""},
            {label:"Overdue",val:st.overdue,meta:"Past deadline",pct:st.overdue/st.total*100,col:" red",bar:"linear-gradient(90deg,var(--danger),#e74c3c)"},
            {label:"Due This Week",val:st.week,meta:"Next 7 days",pct:st.week/st.total*100,col:st.week>2?" amber":"",bar:"linear-gradient(90deg,var(--warn),#f0c040)"},
            {label:"High Priority",val:st.high,meta:"High + Urgent",pct:st.high/st.total*100,col:" amber"},
            {label:"Pending Sign-off",val:st.pso,meta:"Awaiting approval",pct:st.pso/st.total*100,col:" amber",bar:"linear-gradient(90deg,#7a5200,var(--warn))"},
            {label:"Completed",val:st.done,meta:`${Math.round(st.done/st.total*100)}% of total`,pct:st.done/st.total*100,col:" green",bar:"linear-gradient(90deg,var(--ok),#2d8a50)"},
          ].map(k=>(
            <div key={k.label} className="kc">
              <div className="kc-label">{k.label}</div>
              <div className={`kc-val${k.col}`}>{k.val}</div>
              <div className="kc-meta">{k.meta}</div>
              <div className="kc-bar"><div className="kc-fill" style={{width:`${k.pct}%`,...(k.bar?{background:k.bar}:{})}}/></div>
            </div>
          ))}
        </div>

        {/* ── LIST VIEW ── */}
        {tab==="List"&&(
          <>
            <div className="fbar">
              <input className="fsearch" placeholder="Search task name or ID…" value={search} onChange={e=>setSearch(e.target.value)}/>
              <select className="fsel" value={fSt} onChange={e=>setFSt(e.target.value)}>
                {STATUSES_LIST.map(s=><option key={s}>{s}</option>)}
              </select>
              <select className="fsel" value={fPh} onChange={e=>setFPh(e.target.value)}>
                {PHASES_LIST.map(p=><option key={p}>{p}</option>)}
              </select>
              <select className="fsel" value={fProj} onChange={e=>setFProj(e.target.value)}>
                {PROJS_LIST.map(p=><option key={p}>{p}</option>)}
              </select>
              {["Urgent","High","Medium","Low"].map(p=>(
                <button key={p} className={`chip${fPr===p?" on":""}`} onClick={()=>setFPr(fPr===p?"All":p)}>{p}</button>
              ))}
              <span className="fcount">{filtered.length} tasks</span>
            </div>

            <div className="ttw">
              <table className="tt">
                <thead>
                  <tr>
                    <th onClick={()=>sort("id")}>ID{sortCol==="id"?(sortAsc?" ↑":" ↓"):""}</th>
                    <th onClick={()=>sort("title")}>Task{sortCol==="title"?(sortAsc?" ↑":" ↓"):""}</th>
                    <th onClick={()=>sort("phase")}>Phase</th>
                    <th onClick={()=>sort("priority")}>Priority</th>
                    <th onClick={()=>sort("status")}>Status</th>
                    <th onClick={()=>sort("assignee")}>Assigned To</th>
                    <th>Progress</th>
                    <th onClick={()=>sort("due")}>Due{sortCol==="due"?(sortAsc?" ↑":" ↓"):""}</th>
                    <th>Sign-off</th>
                    <th>Links</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t=>(
                    <tr key={t.id} onClick={()=>openDetail(t)}>
                      <td><span className="t-id">{t.id}</span></td>
                      <td style={{minWidth:200}}>
                        <div className={`t-name${t.status==="Done"?" done":""}`}>{t.title}</div>
                        <div className="t-sub">{t.project} · {t.phase}</div>
                      </td>
                      <td><span style={{fontSize:11,color:"var(--b2)"}}>{t.phase}</span></td>
                      <td>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <span className={`pdot ${pClass(t.priority)}`}/>
                          <span style={{fontSize:11,fontWeight:600,color:t.priority==="Urgent"?"var(--danger)":t.priority==="High"?"var(--warn)":t.priority==="Medium"?"var(--b3)":"var(--b4)"}}>{t.priority}</span>
                        </div>
                      </td>
                      <td><span className={`sb ${sClass(t.status)}`}>{t.status}</span></td>
                      <td><div className="avp"><div className="av">{t.initials}</div>{t.assignee}</div></td>
                      <td>
                        <div className="pw">
                          <div className="pb"><div className="pf" style={{width:`${t.progress}%`}}/></div>
                          <div className="pl2">{t.progress}%</div>
                        </div>
                      </td>
                      <td><span className={dClass(t.due)}>{t.due}</span></td>
                      <td><span className={`sb ${sClass(t.signoff)}`}>{t.signoff}</span></td>
                      <td onClick={e=>e.stopPropagation()}>
                        <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                          {t.drawings.length>0&&<span className="ltag" onClick={()=>toast_(`Designs for ${t.id}…`)}>📐 {t.drawings.length}</span>}
                          {t.rfi.length>0&&<span className="ltag" style={{color:"var(--danger)",borderColor:"#f5c6c1"}} onClick={()=>toast_(`RFIs for ${t.id}…`)}>⚠️ {t.rfi.length}</span>}
                          {t.incidents.length>0&&<span className="ltag" style={{color:"var(--danger)"}} onClick={()=>toast_("Incident…")}>🚨 {t.incidents.length}</span>}
                          {t.logs.length>0&&<span className="ltag" style={{color:"var(--ok)"}} onClick={()=>toast_("Logs…")}>📋 {t.logs.length}</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── BOARD VIEW ── */}
        {tab==="Board"&&(
          <div className="kb">
            {KB_COLS.map(col=>{
              const colT = tasks.filter(t=>t.status===col.key);
              return (
                <div key={col.key} className="kbc">
                  <div className="kbch">
                    <div className="kbct">{col.label}<span className="kbcc">{colT.length}</span></div>
                    <button className="btn btn-g btn-sm" style={{padding:"2px 7px"}} onClick={()=>setShowNew(true)}>+</button>
                  </div>
                  {colT.map(t=>(
                    <div key={t.id} className="kbcard" onClick={()=>openDetail(t)}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
                        <span className={`pdot ${pClass(t.priority)}`}/>
                        <span style={{fontSize:10,fontFamily:"var(--fm)",color:"var(--b1)",fontWeight:600}}>{t.id}</span>
                        <span style={{marginLeft:"auto",fontSize:10,color:"var(--b4)"}}>{t.phase.split(" ")[0]}</span>
                      </div>
                      <div className="kbcard-title">{t.title}</div>
                      <div className="kbcard-sub">{t.project}</div>
                      <div className="pb" style={{marginBottom:10}}><div className="pf" style={{width:`${t.progress}%`}}/></div>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div className="avp" style={{fontSize:10}}><div className="av" style={{width:18,height:18,fontSize:8}}>{t.initials}</div>{t.assignee}</div>
                        <span className={dClass(t.due)} style={{fontSize:11}}>{t.due}</span>
                      </div>
                      <div className="kbcard-flags">
                        {t.signoff==="Pending"&&<span className="sb s-pend" style={{fontSize:9,padding:"2px 6px"}}>Sign-off Pending</span>}
                        {t.incidents.length>0&&<span className="sb s-over" style={{fontSize:9,padding:"2px 6px"}}>🚨 Incident</span>}
                        {t.rfi.length>0&&<span className="sb s-review" style={{fontSize:9,padding:"2px 6px"}}>⚠️ {t.rfi.length} RFI</span>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {/* ── CHECKLIST VIEW ── */}
        {tab==="Checklist"&&(
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {tasks.map(t=>{
              const open = t.checklist.filter(c=>!c.done).length;
              return (
                <div key={t.id} style={{background:"var(--white)",border:"1px solid var(--border)",borderRadius:"var(--r)",overflow:"hidden"}}>
                  <div style={{padding:"13px 18px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>openDetail(t)}>
                    <span className="t-id">{t.id}</span>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--navy)",flex:1}}>{t.title}</span>
                    <span className={`sb ${sClass(t.status)}`}>{t.status}</span>
                    <span style={{fontSize:11,color:open>0?"var(--warn)":"var(--ok)",fontWeight:600}}>{open>0?`${open} pending`:"✓ All done"}</span>
                  </div>
                  {t.checklist.map(c=>(
                    <div key={c.id} className="cl-item" style={{padding:"9px 18px"}} onClick={()=>toggleCl(t.id,c.id)}>
                      <div className={`clck${c.done?" on":""}`}/>
                      <div className={`cl-text${c.done?" on":""}`}>{c.text}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

      </div>{/* end .body */}

      {/* ════════════ TASK DETAIL DRAWER ════════════ */}
      {liveDetail&&(
        <>
          <div className="detail-overlay" onClick={()=>setDetail(null)}/>
          <div className="detail-drawer">

            <div className="dd-head">
              <div className="dd-head-left">
                <div className="dd-id">{liveDetail.id} · {liveDetail.project}</div>
                <div className="dd-title">{liveDetail.title}</div>
                <div className="dd-sub">{liveDetail.phase} · {liveDetail.role}</div>
              </div>
              <div style={{display:"flex",gap:7,flexShrink:0,flexWrap:"wrap",alignItems:"flex-start"}}>
                <span className={`sb ${sClass(liveDetail.status)}`}>{liveDetail.status}</span>
                <button className="btn btn-g btn-sm" onClick={()=>setDetail(null)}>✕</button>
              </div>
            </div>

            <div className="dd-body">

              {/* EDITABLE META */}
              <div className="dds">
                <div className="dg2">
                  <div>
                    <div className="dfl">Status</div>
                    <select className="dd-sel" value={liveDetail.status} onChange={e=>{upd(liveDetail.id,{status:e.target.value,history:[{text:`Status → ${e.target.value}`,by:"Arjun K.",time:"Just now"},...liveDetail.history]});toast_("Status updated ✓");}}>
                      {["To Do","In Progress","Under Review","Done","Blocked","On Hold"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="dfl">Priority</div>
                    <select className="dd-sel" value={liveDetail.priority} onChange={e=>{upd(liveDetail.id,{priority:e.target.value});toast_("Priority updated ✓");}}>
                      {["Urgent","High","Medium","Low"].map(p=><option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="dfl">Assigned To</div>
                    <select className="dd-sel" value={ROLES_LIST.find(r=>r.startsWith(liveDetail.assignee))||ROLES_LIST[0]} onChange={e=>{const n=e.target.value.split(" (")[0];upd(liveDetail.id,{assignee:n,initials:n.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase(),history:[{text:`Reassigned to ${n}`,by:"Arjun K.",time:"Just now"},...liveDetail.history]});toast_("Reassigned ✓");}}>
                      {ROLES_LIST.map(r=><option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="dfl">Due Date</div>
                    <input type="date" className="dd-input" value={liveDetail.due} onChange={e=>{upd(liveDetail.id,{due:e.target.value});toast_("Due date updated ✓");}}/>
                  </div>
                </div>

                {/* PROGRESS */}
                <div style={{marginBottom:14}}>
                  <div className="dfl" style={{marginBottom:7}}>Progress — {liveDetail.progress}%</div>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div className="pb" style={{flex:1,height:8}}><div className="pf" style={{width:`${liveDetail.progress}%`,height:"100%"}}/></div>
                    <input type="range" min="0" max="100" value={liveDetail.progress} style={{width:80}} onChange={e=>upd(liveDetail.id,{progress:+e.target.value})}/>
                  </div>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <div className="dfl">Description</div>
                  <div style={{fontSize:13,color:"var(--navy)",lineHeight:1.6,background:"var(--bg)",borderRadius:8,padding:"10px 12px",border:"1px solid var(--border)"}}>{liveDetail.desc}</div>
                </div>
              </div>

              {/* SIGN-OFF */}
              {(liveDetail.signoff==="Pending"||liveDetail.signoff==="Approved"||liveDetail.signoff==="Rejected")&&(
                <div className="dds">
                  <div className="ddst">Sign-Off</div>
                  <div className="so-banner">
                    <span style={{fontSize:22}}>{liveDetail.signoff==="Approved"?"✅":liveDetail.signoff==="Rejected"?"❌":"📝"}</span>
                    <div style={{flex:1}}>
                      <div className="so-title">Client / Authority Sign-Off</div>
                      <div className="so-sub">Status: <b style={{color:liveDetail.signoff==="Approved"?"var(--ok)":liveDetail.signoff==="Rejected"?"var(--danger)":"var(--warn)"}}>{liveDetail.signoff}</b></div>
                    </div>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      <button className="btn btn-s btn-sm" onClick={()=>toast_("Navigating to Sign-off module…")}>View →</button>
                      {liveDetail.signoff==="Pending"&&(
                        <>
                          <button className="btn btn-p btn-sm" onClick={()=>{upd(liveDetail.id,{signoff:"Approved"});toast_("Approved ✓");}}>Approve</button>
                          <button className="btn btn-d btn-sm" onClick={()=>{upd(liveDetail.id,{signoff:"Rejected"});toast_("Rejected");}}>Reject</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* INCIDENTS */}
              {liveDetail.incidents.length>0&&(
                <div className="dds">
                  <div className="ddst">Incidents</div>
                  {liveDetail.incidents.map((inc,i)=>(
                    <div key={i}><span className="inc-tag" onClick={()=>toast_(`Opening ${inc.split("·")[0].trim()}…`)}>🚨 {inc}</span></div>
                  ))}
                </div>
              )}

              {/* CHECKLIST */}
              <div className="dds">
                <div className="ddst">
                  Checklist
                  <span style={{fontSize:11,color:"var(--b4)",fontWeight:400,textTransform:"none",letterSpacing:0,marginLeft:4}}>
                    {liveDetail.checklist.filter(c=>c.done).length}/{liveDetail.checklist.length}
                  </span>
                </div>
                {liveDetail.checklist.map(c=>(
                  <div key={c.id} className="cl-item" onClick={()=>toggleCl(liveDetail.id,c.id)}>
                    <div className={`clck${c.done?" on":""}`}/>
                    <div className={`cl-text${c.done?" on":""}`}>{c.text}</div>
                  </div>
                ))}
                <div className="cl-add">
                  <input className="cl-input" placeholder="Add checklist item…" value={newCl} onChange={e=>setNewCl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addCl(liveDetail.id)}/>
                  <button className="btn btn-s btn-sm" onClick={()=>addCl(liveDetail.id)}>Add</button>
                </div>
              </div>

              {/* LINKED DESIGNS */}
              {liveDetail.drawings.length>0&&(
                <div className="dds">
                  <div className="ddst">Linked Drawings</div>
                  {liveDetail.drawings.map((d,i)=>(
                    <div key={i} className="lnk-row" onClick={()=>toast_(`Opening ${d}…`)}>
                      <div className="lnk-icon" style={{background:"#e6f0fa"}}>📐</div>
                      <div><div className="lnk-title">{d}</div><div className="lnk-meta">Design file</div></div>
                      <span className="lnk-badge" style={{background:"#e6f0fa",color:"var(--b1)",border:"1px solid var(--b5)"}}>Open →</span>
                    </div>
                  ))}
                  <button className="btn btn-g btn-sm" style={{marginTop:8}} onClick={()=>toast_("Link drawing…")}>+ Link Drawing</button>
                </div>
              )}

              {/* RFIs */}
              {liveDetail.rfi.length>0&&(
                <div className="dds">
                  <div className="ddst">Open RFIs</div>
                  {liveDetail.rfi.map((r,i)=>(
                    <div key={i} className="lnk-row" onClick={()=>toast_(`Opening ${r}…`)}>
                      <div className="lnk-icon" style={{background:"#fdecea"}}>⚠️</div>
                      <div><div className="lnk-title">{r}</div><div className="lnk-meta">Request for Information</div></div>
                      <span className="lnk-badge" style={{background:"#fdecea",color:"var(--danger)",border:"1px solid #f5c6c1"}}>View →</span>
                    </div>
                  ))}
                </div>
              )}

              {/* DAILY LOGS */}
              {liveDetail.logs.length>0&&(
                <div className="dds">
                  <div className="ddst">Related Daily Logs</div>
                  {liveDetail.logs.map((l,i)=>(
                    <div key={i} className="lnk-row" onClick={()=>toast_("Opening daily log…")}>
                      <div className="lnk-icon" style={{background:"#eaf4ee"}}>📋</div>
                      <div><div className="lnk-title">{l.split("·")[1]?.trim()}</div><div className="lnk-meta">{l.split("·")[0]?.trim()}</div></div>
                      <span className="lnk-badge" style={{background:"#eaf4ee",color:"var(--ok)",border:"1px solid #a8d9b8"}}>View →</span>
                    </div>
                  ))}
                  <button className="btn btn-g btn-sm" style={{marginTop:8}} onClick={()=>toast_("Opening Daily Logs module…")}>All Logs →</button>
                </div>
              )}

              {/* ATTACHMENTS */}
              <div className="dds">
                <div className="ddst">Attachments</div>
                {liveDetail.attachments.length>0&&(
                  <div className="att-grid" style={{marginBottom:10}}>
                    {liveDetail.attachments.map((a,i)=>(
                      <div key={i} className="att-card" onClick={()=>toast_(`Downloading ${a.name}…`)}>
                        <span className="att-icon">{a.icon}</span>
                        <div><div className="att-name">{a.name}</div><div className="att-type">{a.type}</div></div>
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn btn-g btn-sm" onClick={()=>toast_("File upload dialog…")}>+ Attach File</button>
              </div>

              {/* COMMENTS */}
              <div className="dds">
                <div className="ddst">Comments &amp; Notes</div>
                {liveDetail.comments.length===0&&<div style={{fontSize:12,color:"var(--b4)",padding:"6px 0"}}>No comments yet.</div>}
                {liveDetail.comments.map((c,i)=>(
                  <div key={i} className="cmt">
                    <div className="cmt-head">
                      <div className="cmt-av">{c.av}</div>
                      <span className="cmt-name">{c.name}</span>
                      <span className="cmt-time">{c.time}</span>
                    </div>
                    <div className="cmt-text">{c.text}</div>
                  </div>
                ))}
                <div className="cmt-box">
                  <textarea className="cmt-ta" placeholder="Add a comment or note…" value={newCmt} onChange={e=>setNewCmt(e.target.value)}/>
                  <button className="btn btn-p btn-sm" onClick={()=>addCmt(liveDetail.id)}>Post</button>
                </div>
              </div>

              {/* AUDIT TRAIL */}
              <div className="dds">
                <div className="ddst">Audit Trail</div>
                {liveDetail.history.map((h,i)=>(
                  <div key={i} className="hist-item">
                    <div className="hdot"/>
                    <div>
                      <div className="htext">{h.text} — <span style={{color:"var(--b2)"}}>{h.by}</span></div>
                      <div className="htime">{h.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* QUICK ACTIONS */}
              <div className="dds">
                <div className="ddst">Actions</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Re-assigning…")}>👥 Re-assign</button>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Linking design…")}>📐 Link Design</button>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Opening sign-off…")}>✍️ Sign-Off</button>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Schedule view…")}>📅 Schedule</button>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Linking incident…")}>🚨 Incident</button>
                  <button className="btn btn-s btn-sm" onClick={()=>toast_("Adding log…")}>📋 Add Log</button>
                  <button className="btn btn-d btn-sm" onClick={()=>{if(window.confirm("Delete this task?")){setTasks(p=>p.filter(t=>t.id!==liveDetail.id));setDetail(null);toast_("Task deleted.");}}}>🗑 Delete</button>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      {/* ════════════ NEW TASK MODAL ════════════ */}
      {showNew&&(
        <div className="modal-ov" onClick={()=>setShowNew(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">Create New Task</div>
            <div className="modal-sub">Assign and configure a new architect task</div>

            <div className="mf"><div className="ml3">Task Title</div>
              <input className="mi" placeholder="e.g. Level 5 Floor Plan — Block B" value={nt.title} onChange={e=>setNt(p=>({...p,title:e.target.value}))}/>
            </div>

            <div className="mf"><div className="ml3">Description / Scope</div>
              <textarea className="mta" placeholder="Describe scope, deliverables, coordination required…" value={nt.desc} onChange={e=>setNt(p=>({...p,desc:e.target.value}))}/>
            </div>

            <div className="m2">
              <div className="mf"><div className="ml3">Project</div>
                <select className="ms3" value={nt.project} onChange={e=>setNt(p=>({...p,project:e.target.value}))}>
                  {["Skyward Residency","Green Valley Towers"].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="mf"><div className="ml3">Phase / Milestone</div>
                <select className="ms3" value={nt.phase} onChange={e=>setNt(p=>({...p,phase:e.target.value}))}>
                  {PHASES_LIST.slice(1).map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
            </div>

            <div className="m3g">
              <div className="mf"><div className="ml3">Priority</div>
                <select className="ms3" value={nt.priority} onChange={e=>setNt(p=>({...p,priority:e.target.value}))}>
                  {["Urgent","High","Medium","Low"].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="mf"><div className="ml3">Status</div>
                <select className="ms3" value={nt.status} onChange={e=>setNt(p=>({...p,status:e.target.value}))}>
                  {["To Do","In Progress","Under Review"].map(x=><option key={x}>{x}</option>)}
                </select>
              </div>
              <div className="mf"><div className="ml3">Due Date</div>
                <input className="mi" type="date" value={nt.due} onChange={e=>setNt(p=>({...p,due:e.target.value}))}/>
              </div>
            </div>

            <div className="m2">
              <div className="mf"><div className="ml3">Assign To</div>
                <select className="ms3" value={nt.assignee} onChange={e=>setNt(p=>({...p,assignee:e.target.value}))}>
                  {ROLES_LIST.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="mf"><div className="ml3">Sign-Off Required?</div>
                <select className="ms3" value={nt.signoff} onChange={e=>setNt(p=>({...p,signoff:e.target.value}))}>
                  <option>Not Required</option><option>Pending</option>
                </select>
              </div>
            </div>

            <div className="mdiv"/>

            <div className="mf"><div className="ml3">Attach Files</div>
              <div className="upz" onClick={()=>toast_("File picker opened…")}>
                <div className="upz-icon">📎</div>
                <div className="upz-text">Click to attach files</div>
                <div className="upz-sub">DWG · PDF · SKP · JPG · PNG · XLSX</div>
              </div>
            </div>

            <div className="mf"><div className="ml3">Link to</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {["📐 Drawing","⚠️ RFI","📋 Daily Log","🚨 Incident","✍️ Sign-Off","📅 Schedule"].map(l=>(
                  <button key={l} className="btn btn-g btn-sm" onClick={()=>toast_(`Linking ${l}…`)}>{l}</button>
                ))}
              </div>
            </div>

            <div className="mf">
              <label style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontSize:12,color:"var(--navy)"}}>
                <input type="checkbox" checked={nt.reminder} onChange={e=>setNt(p=>({...p,reminder:e.target.checked}))}/>
                Send reminder notification on due date
              </label>
            </div>

            <div className="mact">
              <button className="btn btn-g" onClick={()=>setShowNew(false)}>Cancel</button>
              <button className="btn btn-s" onClick={()=>toast_("Saved as draft")}>Save Draft</button>
              <button className="btn btn-p" onClick={()=>{
                if(!nt.title.trim()){toast_("Please enter a task title.");return;}
                const id=`T-${String(tasks.length+1).padStart(3,"0")}`;
                const aName=nt.assignee.split(" (")[0];
                const ini=aName.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase();
                setTasks(p=>[{...nt,id,assignee:aName,initials:ini,progress:0,drawings:[],rfi:[],incidents:[],logs:[],checklist:[],comments:[],history:[{text:"Task created",by:"Arjun K.",time:"Just now"}],attachments:[],role:nt.assignee.split("(")[1]?.replace(")","")?.trim()||"Team"},...p]);
                setShowNew(false);
                setNt({title:"",desc:"",project:"Skyward Residency",phase:"Design Development",status:"To Do",priority:"High",due:"",assignee:"Arjun K. (Lead Architect)",signoff:"Not Required",reminder:false});
                toast_(`Task ${id} created successfully ✓`);
              }}>Create Task →</button>
            </div>
          </div>
        </div>
      )}

      <div className={`toast ${toast.show?"s":"h"}`}>{toast.msg}</div>
    </>
  );
}