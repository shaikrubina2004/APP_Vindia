import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   PALETTE (matches ArchitectDashboard)
   #001D39 · #0A4174 · #49769F · #4E8EA2
   #6EA2B3 · #7BBDE8 · #BDD8E9 · #f0f5f9
───────────────────────────────────────────── */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,400&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --navy:   #001D39;
  --blue1:  #0A4174;
  --blue2:  #49769F;
  --blue3:  #4E8EA2;
  --blue4:  #6EA2B3;
  --blue5:  #7BBDE8;
  --blue6:  #BDD8E9;
  --bg:     #f0f5f9;
  --white:  #ffffff;
  --border: #d0e4f0;
  --border2:#c0d8ec;
  --text:   #001D39;
  --muted:  #6EA2B3;
  --danger: #c0392b;
  --warn:   #e6a817;
  --success:#1c5e35;
  --font-d: 'Fraunces', serif;
  --font-m: 'DM Mono', monospace;
  --r:      12px;
}

body { font-family: var(--font-m); background: var(--bg); color: var(--text); font-size: 13px; line-height: 1.6; }

/* ── PAGE ── */
.atp-root { min-height: 100vh; background: var(--bg); }

/* ── TOPBAR ── */
.atp-topbar {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: 0 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  position: sticky; top: 0; z-index: 20;
}
.atp-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); }
.atp-breadcrumb .crumb-active { color: var(--navy); font-weight: 600; }
.atp-breadcrumb span { color: var(--blue5); }
.atp-topbar-right { display: flex; align-items: center; gap: 10px; }
.atp-proj-badge {
  font-size: 11px; font-weight: 600;
  background: var(--blue6); color: var(--blue1);
  border: 1px solid var(--blue5);
  border-radius: 20px; padding: 4px 14px;
}

/* ── HEADER ── */
.atp-header {
  padding: 28px 36px 0;
  display: flex; align-items: flex-end; justify-content: space-between;
  margin-bottom: 24px;
}
.atp-title { font-family: var(--font-d); font-size: 32px; font-weight: 700; color: var(--navy); letter-spacing: -0.5px; }
.atp-subtitle { font-size: 13px; color: var(--muted); margin-top: 3px; }
.atp-header-right { display: flex; gap: 10px; align-items: center; }

/* ── BUTTONS ── */
.btn {
  font-family: var(--font-m); font-size: 12px; font-weight: 500;
  border-radius: 8px; padding: 8px 16px; border: none; cursor: pointer;
  transition: all .18s; display: inline-flex; align-items: center; gap: 6px;
}
.btn:active { transform: scale(.97); }
.btn-primary { background: linear-gradient(135deg, var(--blue1), var(--navy)); color: #fff; box-shadow: 0 4px 14px rgba(10,65,116,.2); }
.btn-primary:hover { box-shadow: 0 6px 20px rgba(10,65,116,.3); transform: translateY(-1px); }
.btn-secondary { background: var(--white); color: var(--blue1); border: 1px solid var(--border2); }
.btn-secondary:hover { background: var(--bg); border-color: var(--blue5); }
.btn-ghost { background: none; color: var(--muted); border: 1px solid var(--border); }
.btn-ghost:hover { background: var(--bg); color: var(--blue1); border-color: var(--blue5); }

/* ── TABS ── */
.atp-tabs {
  padding: 0 36px;
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 28px;
  background: var(--white);
}
.atp-tab {
  font-family: var(--font-m); font-size: 12px; font-weight: 500;
  padding: 14px 18px; border: none; background: none;
  color: var(--muted); cursor: pointer; border-bottom: 2px solid transparent;
  transition: all .15s; margin-bottom: -1px; white-space: nowrap;
  display: flex; align-items: center; gap: 7px;
}
.atp-tab:hover { color: var(--blue1); }
.atp-tab.active { color: var(--blue1); border-bottom-color: var(--blue1); }
.atp-tab .tab-count {
  font-size: 10px; background: var(--bg); color: var(--blue2);
  border: 1px solid var(--border); border-radius: 10px; padding: 1px 6px;
}
.atp-tab.active .tab-count { background: var(--blue6); border-color: var(--blue5); color: var(--blue1); }

/* ── BODY ── */
.atp-body { padding: 0 36px 48px; }

/* ── SUMMARY STRIP ── */
.summary-strip {
  display: grid; grid-template-columns: repeat(5,1fr); gap: 14px; margin-bottom: 24px;
}
.sum-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: var(--r); padding: 16px 20px;
  transition: box-shadow .2s, transform .2s;
}
.sum-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,29,57,.08); }
.sum-label { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.sum-val { font-family: var(--font-d); font-size: 28px; font-weight: 700; color: var(--navy); line-height: 1; }
.sum-meta { font-size: 11px; color: var(--muted); margin-top: 5px; }
.sum-bar { height: 3px; border-radius: 2px; background: var(--border); margin-top: 10px; overflow: hidden; }
.sum-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--blue3), var(--blue5)); transition: width .6s ease; }

/* ── FILTERS ── */
.atp-filters {
  display: flex; align-items: center; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
}
.atp-search {
  flex: 1; min-width: 200px; max-width: 320px;
  background: var(--white); border: 1px solid var(--border2);
  border-radius: 8px; padding: 8px 14px;
  font-family: var(--font-m); font-size: 12px; color: var(--navy);
  outline: none; transition: border-color .15s;
}
.atp-search:focus { border-color: var(--blue5); box-shadow: 0 0 0 3px rgba(123,189,232,.12); }
.atp-search::placeholder { color: var(--muted); }
.atp-select {
  background: var(--white); border: 1px solid var(--border2);
  border-radius: 8px; padding: 8px 12px;
  font-family: var(--font-m); font-size: 12px; color: var(--navy);
  outline: none; cursor: pointer;
}
.filter-chip {
  font-size: 11px; font-weight: 600; padding: 5px 12px;
  border-radius: 20px; border: 1px solid var(--border);
  background: var(--white); color: var(--muted);
  cursor: pointer; transition: all .15s;
}
.filter-chip:hover, .filter-chip.active {
  background: var(--blue1); color: var(--white); border-color: var(--blue1);
}

/* ── TASK TABLE ── */
.task-table { width: 100%; border-collapse: collapse; }
.task-table-wrap {
  background: var(--white); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden; margin-bottom: 20px;
}
.task-table thead tr { background: var(--bg); border-bottom: 1px solid var(--border); }
.task-table th {
  font-size: 10px; font-weight: 700; letter-spacing: .1em;
  text-transform: uppercase; color: var(--muted);
  padding: 12px 16px; text-align: left; white-space: nowrap;
}
.task-table th:first-child { padding-left: 20px; }
.task-table td { padding: 13px 16px; border-bottom: 1px solid #f0f7fc; vertical-align: middle; }
.task-table td:first-child { padding-left: 20px; }
.task-table tr:last-child td { border-bottom: none; }
.task-table tbody tr { transition: background .12s; cursor: pointer; }
.task-table tbody tr:hover { background: rgba(123,189,232,.04); }

/* task status badges */
.t-status {
  font-size: 10px; font-weight: 600; padding: 3px 9px;
  border-radius: 6px; white-space: nowrap;
}
.ts-not-started  { background: #f4f6f9;  color: #49769F;  border: 1px solid #d0e4f0; }
.ts-in-progress  { background: #e6f0fa;  color: #0A4174;  border: 1px solid #7BBDE8; }
.ts-in-review    { background: #fef9ec;  color: #7a5200;  border: 1px solid #f5e0a0; }
.ts-completed    { background: #eaf4ee;  color: #1c5e35;  border: 1px solid #a8d9b8; }
.ts-overdue      { background: #fdecea;  color: #9b2219;  border: 1px solid #f5c6c1; }
.ts-on-hold      { background: #f4f0fa;  color: #4a3b8c;  border: 1px solid #c5b8e8; }
.ts-blocked      { background: #fff3e0;  color: #8a4500;  border: 1px solid #ffcc80; }

/* priority dots */
.prio-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
.prio-high   { background: var(--danger); }
.prio-medium { background: var(--warn); }
.prio-low    { background: var(--blue3); }

/* task name cell */
.t-name { font-size: 13px; font-weight: 500; color: var(--navy); }
.t-sub  { font-size: 11px; color: var(--muted); margin-top: 2px; }
.t-done .t-name { text-decoration: line-through; color: var(--muted); }

/* assignee pill */
.assignee-pill {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--bg); border: 1px solid var(--border);
  border-radius: 20px; padding: 3px 10px 3px 4px; font-size: 11px; color: var(--blue1);
}
.av {
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--blue6); color: var(--blue1);
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* progress bar inline */
.prog-wrap { width: 80px; }
.prog-bar { height: 5px; border-radius: 3px; background: var(--border); overflow: hidden; }
.prog-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--blue3), var(--blue5)); }
.prog-label { font-size: 10px; color: var(--muted); margin-top: 3px; text-align: right; }

/* due date */
.due-date { font-size: 12px; font-weight: 500; }
.due-overdue { color: var(--danger); }
.due-soon    { color: var(--warn); }
.due-ok      { color: var(--blue2); }

/* ── KANBAN ── */
.kanban-board { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }
.kb-col {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--r); padding: 14px;
  min-height: 400px;
}
.kb-col-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.kb-col-title { font-size: 12px; font-weight: 700; color: var(--navy); display: flex; align-items: center; gap: 8px; }
.kb-col-count {
  font-size: 10px; background: var(--white); border: 1px solid var(--border);
  color: var(--muted); border-radius: 10px; padding: 1px 7px;
}
.kb-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: 9px; padding: 14px; margin-bottom: 10px;
  cursor: pointer; transition: box-shadow .15s, transform .15s;
}
.kb-card:hover { box-shadow: 0 6px 20px rgba(0,29,57,.08); transform: translateY(-2px); }
.kb-card-title { font-size: 12px; font-weight: 600; color: var(--navy); margin-bottom: 6px; line-height: 1.4; }
.kb-card-sub { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.kb-card-foot { display: flex; align-items: center; justify-content: space-between; }
.kb-tag {
  font-size: 10px; padding: 2px 7px; border-radius: 4px;
  background: var(--bg); color: var(--blue2); border: 1px solid var(--border);
}
.kb-due { font-size: 10px; color: var(--muted); }

/* ── GANTT ── */
.gantt-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; margin-bottom: 20px; }
.gantt-head { display: flex; border-bottom: 1px solid var(--border); background: var(--bg); }
.gantt-label-col { width: 240px; flex-shrink: 0; padding: 10px 16px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.gantt-timeline { flex: 1; display: grid; }
.gantt-week { font-size: 10px; color: var(--muted); padding: 10px 0; text-align: center; border-left: 1px solid var(--border); }
.gantt-row { display: flex; border-bottom: 1px solid #f0f7fc; align-items: center; }
.gantt-row:last-child { border-bottom: none; }
.gantt-row:hover { background: rgba(123,189,232,.03); }
.gantt-row-label { width: 240px; flex-shrink: 0; padding: 10px 16px; }
.gantt-row-name { font-size: 12px; font-weight: 500; color: var(--navy); }
.gantt-row-sub { font-size: 10px; color: var(--muted); }
.gantt-cells { flex: 1; position: relative; height: 48px; }
.gantt-bar {
  position: absolute; top: 50%; transform: translateY(-50%);
  height: 20px; border-radius: 5px;
  background: linear-gradient(90deg, var(--blue1), var(--blue3));
  display: flex; align-items: center; padding: 0 8px;
  font-size: 10px; color: #fff; font-weight: 500; white-space: nowrap; overflow: hidden;
  cursor: pointer; transition: opacity .15s;
}
.gantt-bar:hover { opacity: .85; }
.gantt-bar.completed { background: linear-gradient(90deg, #1c5e35, #2d8a50); }
.gantt-bar.overdue   { background: linear-gradient(90deg, #9b2219, #c0392b); }
.gantt-bar.on-hold   { background: linear-gradient(90deg, #4a3b8c, #6a5acd); opacity: .7; }
.gantt-today-line { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--danger); opacity: .4; z-index: 2; }

/* ── DRAWINGS / SUBMISSIONS ── */
.drawing-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.drawing-card {
  background: var(--white); border: 1px solid var(--border);
  border-radius: var(--r); overflow: hidden;
  transition: box-shadow .2s, transform .2s; cursor: pointer;
}
.drawing-card:hover { box-shadow: 0 8px 28px rgba(0,29,57,.1); transform: translateY(-3px); }
.drawing-thumb {
  height: 110px; background: linear-gradient(135deg, var(--bg) 0%, var(--blue6) 100%);
  display: flex; align-items: center; justify-content: center;
  border-bottom: 1px solid var(--border); position: relative;
}
.drawing-icon { font-size: 36px; opacity: .6; }
.drawing-rev {
  position: absolute; top: 8px; right: 8px;
  font-size: 10px; font-weight: 700; background: var(--white);
  color: var(--blue1); border: 1px solid var(--blue5);
  border-radius: 4px; padding: 2px 7px; font-family: var(--font-m);
}
.drawing-body { padding: 14px 16px; }
.drawing-title { font-size: 13px; font-weight: 600; color: var(--navy); margin-bottom: 3px; }
.drawing-meta  { font-size: 11px; color: var(--muted); margin-bottom: 10px; }
.drawing-foot  { display: flex; align-items: center; justify-content: space-between; }

/* ── RFI TRACKER ── */
.rfi-table-wrap { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
.rfi-table { width: 100%; border-collapse: collapse; }
.rfi-table thead tr { background: var(--bg); border-bottom: 1px solid var(--border); }
.rfi-table th { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 11px 16px; text-align: left; }
.rfi-table td { padding: 12px 16px; border-bottom: 1px solid #f0f7fc; font-size: 12px; }
.rfi-table tr:last-child td { border-bottom: none; }
.rfi-table tbody tr { transition: background .12s; cursor: pointer; }
.rfi-table tbody tr:hover { background: rgba(123,189,232,.04); }
.rfi-id { font-family: var(--font-m); color: var(--blue1); font-size: 11px; font-weight: 600; }
.rfi-status { font-size: 10px; font-weight: 600; padding: 3px 9px; border-radius: 6px; }
.rfi-open     { background: #e6f0fa; color: #0A4174; border: 1px solid #7BBDE8; }
.rfi-pending  { background: #fef9ec; color: #7a5200; border: 1px solid #f5e0a0; }
.rfi-answered { background: #eaf4ee; color: #1c5e35; border: 1px solid #a8d9b8; }
.rfi-overdue  { background: #fdecea; color: #9b2219; border: 1px solid #f5c6c1; }
.urgency-high   { color: var(--danger); font-weight: 700; }
.urgency-medium { color: var(--warn);   font-weight: 600; }
.urgency-low    { color: var(--blue3);  font-weight: 500; }

/* ── REVIEW / APPROVAL ── */
.review-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.review-card { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); padding: 18px 20px; }
.review-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
.review-title { font-size: 13px; font-weight: 600; color: var(--navy); }
.review-sub   { font-size: 11px; color: var(--muted); margin-top: 2px; }
.review-steps { display: flex; flex-direction: column; gap: 8px; }
.review-step  { display: flex; align-items: center; gap: 10px; }
.step-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.step-done    { background: #1c5e35; }
.step-current { background: var(--blue1); box-shadow: 0 0 0 3px rgba(10,65,116,.2); }
.step-pending { background: var(--border); }
.step-label   { font-size: 12px; color: var(--navy); }
.step-sub     { font-size: 10px; color: var(--muted); }

/* ── MODAL ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,29,57,.45);
  display: flex; align-items: center; justify-content: center; z-index: 50;
  backdrop-filter: blur(3px);
}
.modal-box {
  background: var(--white); border: 1px solid var(--border2);
  border-radius: 16px; padding: 28px; width: 540px; max-width: 90vw;
  max-height: 85vh; overflow-y: auto;
}
.modal-title { font-family: var(--font-d); font-size: 20px; font-weight: 700; color: var(--navy); margin-bottom: 4px; }
.modal-sub   { font-size: 12px; color: var(--muted); margin-bottom: 20px; }
.modal-field { margin-bottom: 16px; }
.modal-label { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 5px; }
.modal-input, .modal-select, .modal-textarea {
  width: 100%; background: var(--bg); border: 1px solid var(--border2);
  border-radius: 8px; padding: 9px 12px;
  font-family: var(--font-m); font-size: 12px; color: var(--navy);
  outline: none; transition: border-color .15s;
}
.modal-input:focus, .modal-select:focus, .modal-textarea:focus {
  border-color: var(--blue5); box-shadow: 0 0 0 3px rgba(123,189,232,.12);
}
.modal-textarea { resize: vertical; min-height: 80px; }
.modal-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.modal-divider { height: 1px; background: var(--border); margin: 16px 0; }

/* ── PANEL ── */
.panel { background: var(--white); border: 1px solid var(--border); border-radius: var(--r); margin-bottom: 20px; }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
.panel-title { font-size: 14px; font-weight: 600; color: var(--navy); display: flex; align-items: center; gap: 10px; }
.panel-badge { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 12px; }
.pb-danger  { background: #fdecea; color: #9b2219; border: 1px solid #f5c6c1; }
.pb-warn    { background: #fef9ec; color: #7a5200; border: 1px solid #f5e0a0; }
.pb-success { background: #eaf4ee; color: #1c5e35; border: 1px solid #a8d9b8; }
.pb-blue    { background: #e6f0fa; color: #0A4174; border: 1px solid #7BBDE8; }

/* ── CHECKLIST ── */
.checklist-item {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 20px; border-bottom: 1px solid #f0f7fc;
  transition: background .12s; cursor: pointer;
}
.checklist-item:hover { background: rgba(123,189,232,.04); }
.checklist-item:last-child { border-bottom: none; }
.cl-check {
  width: 18px; height: 18px; border-radius: 5px;
  border: 2px solid var(--blue5); background: #fff;
  flex-shrink: 0; margin-top: 2px; position: relative;
  cursor: pointer; transition: all .15s;
}
.cl-check.done { background: var(--blue1); border-color: var(--blue1); }
.cl-check.done::after {
  content: ''; position: absolute; top: 2px; left: 4px;
  width: 6px; height: 9px; border: 2px solid #fff;
  border-top: none; border-left: none; transform: rotate(45deg);
}
.cl-body { flex: 1; }
.cl-title { font-size: 13px; font-weight: 500; color: var(--navy); }
.cl-title.done { text-decoration: line-through; color: var(--muted); }
.cl-meta  { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* ── TOAST ── */
.toast {
  position: fixed; bottom: 24px; right: 24px;
  background: var(--navy); color: #fff;
  font-family: var(--font-m); font-size: 12px;
  padding: 11px 18px; border-radius: 9px; z-index: 100;
  pointer-events: none; transition: opacity .3s, transform .3s;
  box-shadow: 0 8px 24px rgba(0,29,57,.3);
}
.toast.hidden { opacity: 0; transform: translateY(8px); }
.toast.show   { opacity: 1; transform: translateY(0); }

/* SCROLLBAR */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--blue5); border-radius: 3px; }

/* ANIMATIONS */
@keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
.atp-body > * { animation: fadeUp .35s ease both; }
`;

/* ─── DATA ─────────────────────────────────────── */

const TASKS = [
  { id:"T-001", name:"Prepare Level 4 Floor Plan", sub:"Block A · Phase 1", phase:"Design Development", priority:"HIGH", status:"In Progress", assignee:"Arjun K.", initials:"AK", progress:65, due:"2026-04-22", discipline:"Architecture", drawings:3, rfi:1 },
  { id:"T-002", name:"Facade Material Specification", sub:"South Wing · Curtain Wall", phase:"Design Development", priority:"HIGH", status:"In Review", assignee:"S. Mehta", initials:"SM", progress:90, due:"2026-04-20", discipline:"Architecture", drawings:2, rfi:0 },
  { id:"T-003", name:"Staircase Detail Drawing — Core B", sub:"Structural Coordination", phase:"Construction Docs", priority:"MEDIUM", status:"Not Started", assignee:"P. Rao", initials:"PR", progress:0, due:"2026-04-28", discipline:"Architecture", drawings:0, rfi:2 },
  { id:"T-004", name:"Roof Drainage Layout", sub:"MEP Interface", phase:"Construction Docs", priority:"MEDIUM", status:"In Progress", assignee:"T. Kumar", initials:"TK", progress:40, due:"2026-04-25", discipline:"Architecture", drawings:1, rfi:1 },
  { id:"T-005", name:"Lobby Interior Finish Schedule", sub:"Client Presentation Package", phase:"Schematic Design", priority:"LOW", status:"Completed", assignee:"A. Jain", initials:"AJ", progress:100, due:"2026-04-15", discipline:"Interiors", drawings:5, rfi:0 },
  { id:"T-006", name:"MEP Coordination — Level 5 Ceiling", sub:"HVAC / Electrical Clash Review", phase:"Construction Docs", priority:"HIGH", status:"Blocked", assignee:"Arjun K.", initials:"AK", progress:30, due:"2026-04-19", discipline:"Coordination", drawings:2, rfi:3 },
  { id:"T-007", name:"Skylight Structural Interface Detail", sub:"Structural Collaboration Required", phase:"Design Development", priority:"HIGH", status:"Overdue", assignee:"S. Mehta", initials:"SM", progress:55, due:"2026-04-14", discipline:"Architecture", drawings:1, rfi:2 },
  { id:"T-008", name:"Parking Level Ventilation Scheme", sub:"Basement B1–B3", phase:"Construction Docs", priority:"LOW", status:"On Hold", assignee:"P. Rao", initials:"PR", progress:20, due:"2026-05-02", discipline:"Coordination", drawings:0, rfi:0 },
  { id:"T-009", name:"Window Schedule — Block B", sub:"Façade Performance Spec", phase:"Design Development", priority:"MEDIUM", status:"In Progress", assignee:"A. Jain", initials:"AJ", progress:70, due:"2026-04-26", discipline:"Architecture", drawings:4, rfi:1 },
  { id:"T-010", name:"Site Plan Update — Phase 2 Boundary", sub:"Survey Data Integration", phase:"Schematic Design", priority:"MEDIUM", status:"Completed", assignee:"T. Kumar", initials:"TK", progress:100, due:"2026-04-10", discipline:"Architecture", drawings:2, rfi:0 },
];

const RFIS = [
  { id:"RFI-041", subject:"Beam depth at Grid B-12 vs ceiling finish clearance", raised:"Structural", to:"Architect", date:"Apr 15", due:"Apr 20", status:"Open", urgency:"HIGH", ref:"T-006" },
  { id:"RFI-038", subject:"Skylight EPDM membrane brand approval", raised:"Contractor", to:"Architect", date:"Apr 12", due:"Apr 18", status:"Overdue", urgency:"HIGH", ref:"T-007" },
  { id:"RFI-035", subject:"Staircase handrail spec — SS vs aluminium", raised:"QA", to:"Architect", date:"Apr 10", due:"Apr 22", status:"Pending", urgency:"MEDIUM", ref:"T-003" },
  { id:"RFI-030", subject:"Lobby reception desk height ADA compliance", raised:"Client", to:"Architect", date:"Apr 8",  due:"Apr 28", status:"Answered", urgency:"LOW", ref:"T-005" },
  { id:"RFI-028", subject:"Window vent size compliance BS EN 12207", raised:"MEP", to:"Architect", date:"Apr 6",  due:"Apr 25", status:"Pending", urgency:"MEDIUM", ref:"T-009" },
  { id:"RFI-022", subject:"Roof drainage outlet sizes — storm return period", raised:"MEP", to:"Architect", date:"Apr 2",  due:"Apr 24", status:"Open", urgency:"MEDIUM", ref:"T-004" },
];

const DRAWINGS = [
  { id:"DWG-A101", title:"Level 4 Floor Plan — Block A", rev:"Rev C", status:"In Review", date:"Apr 17", author:"AK", icon:"📐", type:"Floor Plan", signoff:"Pending" },
  { id:"DWG-A201", title:"Facade Elevation — South Wing", rev:"Rev D", status:"Approved", date:"Apr 14", author:"SM", icon:"🏗️", type:"Elevation", signoff:"Approved" },
  { id:"DWG-A301", title:"Staircase Section — Core B", rev:"Rev A", status:"Draft", date:"Apr 16", author:"PR", icon:"📏", type:"Section", signoff:"Not Submitted" },
  { id:"DWG-A401", title:"Roof Layout Plan", rev:"Rev B", status:"In Review", date:"Apr 15", author:"TK", icon:"🏢", type:"Roof Plan", signoff:"Pending" },
  { id:"DWG-A501", title:"Window Schedule — Block B", rev:"Rev C", status:"In Progress", date:"Apr 17", author:"AJ", icon:"🪟", type:"Schedule", signoff:"Not Submitted" },
  { id:"DWG-A601", title:"Site Plan — Phase 2", rev:"Rev E", status:"Approved", date:"Apr 10", author:"TK", icon:"🗺️", type:"Site Plan", signoff:"Approved" },
];

const GANTT_TASKS = [
  { name:"Schematic Design", sub:"Phase 1",  start:0, span:2, status:"completed" },
  { name:"Level 4 Floor Plan", sub:"T-001",  start:1, span:3, status:"active" },
  { name:"Facade Specification", sub:"T-002",start:1, span:2, status:"active" },
  { name:"MEP Coordination L5", sub:"T-006", start:2, span:2, status:"overdue" },
  { name:"Staircase Detail", sub:"T-003",    start:3, span:2, status:"active" },
  { name:"Window Schedule", sub:"T-009",     start:2, span:3, status:"active" },
  { name:"Roof Drainage", sub:"T-004",       start:3, span:2, status:"active" },
  { name:"Parking Ventilation", sub:"T-008", start:4, span:3, status:"on-hold" },
];

const WEEKS = ["Apr W3","Apr W4","May W1","May W2","May W3","May W4"];

const APPROVAL_ITEMS = [
  {
    title:"Facade Elevation — South Wing", sub:"DWG-A201 · Rev D",
    status:"Approved",
    steps:[
      { label:"Architect Prepared",    sub:"S. Mehta · Apr 14",   done:true },
      { label:"Internal QA Review",    sub:"QA Team · Apr 15",    done:true },
      { label:"Project Manager Review",sub:"PM · Apr 16",         done:true },
      { label:"Client Sign-off",       sub:"Approved · Apr 17",   done:true },
    ]
  },
  {
    title:"Level 4 Floor Plan — Block A", sub:"DWG-A101 · Rev C",
    status:"In Review",
    steps:[
      { label:"Architect Prepared",    sub:"Arjun K. · Apr 16",   done:true },
      { label:"Internal QA Review",    sub:"In Progress",         done:false, current:true },
      { label:"Project Manager Review",sub:"Pending",             done:false },
      { label:"Client Sign-off",       sub:"Pending",             done:false },
    ]
  },
  {
    title:"Staircase Detail — Core B", sub:"DWG-A301 · Rev A",
    status:"Draft",
    steps:[
      { label:"Architect Prepared",    sub:"In Progress",         done:false, current:true },
      { label:"Internal QA Review",    sub:"Pending",             done:false },
      { label:"Project Manager Review",sub:"Pending",             done:false },
      { label:"Client Sign-off",       sub:"Pending",             done:false },
    ]
  },
  {
    title:"Roof Layout Plan", sub:"DWG-A401 · Rev B",
    status:"In Review",
    steps:[
      { label:"Architect Prepared",    sub:"T. Kumar · Apr 15",   done:true },
      { label:"Internal QA Review",    sub:"Completed · Apr 16",  done:true },
      { label:"Project Manager Review",sub:"In Progress",         done:false, current:true },
      { label:"Client Sign-off",       sub:"Pending",             done:false },
    ]
  },
];

const CHECKLIST = [
  { id:1, text:"Upload Rev C drawings for Level 4 to ERP document store", meta:"Due today · T-001", done:false },
  { id:2, text:"Respond to RFI-038 — Skylight membrane brand approval", meta:"OVERDUE · RFI-038", done:false },
  { id:3, text:"Coordinate with MEP on Level 5 ceiling clash resolution", meta:"Due Apr 19 · T-006", done:false },
  { id:4, text:"Submit facade material samples to client", meta:"Due Apr 20 · T-002", done:false },
  { id:5, text:"Review staircase handrail RFI-035 response from QA", meta:"Due Apr 22 · T-003", done:false },
  { id:6, text:"Update window schedule with contractor-confirmed sizes", meta:"Due Apr 26 · T-009", done:true },
  { id:7, text:"Sign off on DWG-A201 internal QA review comments", meta:"Completed Apr 15", done:true },
  { id:8, text:"Archive Phase 1 Schematic Design documents", meta:"Completed Apr 10", done:true },
];

/* ─── STATUS HELPERS ────────────────────────── */
const statusClass = (s) => ({
  "Not Started":  "ts-not-started",
  "In Progress":  "ts-in-progress",
  "In Review":    "ts-in-review",
  "Completed":    "ts-completed",
  "Overdue":      "ts-overdue",
  "On Hold":      "ts-on-hold",
  "Blocked":      "ts-blocked",
}[s] || "ts-not-started");

const rfiStatusClass = (s) => ({
  "Open":     "rfi-open",
  "Pending":  "rfi-pending",
  "Answered": "rfi-answered",
  "Overdue":  "rfi-overdue",
}[s] || "rfi-open");

const drawingStatusClass = (s) => ({
  "Approved":    "ts-completed",
  "In Review":   "ts-in-review",
  "Draft":       "ts-not-started",
  "In Progress": "ts-in-progress",
}[s] || "ts-not-started");

const dueClass = (due) => {
  const d = new Date(due), now = new Date();
  const diff = (d - now) / 86400000;
  if (diff < 0)  return "due-overdue";
  if (diff < 3)  return "due-soon";
  return "due-ok";
};

/* ─── COMPONENT ─────────────────────────────── */
export default function ArchitectTaskPage() {
  const [activeTab, setActiveTab] = useState("Tasks");
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPrio, setFilterPrio]     = useState("All");
  const [filterPhase, setFilterPhase]   = useState("All");
  const [taskDone, setTaskDone]   = useState({});
  const [checkDone, setCheckDone] = useState(
    Object.fromEntries(CHECKLIST.map(c => [c.id, c.done]))
  );
  const [modal, setModal]         = useState(null); // "new-task" | "task-detail"
  const [selectedTask, setSelectedTask] = useState(null);
  const [toast, setToast]         = useState({ msg:"", show:false });
  const [viewMode, setViewMode]   = useState("table"); // table | kanban

  const showToast = (msg) => {
    setToast({ msg, show:true });
    setTimeout(() => setToast(t => ({...t, show:false})), 2800);
  };

  const isTaskDone = (id) => id in taskDone ? taskDone[id] : TASKS.find(t=>t.id===id)?.status==="Completed";

  const filteredTasks = TASKS.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || t.status === filterStatus;
    const matchPrio   = filterPrio   === "All" || t.priority === filterPrio;
    const matchPhase  = filterPhase  === "All" || t.phase === filterPhase;
    return matchSearch && matchStatus && matchPrio && matchPhase;
  });

  const stats = {
    total:      TASKS.length,
    inProgress: TASKS.filter(t=>t.status==="In Progress").length,
    overdue:    TASKS.filter(t=>t.status==="Overdue").length,
    completed:  TASKS.filter(t=>t.status==="Completed").length,
    blocked:    TASKS.filter(t=>t.status==="Blocked").length,
    completePct: Math.round(TASKS.filter(t=>t.status==="Completed").length/TASKS.length*100),
  };

  const TABS = [
    { name:"Tasks",     count: TASKS.length },
    { name:"Kanban",    count: null },
    { name:"Timeline",  count: null },
    { name:"Drawings",  count: DRAWINGS.length },
    { name:"RFI",       count: RFIS.filter(r=>r.status!=="Answered").length },
    { name:"Approvals", count: APPROVAL_ITEMS.filter(a=>a.status!=="Approved").length },
    { name:"Checklist", count: CHECKLIST.filter(c=>!checkDone[c.id]).length },
  ];

  const STATUSES = ["All","Not Started","In Progress","In Review","Completed","Overdue","On Hold","Blocked"];
  const PHASES   = ["All","Schematic Design","Design Development","Construction Docs"];

  /* ── KANBAN COLUMNS ── */
  const KB_COLS = [
    { title:"Not Started", key:"Not Started" },
    { title:"In Progress", key:"In Progress" },
    { title:"In Review",   key:"In Review"   },
    { title:"Completed",   key:"Completed"   },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="atp-root">

        {/* TOP BAR */}
        <div className="atp-topbar">
          <div className="atp-breadcrumb">
            <span>ERP</span><span>›</span>
            <span>Skyward Residency</span><span>›</span>
            <span className="crumb-active">Architect Tasks</span>
          </div>
          <div className="atp-topbar-right">
            <span className="atp-proj-badge">v4.2.1-RELEASE · Phase 1</span>
            <button className="btn btn-primary" onClick={() => setModal("new-task")}>+ New Task</button>
          </div>
        </div>

        {/* HEADER */}
        <div className="atp-header">
          <div>
            <div className="atp-title">Architect Task Board</div>
            <div className="atp-subtitle">Skyward Residency · {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
          <div className="atp-header-right">
            <button className="btn btn-ghost" onClick={() => showToast("Exporting task report…")}>📊 Export</button>
            <button className="btn btn-secondary" onClick={() => showToast("Opening print view…")}>🖨️ Print</button>
          </div>
        </div>

        {/* TABS */}
        <div className="atp-tabs">
          {TABS.map(tab => (
            <button key={tab.name} className={`atp-tab${activeTab===tab.name?" active":""}`} onClick={()=>setActiveTab(tab.name)}>
              {tab.name}
              {tab.count !== null && <span className="tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>

        <div className="atp-body">

          {/* SUMMARY STRIP */}
          <div className="summary-strip">
            <div className="sum-card">
              <div className="sum-label">Total Tasks</div>
              <div className="sum-val">{stats.total}</div>
              <div className="sum-meta">Across all phases</div>
              <div className="sum-bar"><div className="sum-bar-fill" style={{width:"100%"}} /></div>
            </div>
            <div className="sum-card">
              <div className="sum-label">In Progress</div>
              <div className="sum-val">{stats.inProgress}</div>
              <div className="sum-meta">Active work items</div>
              <div className="sum-bar"><div className="sum-bar-fill" style={{width:`${stats.inProgress/stats.total*100}%`}} /></div>
            </div>
            <div className="sum-card">
              <div className="sum-label">Completed</div>
              <div className="sum-val">{stats.completed}</div>
              <div className="sum-meta">{stats.completePct}% of total</div>
              <div className="sum-bar"><div className="sum-bar-fill" style={{width:`${stats.completePct}%`}} /></div>
            </div>
            <div className="sum-card">
              <div className="sum-label">Overdue</div>
              <div className="sum-val" style={{color:"var(--danger)"}}>{stats.overdue}</div>
              <div className="sum-meta">Requires action</div>
              <div className="sum-bar"><div className="sum-bar-fill" style={{width:`${stats.overdue/stats.total*100}%`,background:"linear-gradient(90deg,#c0392b,#e74c3c)"}} /></div>
            </div>
            <div className="sum-card">
              <div className="sum-label">Blocked</div>
              <div className="sum-val" style={{color:"var(--warn)"}}>{stats.blocked}</div>
              <div className="sum-meta">Awaiting resolution</div>
              <div className="sum-bar"><div className="sum-bar-fill" style={{width:`${stats.blocked/stats.total*100}%`,background:"linear-gradient(90deg,#e6a817,#f0c040)"}} /></div>
            </div>
          </div>

          {/* ── TASKS TAB ── */}
          {activeTab === "Tasks" && (
            <>
              {/* FILTERS */}
              <div className="atp-filters">
                <input className="atp-search" placeholder="Search tasks, IDs…" value={search} onChange={e=>setSearch(e.target.value)} />
                <select className="atp-select" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
                <select className="atp-select" value={filterPhase} onChange={e=>setFilterPhase(e.target.value)}>
                  {PHASES.map(p=><option key={p}>{p}</option>)}
                </select>
                {["HIGH","MEDIUM","LOW"].map(p=>(
                  <button key={p} className={`filter-chip${filterPrio===p?" active":""}`} onClick={()=>setFilterPrio(filterPrio===p?"All":p)}>{p}</button>
                ))}
                <span style={{marginLeft:"auto",fontSize:11,color:"var(--muted)"}}>{filteredTasks.length} tasks</span>
              </div>

              {/* TABLE */}
              <div className="task-table-wrap">
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Task</th>
                      <th>Phase</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th>Progress</th>
                      <th>Due</th>
                      <th>Drawings</th>
                      <th>RFI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.map(task => {
                      const done = isTaskDone(task.id);
                      return (
                        <tr key={task.id} className={done?"t-done":""} onClick={()=>{setSelectedTask(task);setModal("task-detail");}}>
                          <td><span style={{fontFamily:"var(--font-m)",fontSize:11,color:"var(--blue1)",fontWeight:600}}>{task.id}</span></td>
                          <td>
                            <div className={`t-name${done?" done":""}`}>{task.name}</div>
                            <div className="t-sub">{task.sub}</div>
                          </td>
                          <td><span style={{fontSize:11,color:"var(--blue2)"}}>{task.phase}</span></td>
                          <td>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <span className={`prio-dot prio-${task.priority.toLowerCase()}`} />
                              <span style={{fontSize:11,fontWeight:600,color:task.priority==="HIGH"?"var(--danger)":task.priority==="MEDIUM"?"var(--warn)":"var(--blue3)"}}>{task.priority}</span>
                            </div>
                          </td>
                          <td><span className={`t-status ${statusClass(task.status)}`}>{task.status}</span></td>
                          <td>
                            <div className="assignee-pill">
                              <div className="av">{task.initials}</div>
                              {task.assignee}
                            </div>
                          </td>
                          <td>
                            <div className="prog-wrap">
                              <div className="prog-bar"><div className="prog-fill" style={{width:`${task.progress}%`}} /></div>
                              <div className="prog-label">{task.progress}%</div>
                            </div>
                          </td>
                          <td><span className={`due-date ${dueClass(task.due)}`}>{task.due}</span></td>
                          <td><span style={{fontSize:11,color:task.drawings>0?"var(--blue1)":"var(--muted)"}}>{task.drawings > 0 ? `📐 ${task.drawings}` : "—"}</span></td>
                          <td><span style={{fontSize:11,color:task.rfi>0?"var(--danger)":"var(--muted)"}}>{task.rfi > 0 ? `⚠️ ${task.rfi}` : "—"}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── KANBAN TAB ── */}
          {activeTab === "Kanban" && (
            <div className="kanban-board">
              {KB_COLS.map(col => {
                const colTasks = TASKS.filter(t => t.status === col.key);
                return (
                  <div key={col.key} className="kb-col">
                    <div className="kb-col-head">
                      <div className="kb-col-title">
                        {col.title}
                        <span className="kb-col-count">{colTasks.length}</span>
                      </div>
                      <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:11}} onClick={()=>showToast(`Add task to ${col.title}…`)}>+</button>
                    </div>
                    {colTasks.map(task=>(
                      <div key={task.id} className="kb-card" onClick={()=>{setSelectedTask(task);setModal("task-detail");}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                          <span className={`prio-dot prio-${task.priority.toLowerCase()}`} />
                          <span style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--font-m)"}}>{task.id}</span>
                        </div>
                        <div className="kb-card-title">{task.name}</div>
                        <div className="kb-card-sub">{task.sub}</div>
                        <div className="prog-bar" style={{marginBottom:10}}><div className="prog-fill" style={{width:`${task.progress}%`}} /></div>
                        <div className="kb-card-foot">
                          <div className="assignee-pill" style={{fontSize:10}}>
                            <div className="av" style={{width:18,height:18,fontSize:8}}>{task.initials}</div>
                            {task.assignee}
                          </div>
                          <span className="kb-due">{task.due}</span>
                        </div>
                        {task.rfi > 0 && <div style={{marginTop:8,fontSize:10,color:"var(--danger)"}}>⚠️ {task.rfi} RFI open</div>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeTab === "Timeline" && (
            <div className="gantt-wrap">
              <div className="gantt-head">
                <div className="gantt-label-col">Task</div>
                <div className="gantt-timeline" style={{gridTemplateColumns:`repeat(${WEEKS.length},1fr)`}}>
                  {WEEKS.map(w=><div key={w} className="gantt-week">{w}</div>)}
                </div>
              </div>
              {GANTT_TASKS.map((task,i)=>(
                <div key={i} className="gantt-row">
                  <div className="gantt-row-label">
                    <div className="gantt-row-name">{task.name}</div>
                    <div className="gantt-row-sub">{task.sub}</div>
                  </div>
                  <div className="gantt-cells" style={{display:"grid",gridTemplateColumns:`repeat(${WEEKS.length},1fr)`}}>
                    {/* today line at week 1 */}
                    <div className="gantt-today-line" style={{left:`${(1/WEEKS.length)*100+2}%`}} />
                    <div
                      className={`gantt-bar ${task.status==="completed"?"completed":task.status==="overdue"?"overdue":task.status==="on-hold"?"on-hold":""}`}
                      style={{
                        left:`${(task.start/WEEKS.length)*100}%`,
                        width:`${(task.span/WEEKS.length)*100 - 1}%`,
                      }}
                      onClick={() => showToast(`${task.name} — click to edit timeline`)}
                    >
                      {task.name}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{padding:"12px 16px",borderTop:"1px solid var(--border)",display:"flex",gap:16,fontSize:11,color:"var(--muted)"}}>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,borderRadius:3,background:"linear-gradient(90deg,var(--blue1),var(--blue3))",display:"inline-block"}}/> Active</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,borderRadius:3,background:"linear-gradient(90deg,#1c5e35,#2d8a50)",display:"inline-block"}}/> Completed</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,borderRadius:3,background:"linear-gradient(90deg,#9b2219,#c0392b)",display:"inline-block"}}/> Overdue</span>
                <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:12,height:8,borderRadius:3,background:"linear-gradient(90deg,#4a3b8c,#6a5acd)",display:"inline-block"}}/> On Hold</span>
                <span style={{display:"flex",alignItems:"center",gap:5,color:"var(--danger)"}}><span style={{width:1,height:14,background:"var(--danger)",display:"inline-block",opacity:.5}}/> Today</span>
              </div>
            </div>
          )}

          {/* ── DRAWINGS TAB ── */}
          {activeTab === "Drawings" && (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{fontSize:12,color:"var(--muted)"}}>{DRAWINGS.length} drawing submissions</div>
                <button className="btn btn-primary" onClick={()=>showToast("Opening upload form…")}>+ Upload Drawing</button>
              </div>
              <div className="drawing-grid">
                {DRAWINGS.map(d=>(
                  <div key={d.id} className="drawing-card" onClick={()=>showToast(`Opening ${d.title}…`)}>
                    <div className="drawing-thumb">
                      <span className="drawing-icon">{d.icon}</span>
                      <span className="drawing-rev">{d.rev}</span>
                    </div>
                    <div className="drawing-body">
                      <div className="drawing-title">{d.title}</div>
                      <div className="drawing-meta">{d.id} · {d.type} · {d.author} · {d.date}</div>
                      <div className="drawing-foot">
                        <span className={`t-status ${drawingStatusClass(d.status)}`}>{d.status}</span>
                        <span style={{fontSize:11,color:d.signoff==="Approved"?"var(--success)":d.signoff==="Pending"?"var(--warn)":"var(--muted)",fontWeight:600}}>
                          {d.signoff==="Approved"?"✓ Approved":d.signoff==="Pending"?"⏳ Pending":"Not Submitted"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── RFI TAB ── */}
          {activeTab === "RFI" && (
            <>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                <div style={{display:"flex",gap:12}}>
                  {["All","Open","Pending","Answered","Overdue"].map(s=>(
                    <button key={s} className="filter-chip" onClick={()=>showToast(`Filter: ${s}`)}>{s}</button>
                  ))}
                </div>
                <button className="btn btn-primary" onClick={()=>showToast("Opening new RFI form…")}>+ Raise RFI</button>
              </div>
              <div className="rfi-table-wrap">
                <table className="rfi-table">
                  <thead>
                    <tr>
                      <th>RFI ID</th>
                      <th>Subject</th>
                      <th>Raised By</th>
                      <th>Directed To</th>
                      <th>Raised</th>
                      <th>Due</th>
                      <th>Urgency</th>
                      <th>Status</th>
                      <th>Ref Task</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RFIS.map(rfi=>(
                      <tr key={rfi.id} onClick={()=>showToast(`Opening ${rfi.id}…`)}>
                        <td className="rfi-id">{rfi.id}</td>
                        <td style={{maxWidth:260,fontSize:12}}>{rfi.subject}</td>
                        <td style={{fontSize:11,color:"var(--muted)"}}>{rfi.raised}</td>
                        <td style={{fontSize:11,color:"var(--blue1)",fontWeight:600}}>{rfi.to}</td>
                        <td style={{fontSize:11,color:"var(--muted)"}}>{rfi.date}</td>
                        <td><span className={`due-date ${rfi.status==="Overdue"?"due-overdue":"due-ok"}`} style={{fontSize:12}}>{rfi.due}</span></td>
                        <td><span className={`urgency-${rfi.urgency.toLowerCase()}`} style={{fontSize:11}}>{rfi.urgency}</span></td>
                        <td><span className={`rfi-status ${rfiStatusClass(rfi.status)}`}>{rfi.status}</span></td>
                        <td><span style={{fontSize:11,fontFamily:"var(--font-m)",color:"var(--blue2)"}}>{rfi.ref}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── APPROVALS TAB ── */}
          {activeTab === "Approvals" && (
            <>
              <div style={{marginBottom:16,fontSize:12,color:"var(--muted)"}}>
                {APPROVAL_ITEMS.filter(a=>a.status!=="Approved").length} items pending approval
              </div>
              <div className="review-grid">
                {APPROVAL_ITEMS.map((item,i)=>(
                  <div key={i} className="review-card">
                    <div className="review-card-head">
                      <div>
                        <div className="review-title">{item.title}</div>
                        <div className="review-sub">{item.sub}</div>
                      </div>
                      <span className={`t-status ${drawingStatusClass(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="review-steps">
                      {item.steps.map((step,j)=>(
                        <div key={j} className="review-step">
                          <div className={`step-dot ${step.done?"step-done":step.current?"step-current":"step-pending"}`} />
                          <div>
                            <div className="step-label" style={{color:step.done?"var(--success)":step.current?"var(--blue1)":"var(--muted)",fontWeight:step.current?600:400}}>{step.label}</div>
                            <div className="step-sub">{step.sub}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {item.status !== "Approved" && (
                      <button className="btn btn-primary" style={{marginTop:14,width:"100%",justifyContent:"center"}} onClick={()=>showToast(`Actioning approval for ${item.title}…`)}>
                        Take Action →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── CHECKLIST TAB ── */}
          {activeTab === "Checklist" && (
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">
                  Architect Action Checklist
                  <span className="panel-badge pb-danger">{CHECKLIST.filter(c=>!checkDone[c.id]).length} pending</span>
                </div>
                <button className="btn btn-secondary" onClick={()=>showToast("Adding checklist item…")}>+ Add Item</button>
              </div>
              {CHECKLIST.map(item=>(
                <div key={item.id} className="checklist-item" onClick={()=>setCheckDone(prev=>({...prev,[item.id]:!prev[item.id]}))}>
                  <div className={`cl-check${checkDone[item.id]?" done":""}`} />
                  <div className="cl-body">
                    <div className={`cl-title${checkDone[item.id]?" done":""}`}>{item.text}</div>
                    <div className="cl-meta">{item.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── NEW TASK MODAL ── */}
      {modal === "new-task" && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">New Architect Task</div>
            <div className="modal-sub">Skyward Residency · Phase 1</div>

            <div className="modal-field">
              <div className="modal-label">Task Name</div>
              <input className="modal-input" placeholder="e.g. Level 5 Floor Plan — Block B" />
            </div>

            <div className="modal-two">
              <div className="modal-field">
                <div className="modal-label">Phase</div>
                <select className="modal-select">
                  {PHASES.slice(1).map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="modal-field">
                <div className="modal-label">Discipline</div>
                <select className="modal-select">
                  {["Architecture","Coordination","Interiors","Structural Interface"].map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="modal-two">
              <div className="modal-field">
                <div className="modal-label">Priority</div>
                <select className="modal-select">
                  <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
                </select>
              </div>
              <div className="modal-field">
                <div className="modal-label">Due Date</div>
                <input className="modal-input" type="date" />
              </div>
            </div>

            <div className="modal-field">
              <div className="modal-label">Assign To</div>
              <select className="modal-select">
                {["Arjun K. (AK)","S. Mehta (SM)","P. Rao (PR)","T. Kumar (TK)","A. Jain (AJ)"].map(a=><option key={a}>{a}</option>)}
              </select>
            </div>

            <div className="modal-field">
              <div className="modal-label">Description / Scope</div>
              <textarea className="modal-textarea" placeholder="Describe the task scope, deliverables, and any coordination required…" />
            </div>

            <div className="modal-two">
              <div className="modal-field">
                <div className="modal-label">Linked Drawing</div>
                <input className="modal-input" placeholder="DWG-A…" />
              </div>
              <div className="modal-field">
                <div className="modal-label">Linked RFI</div>
                <input className="modal-input" placeholder="RFI-…" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>{setModal(null);showToast("Task created successfully ✓");}}>Create Task →</button>
            </div>
          </div>
        </div>
      )}

      {/* ── TASK DETAIL MODAL ── */}
      {modal === "task-detail" && selectedTask && (
        <div className="modal-overlay" onClick={()=>setModal(null)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
              <div>
                <div style={{fontSize:11,fontFamily:"var(--font-m)",color:"var(--blue1)",marginBottom:4}}>{selectedTask.id}</div>
                <div className="modal-title">{selectedTask.name}</div>
              </div>
              <span className={`t-status ${statusClass(selectedTask.status)}`}>{selectedTask.status}</span>
            </div>
            <div className="modal-sub">{selectedTask.sub} · {selectedTask.phase}</div>

            <div className="modal-divider"/>

            <div className="modal-two">
              <div><div className="modal-label">Assignee</div>
                <div className="assignee-pill" style={{marginTop:4}}>
                  <div className="av">{selectedTask.initials}</div>{selectedTask.assignee}
                </div>
              </div>
              <div><div className="modal-label">Priority</div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                  <span className={`prio-dot prio-${selectedTask.priority.toLowerCase()}`}/>
                  <span style={{fontSize:12,fontWeight:600,color:selectedTask.priority==="HIGH"?"var(--danger)":selectedTask.priority==="MEDIUM"?"var(--warn)":"var(--blue3)"}}>{selectedTask.priority}</span>
                </div>
              </div>
            </div>

            <div className="modal-two" style={{marginTop:14}}>
              <div><div className="modal-label">Due Date</div>
                <div className={`due-date ${dueClass(selectedTask.due)}`} style={{marginTop:4,fontSize:13}}>{selectedTask.due}</div>
              </div>
              <div><div className="modal-label">Discipline</div>
                <div style={{marginTop:4,fontSize:12,color:"var(--blue2)"}}>{selectedTask.discipline}</div>
              </div>
            </div>

            <div style={{marginTop:14}}>
              <div className="modal-label">Progress</div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginTop:6}}>
                <div className="prog-bar" style={{flex:1,height:8}}>
                  <div className="prog-fill" style={{width:`${selectedTask.progress}%`,height:"100%"}}/>
                </div>
                <span style={{fontSize:12,fontWeight:600,color:"var(--blue1)",minWidth:32}}>{selectedTask.progress}%</span>
              </div>
            </div>

            <div className="modal-divider"/>

            <div className="modal-two">
              <div>
                <div className="modal-label">Drawings Linked</div>
                <div style={{marginTop:4,fontSize:13,color:selectedTask.drawings>0?"var(--blue1)":"var(--muted)",fontWeight:600}}>
                  {selectedTask.drawings > 0 ? `📐 ${selectedTask.drawings} drawings` : "None"}
                </div>
              </div>
              <div>
                <div className="modal-label">Open RFIs</div>
                <div style={{marginTop:4,fontSize:13,color:selectedTask.rfi>0?"var(--danger)":"var(--muted)",fontWeight:600}}>
                  {selectedTask.rfi > 0 ? `⚠️ ${selectedTask.rfi} open` : "None"}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Close</button>
              <button className="btn btn-secondary" onClick={()=>{setModal(null);showToast(`RFI raised for ${selectedTask.id}`);}}>Raise RFI</button>
              <button className="btn btn-primary" onClick={()=>{setModal(null);showToast(`${selectedTask.id} updated ✓`);}}>Update Task →</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`toast ${toast.show?"show":"hidden"}`}>{toast.msg}</div>
    </>
  );
}