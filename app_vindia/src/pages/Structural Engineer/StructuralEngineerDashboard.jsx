/* eslint-disable no-unused-vars */
// StructuralEngineerDashboard.jsx
// Full Structural Engineer portal as a React component
// Place this file at: src/pages/Structural Engineer/StructuralEngineerDashboard.jsx
// Place CSS at:       src/pages/Structural Engineer/StructuralEngineerDashboard.css

import React, { useState, useCallback } from 'react';
import './StructuralEngineerDashboard.css';

/* ============================================================
   STATIC DATA
   ============================================================ */
const DOCS_DATA = [
  { name: 'Foundation Layout',         type: 'dwg',  ver: 'v4', date: 'Today 10:30',  by: 'Rajesh S.', shared: 'Arch · MEP · Site', milestone: 'M2' },
  { name: 'Column Schedule — Lvl 1–6', type: 'dwg',  ver: 'v3', date: 'Yesterday',    by: 'Rajesh S.', shared: 'Arch · Coord',      milestone: 'M2' },
  { name: 'Beam Layout — Typical Flr', type: 'dwg',  ver: 'v2', date: 'Dec 18',       by: 'Rajesh S.', shared: 'Arch · MEP',        milestone: 'M2' },
  { name: 'Shear Wall Reinf. Plan',    type: 'dwg',  ver: 'v5', date: 'Dec 17',       by: 'Rajesh S.', shared: 'Arch · MEP · QS',   milestone: 'M2' },
  { name: 'Slab Reinforcement Detail', type: 'dwg',  ver: 'v2', date: 'Dec 16',       by: 'Rajesh S.', shared: 'Arch · MEP',        milestone: 'M2' },
  { name: 'Structural Calc. Report',   type: 'pdf',  ver: 'v2', date: 'Dec 15',       by: 'Rajesh S.', shared: 'Coord · Client',    milestone: 'M1' },
  { name: 'Pile Cap Reinf. Detail',    type: 'dwg',  ver: 'v3', date: 'Nov 28',       by: 'Rajesh S.', shared: 'Site · MEP',        milestone: 'M1' },
  { name: 'Retaining Wall Design',     type: 'pdf',  ver: 'v1', date: 'Nov 20',       by: 'Rajesh S.', shared: 'Arch · Coord',      milestone: 'M1' },
  { name: 'Steel Quantity Schedule',   type: 'xlsx', ver: 'v1', date: 'Dec 10',       by: 'Rajesh S.', shared: 'QS',                milestone: 'M2' },
  { name: 'Staircase Struct. Detail',  type: 'dwg',  ver: 'v1', date: 'Dec 12',       by: 'Rajesh S.', shared: 'Arch',              milestone: 'M2' },
  { name: 'Lift Pit Struct. Detail',   type: 'dwg',  ver: 'v2', date: 'Dec 8',        by: 'Rajesh S.', shared: 'Arch · MEP',        milestone: 'M2' },
  { name: 'Water Tank Struct. Design', type: 'dwg',  ver: 'v1', date: 'Nov 25',       by: 'Rajesh S.', shared: 'MEP',               milestone: 'M1' },
];

const INCIDENTS_DATA = [
  { id: 'INC-014', title: 'Beam-MEP duct conflict Level 3',       priority: 'p1', status: 'open',       by: 'Suresh Kumar (MEP)',   assigned: 'You',            due: 'Today 4PM'  },
  { id: 'INC-011', title: 'Shear wall calculation review pending', priority: 'p2', status: 'inprogress', by: 'Arun Tiwari (Coord)',  assigned: 'You',            due: 'Tomorrow'   },
  { id: 'INC-009', title: 'Slab opening size discrepancy Grid C5', priority: 'p3', status: 'open',       by: 'You',                  assigned: 'Priya R. (Arch)', due: 'Dec 28'    },
  { id: 'INC-007', title: 'Column grids misalign Floors 7–9',      priority: 'p2', status: 'inprogress', by: 'You',                  assigned: 'Priya R. (Arch)', due: 'Dec 24'    },
  { id: 'INC-005', title: 'Foundation drawing version mismatch',   priority: 'p1', status: 'closed',     by: 'Ravi M. (Site)',       assigned: 'You',            due: 'Dec 15 ✓'  },
  { id: 'INC-003', title: 'Pile cap dimension confirmation',        priority: 'p3', status: 'closed',     by: 'You',                  assigned: 'Arun T. (Coord)',due: 'Dec 12 ✓'  },
  { id: 'INC-002', title: 'Retaining wall rebar spacing',           priority: 'p2', status: 'closed',     by: 'You',                  assigned: 'You',            due: 'Dec 10 ✓'  },
  { id: 'INC-001', title: 'Initial structural layout approval',     priority: 'p2', status: 'closed',     by: 'Arun T. (Coord)',      assigned: 'You',            due: 'Nov 30 ✓'  },
];

const TASKS_DATA = [
  { id: 'TSK-021', title: 'Review shear wall calculations for M2', priority: 'p2', due: 'Today',  by: 'Arun Tiwari',  mine: true,  done: false },
  { id: 'TSK-020', title: 'Upload revised pile cap details',        priority: 'p1', due: 'Today',  by: 'You (self)',   mine: true,  done: false },
  { id: 'TSK-019', title: 'Coordinate slab openings with MEP',      priority: 'p2', due: 'Dec 22', by: 'Arun Tiwari',  mine: true,  done: false },
  { id: 'TSK-018', title: 'Prepare beam schedule for Floors 4–6',   priority: 'p3', due: 'Dec 26', by: 'You (self)',   mine: true,  done: false },
  { id: 'TSK-017', title: 'Review structural calc report draft',     priority: 'p3', due: 'Dec 30', by: 'Arun Tiwari',  mine: true,  done: false },
  { id: 'TSK-016', title: 'Ask architect to confirm column grid',    priority: 'p2', due: 'Dec 22', assigned: 'Priya R.', mine: false, done: false },
  { id: 'TSK-015', title: 'Share shear wall plan with MEP team',    priority: 'p1', due: 'Dec 21', assigned: 'Suresh K.', mine: false, done: false },
];

const NOTIFS_DATA = [
  { type: 'red',   icon: '⚠',  title: 'P1 Incident assigned to you',          desc: 'INC-014 · Beam-MEP duct conflict on Level 3 — due in 2 hours.', time: '2 hours ago',  read: false },
  { type: 'blue',  icon: '📐', title: 'New drawing version available',          desc: 'Foundation Layout updated to v4. 3 teams notified.',            time: '2 hours ago',  read: false },
  { type: 'amber', icon: '📋', title: 'Task assigned to you',                   desc: 'TSK-021 · Review shear wall calculations. Due today EOD.',       time: '4 hours ago',  read: false },
  { type: 'blue',  icon: '🔗', title: 'Coordination request from MEP',          desc: 'Suresh Kumar requests review of slab opening positions.',        time: '5 hours ago',  read: false },
  { type: 'green', icon: '✓',  title: 'Incident INC-005 closed',               desc: 'Foundation drawing version mismatch — resolved.',                time: 'Yesterday',    read: false },
  { type: 'amber', icon: '⏰', title: 'Milestone M2 starts in 7 days',          desc: 'Podium Structure milestone begins Dec 28.',                      time: 'Yesterday',    read: false },
  { type: 'blue',  icon: '💬', title: 'Comment on INC-011',                    desc: 'Arun Tiwari: "Please prioritise shear wall review before Dec 22."', time: '2 days ago', read: false },
  { type: 'green', icon: '✓',  title: 'Column Schedule v3 opened by Architect', desc: 'Priya Ramesh opened Column Schedule v3 — working on latest.',   time: '2 days ago',   read: true  },
  { type: 'red',   icon: '📐', title: 'Version conflict resolved',              desc: 'All team members are now on Foundation Layout v4.',              time: '3 days ago',   read: true  },
];

const COORD_DATA = [
  { from: 'MEP',      person: 'Suresh Kumar', title: 'Beam opening for duct run Level 3',         status: 'open',     date: 'Today',  desc: 'P1 — Structural review of feasibility required.' },
  { from: 'Architect', person: 'Priya Ramesh', title: 'Column grid confirmation Floors 7–10',      status: 'pending',  date: 'Dec 19', desc: 'Waiting for structural to confirm revised column positions.' },
  { from: 'Architect', person: 'Priya Ramesh', title: 'Staircase structural detail handover',       status: 'pending',  date: 'Dec 18', desc: 'Architect needs finalized staircase drawing.' },
  { from: 'MEP',      person: 'Suresh Kumar', title: 'Slab openings for MEP shafts Level 2',      status: 'resolved', date: 'Dec 15', desc: 'Confirmed — 600×600mm at Grid C2, D4.' },
];

const LOG_DATA = [
  { date: 'Today — Dec 21, 2024', who: 'Rajesh Sharma (Structural)', badge: 'badge-closed', label: 'You', body: 'Completed pile cap reinforcement layout for grids A1–A6. Reviewed beam-duct conflict with MEP — resolution pending. Updated Foundation Layout to v4.', photos: 2 },
  { date: 'Dec 20, 2024',         who: 'Rajesh Sharma (Structural)', badge: 'badge-closed', label: 'You', body: 'Submitted Column Schedule v3 for Floors 1–6. Coordinated with Architect on column grid alignment. Resolved INC-011 partially.', photos: 3 },
  { date: 'Dec 19, 2024',         who: 'Priya Ramesh (Architect)',   badge: 'badge-open',   label: 'Arch', body: 'Reviewed structural drawings for Floors 1–4. Raised query on column grid misalignment Floors 7–9.', photos: 1 },
  { date: 'Dec 18, 2024',         who: 'Rajesh Sharma (Structural)', badge: 'badge-closed', label: 'You', body: 'Uploaded Beam Layout v2 for typical floor. Shared with Architect and MEP. Reviewed shear wall calculations draft.', photos: 4 },
];

const VERSION_HISTORIES = {
  'Foundation Layout': [
    { v: 'v4', date: 'Today 10:30 AM', by: 'Rajesh Sharma', note: 'Revised pile cap dimensions per soil report SR-07. Spacing 1800→2100mm at A3-A6.', latest: true },
    { v: 'v3', date: 'Dec 15, 2024',   by: 'Rajesh Sharma', note: 'Corrected pile alignment at B2. Added edge beam details at periphery.' },
    { v: 'v2', date: 'Nov 28, 2024',   by: 'Rajesh Sharma', note: 'Updated after client review. Removed 4 piles at A1 per revised loading.' },
    { v: 'v1', date: 'Nov 10, 2024',   by: 'Rajesh Sharma', note: 'Initial submission for review.' },
  ],
  'Column Schedule — Lvl 1–6': [
    { v: 'v3', date: 'Yesterday',    by: 'Rajesh Sharma', note: 'Reinforcement details for Floors 4–6. Revised splice at Floor 3.', latest: true },
    { v: 'v2', date: 'Dec 10, 2024', by: 'Rajesh Sharma', note: 'Column sizes at corner grids updated per wind load calcs.' },
    { v: 'v1', date: 'Nov 25, 2024', by: 'Rajesh Sharma', note: 'Initial column schedule for Floors 1–3.' },
  ],
  'Beam Layout — Typical Flr': [
    { v: 'v2', date: 'Dec 18, 2024', by: 'Rajesh Sharma', note: 'Secondary beam depth 400→450mm at C3-C5 to accommodate MEP.', latest: true },
    { v: 'v1', date: 'Dec 5, 2024',  by: 'Rajesh Sharma', note: 'Initial beam layout for typical floor.' },
  ],
  'Shear Wall Reinf. Plan': [
    { v: 'v5', date: 'Dec 17, 2024', by: 'Rajesh Sharma', note: 'Rebar density T20@150 → T25@125 at core walls.', latest: true },
    { v: 'v4', date: 'Dec 10, 2024', by: 'Rajesh Sharma', note: 'Revised boundary element dimensions.' },
    { v: 'v3', date: 'Nov 30, 2024', by: 'Rajesh Sharma', note: 'Third revision after seismic analysis update.' },
    { v: 'v2', date: 'Nov 20, 2024', by: 'Rajesh Sharma', note: 'Updated after wind analysis.' },
    { v: 'v1', date: 'Nov 10, 2024', by: 'Rajesh Sharma', note: 'Initial design.' },
  ],
};

/* ============================================================
   SMALL REUSABLE COMPONENTS
   ============================================================ */
function Badge({ variant, children }) {
  return <span className={`se-badge se-badge-${variant}`}>{children}</span>;
}

function PriorityBadge({ priority }) {
  return <Badge variant={priority}>{priority.toUpperCase()}</Badge>;
}

function StatusBadge({ status }) {
  const map = { open: ['open', 'Open'], inprogress: ['prog', 'In Progress'], closed: ['closed', 'Closed'] };
  const [v, label] = map[status] || ['gray', status];
  return <Badge variant={v}>{label}</Badge>;
}

function ProgressBar({ pct, color = 'blue' }) {
  return (
    <div className="se-prog-bar">
      <div className={`se-prog-fill ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function FileIcon({ type }) {
  return <div className={`se-file-icon ${type}`}>{type.toUpperCase()}</div>;
}

/* ============================================================
   MODAL SHELL
   ============================================================ */
function Modal({ id, open, onClose, title, subtitle, size = '', children, footer }) {
  if (!open) return null;
  return (
    <div className={`se-modal-overlay ${open ? 'show' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`se-modal ${size}`}>
        <div className="se-modal-header">
          <div>
            <div className="se-modal-title">{title}</div>
            {subtitle && <div className="se-modal-subtitle">{subtitle}</div>}
          </div>
          <button className="se-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="se-modal-body">{children}</div>
        {footer && <div className="se-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   TOAST SYSTEM
   ============================================================ */
function ToastContainer({ toasts }) {
  return (
    <div className="se-toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`se-toast ${t.type}`}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   UPLOAD MODAL
   ============================================================ */
function UploadModal({ open, onClose, onSubmit }) {
  const [fileSelected, setFileSelected] = useState(false);
  return (
    <Modal
      open={open} onClose={onClose}
      title="Upload Drawing / Document"
      subtitle="New upload creates a new version. All shared team members get auto-notified."
      size="lg"
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="se-btn se-btn-primary" onClick={() => { onSubmit(); onClose(); setFileSelected(false); }}>
            📤 Upload &amp; Notify Team
          </button>
        </>
      }
    >
      <div className="se-upload-zone" onClick={() => setFileSelected(true)}>
        <div className="se-upload-zone-icon">📤</div>
        <div className="se-upload-zone-text">Click to select or drag &amp; drop files here</div>
        <div className="se-upload-zone-sub">DWG, DXF, PDF, XLSX — max 50MB per file</div>
      </div>
      {fileSelected && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--green-bg)', border: '1px solid #a7f3d0', borderRadius: 6, fontSize: 13, color: 'var(--green-text)' }}>
          ✓ <strong>Foundation-Layout-v4.dwg</strong> selected (2.4 MB) — ready to upload
        </div>
      )}
      <hr className="se-divider" />
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Drawing Name *</label>
          <input className="se-form-input" placeholder="e.g. Foundation Layout — Pile Cap Details" />
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Category</label>
          <select className="se-form-select">
            <option>Structural Drawing</option>
            <option>Calculation Report</option>
            <option>Coordination Drawing</option>
            <option>Specification</option>
          </select>
        </div>
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Milestone Link</label>
          <select className="se-form-select">
            <option>M2 – Podium Structure</option>
            <option>M1 – Foundation (complete)</option>
            <option>M3 – Typical Floors</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Version</label>
          <input className="se-form-input" defaultValue="v4" style={{ fontFamily: 'var(--mono)' }} />
          <div className="se-form-hint">System auto-increments. You can override.</div>
        </div>
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Change Notes *</label>
        <textarea className="se-form-textarea" placeholder="What changed in this version? Reference drawing numbers, grid lines, dimensions." />
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Share With Teams</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
          {['Architect', 'MEP Engineer', 'Site Engineer', 'Project Coordinator', 'Quantity Surveyor', 'Client'].map((t, i) => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 20, background: 'var(--bg)' }}>
              <input type="checkbox" defaultChecked={i < 3} /> {t}
            </label>
          ))}
        </div>
        <div className="se-form-hint">Checked teams will be auto-notified and see the latest version automatically.</div>
      </div>
    </Modal>
  );
}

/* ============================================================
   INCIDENT MODAL (raise)
   ============================================================ */
function IncidentModal({ open, onClose, onSubmit }) {
  const [priority, setPriority] = useState('p3');
  const getDue = (p) => {
    const now = new Date();
    const hrs = { p1: 4, p2: 24, p3: 72 };
    now.setHours(now.getHours() + (hrs[p] || 72));
    return now.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  return (
    <Modal
      open={open} onClose={onClose}
      title="Raise Incident"
      subtitle="P1 = 4h · P2 = 24h · P3 = 72h. Assignee gets immediate notification."
      size="lg"
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="se-btn se-btn-primary" onClick={() => { onSubmit(); onClose(); }}>
            🚨 Raise Incident &amp; Notify
          </button>
        </>
      }
    >
      <div className="se-form-group">
        <label className="se-form-label">Incident Title *</label>
        <input className="se-form-input" placeholder="Short, clear description of the issue" />
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Priority *</label>
          <select className="se-form-select" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="p3">P3 — Low (72 hours)</option>
            <option value="p2">P2 — Medium (24 hours)</option>
            <option value="p1">P1 — Critical (4 hours)</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Auto Due Date / Time</label>
          <input className="se-form-input" value={getDue(priority)} readOnly style={{ background: 'var(--bg)', fontFamily: 'var(--mono)', fontSize: 12 }} />
        </div>
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Assign To *</label>
          <select className="se-form-select">
            <option>Suresh Kumar — MEP Engineer</option>
            <option>Priya Ramesh — Architect</option>
            <option>Arun Tiwari — Project Coordinator</option>
            <option>Ravi Menon — Site Engineer</option>
            <option>Self (me)</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Category</label>
          <select className="se-form-select">
            <option>Design Conflict</option>
            <option>Drawing Discrepancy</option>
            <option>Resource Not Available</option>
            <option>Calculation Error</option>
            <option>Safety Concern</option>
          </select>
        </div>
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Detailed Description *</label>
        <textarea className="se-form-textarea" style={{ minHeight: 100 }} placeholder="Include location, dimensions, reference drawing number, and what needs resolution." />
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Reference Drawing</label>
        <select className="se-form-select">
          <option>— None —</option>
          <option>Foundation Layout v4</option>
          <option>Beam Layout v2</option>
          <option>Column Schedule v3</option>
        </select>
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Attach Photos (optional)</label>
        <div className="se-upload-zone" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>📷 Click to attach site photos or screenshots</div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   INCIDENT DETAIL MODAL
   ============================================================ */
function IncidentDetailModal({ open, onClose, incident, onResolve, onComment }) {
  if (!incident) return null;
  return (
    <Modal
      open={open} onClose={onClose}
      title={`${incident.id} · ${incident.title}`}
      size="xl"
    >
      <div className="se-modal-subtitle" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <PriorityBadge priority={incident.priority} />
        <StatusBadge status={incident.status} />
      </div>
      <div className="se-grid-2">
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '.4px', marginBottom: 10 }}>INCIDENT DETAILS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, marginBottom: 16 }}>
            {[['Project', 'Prestige Towers Phase 2'], ['Raised By', incident.by], ['Assigned To', incident.assigned + (incident.assigned === 'You' ? ' (You)' : '')], ['Raised On', 'Dec 21, 2024 · 08:15 AM'], ['Due By', 'Dec 21, 2024 · 12:15 PM'], ['Reference', 'Beam Layout v2']].map(([k, v]) => (
              <div key={k} className="se-flex se-justify-bet">
                <span className="se-text-muted">{k}</span>
                <span style={k === 'Due By' ? { color: 'var(--red)', fontWeight: 600 } : k === 'Assigned To' && incident.assigned === 'You' ? { fontWeight: 600 } : {}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '.4px', marginBottom: 8 }}>DESCRIPTION</div>
          <div style={{ fontSize: 13, lineHeight: 1.6, background: 'var(--bg)', padding: 12, borderRadius: 6, borderLeft: '3px solid var(--amber)' }}>
            The MEP duct run on Level 3 (Grid B3–D3) conflicts with the primary beam (600mm depth) at invert level 3150mm from FFL. The duct requires 450+100=550mm clearance which cannot pass below the beam. A structural opening or duct re-route is required.
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {['📷', '📄'].map((icon, i) => (
              <div key={i} style={{ width: 80, height: 60, background: 'var(--bg2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '1px solid var(--border)', cursor: 'pointer' }}>{icon}</div>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', letterSpacing: '.4px', marginBottom: 10 }}>ACTIVITY &amp; COMMENTS</div>
          <div className="se-timeline" style={{ marginBottom: 16 }}>
            {[
              { dot: 'red', icon: '!', title: 'Raised by Suresh Kumar (MEP)', meta: 'Dec 21, 08:15 AM' },
              { dot: 'amber', icon: '→', title: 'Assigned to Rajesh Sharma (You)', meta: 'Dec 21, 08:15 AM · Auto-assigned' },
              { dot: 'blue', icon: '💬', title: 'Comment by Rajesh Sharma', meta: 'Dec 21, 09:00 AM', desc: 'Reviewing the beam section. Will check if structural opening is feasible. Update by 11 AM.' },
            ].map((item, i) => (
              <div key={i} className="se-tl-item">
                <div className="se-tl-dot-wrap">
                  <div className={`se-tl-dot ${item.dot}`}>{item.icon}</div>
                  {i < 2 && <div className="se-tl-line" />}
                </div>
                <div className="se-tl-content">
                  <div className="se-tl-title">{item.title}</div>
                  <div className="se-tl-meta">{item.meta}</div>
                  {item.desc && <div className="se-tl-desc">{item.desc}</div>}
                </div>
              </div>
            ))}
          </div>
          <div className="se-form-group">
            <label className="se-form-label">Add Comment / Update</label>
            <textarea className="se-form-textarea" placeholder="Add your response, resolution notes, or update…" style={{ minHeight: 80 }} />
          </div>
          <div className="se-flex se-gap-8">
            <button className="se-btn se-btn-secondary" onClick={onClose}>Close</button>
            <button className="se-btn se-btn-secondary" style={{ flex: 1 }} onClick={() => { onComment(); }}>💬 Add Comment</button>
            <button className="se-btn se-btn-primary" onClick={() => { onResolve(); onClose(); }}>✓ Mark Resolved</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   TASK MODAL
   ============================================================ */
function TaskModal({ open, onClose, onSubmit }) {
  return (
    <Modal
      open={open} onClose={onClose}
      title="Create Task"
      subtitle="Assign a task to yourself or a team member"
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="se-btn se-btn-primary" onClick={() => { onSubmit(); onClose(); }}>Create Task</button>
        </>
      }
    >
      <div className="se-form-group">
        <label className="se-form-label">Task Title *</label>
        <input className="se-form-input" placeholder="e.g. Review shear wall reinforcement calculations" />
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Description</label>
        <textarea className="se-form-textarea" placeholder="What needs to be done? Any context or reference drawings?" />
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Assign To</label>
          <select className="se-form-select">
            <option>Self (Rajesh Sharma)</option>
            <option>Priya Ramesh — Architect</option>
            <option>Suresh Kumar — MEP</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Due Date *</label>
          <input className="se-form-input" type="date" />
        </div>
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Priority</label>
          <select className="se-form-select">
            <option>P3 — Low</option><option>P2 — Medium</option><option>P1 — High</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Link to Drawing</label>
          <select className="se-form-select">
            <option>— None —</option>
            <option>Foundation Layout v4</option>
            <option>Shear Wall Plan v5</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   VERSION HISTORY MODAL
   ============================================================ */
function VersionModal({ open, onClose, docName, onUpload }) {
  const hist = VERSION_HISTORIES[docName] || [];
  return (
    <Modal
      open={open} onClose={onClose}
      title={`${docName} — Version History`}
      subtitle="Team always sees the latest version. Previous versions are archived."
      size="lg"
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Close</button>
          <button className="se-btn se-btn-primary" onClick={() => { onClose(); onUpload(); }}>📤 Upload New Version</button>
        </>
      }
    >
      {hist.map((v) => (
        <div key={v.v} className={`se-ver-row ${v.latest ? 'latest' : ''}`}>
          <div className="se-ver-num">{v.v}</div>
          <div className="se-ver-body">
            <div className="se-ver-title">
              {docName} {v.v}
              {v.latest && <Badge variant="latest">Current — Team sees this</Badge>}
            </div>
            <div className="se-ver-meta">Uploaded: {v.date} · By: {v.by}</div>
            <div className="se-ver-note">{v.note}</div>
          </div>
          <div className="se-ver-actions">
            <button className="se-btn se-btn-xs se-btn-secondary">👁 View</button>
            <button className="se-btn se-btn-xs se-btn-secondary">⬇</button>
            {!v.latest && <button className="se-btn se-btn-xs se-btn-secondary">♻ Restore</button>}
          </div>
        </div>
      ))}
    </Modal>
  );
}

/* ============================================================
   DAILY LOG MODAL
   ============================================================ */
function DailyLogModal({ open, onClose, onSubmit }) {
  return (
    <Modal
      open={open} onClose={onClose}
      title="Post Daily Progress Log"
      subtitle={`Today — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="se-btn se-btn-primary" onClick={() => { onSubmit(); onClose(); }}>Post Log</button>
        </>
      }
    >
      <div className="se-form-group">
        <label className="se-form-label">Work Done Today *</label>
        <textarea className="se-form-textarea" style={{ minHeight: 100 }} placeholder="Describe structural work completed today. Reference grid lines, floor levels, drawing numbers." />
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Issues / Observations</label>
        <textarea className="se-form-textarea" placeholder="Any problems noticed, deviations, or concerns today?" />
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">Milestone Progress</label>
          <select className="se-form-select"><option>M2 – Podium (75%)</option><option>M1 – Foundation (100%)</option></select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Overall Progress %</label>
          <input className="se-form-input" type="number" min="0" max="100" placeholder="75" />
        </div>
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Photos *</label>
        <div className="se-upload-zone" style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>📷 Attach site progress photos</div>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   COORDINATION REQUEST MODAL
   ============================================================ */
function CoordModal({ open, onClose, onSubmit }) {
  return (
    <Modal
      open={open} onClose={onClose}
      title="Send Coordination Request"
      subtitle="Request another team to review, confirm, or share a design item"
      footer={
        <>
          <button className="se-btn se-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="se-btn se-btn-primary" onClick={() => { onSubmit(); onClose(); }}>Send Request</button>
        </>
      }
    >
      <div className="se-form-group">
        <label className="se-form-label">Request Title *</label>
        <input className="se-form-input" placeholder="e.g. Please confirm slab opening positions for MEP shafts" />
      </div>
      <div className="se-form-row">
        <div className="se-form-group">
          <label className="se-form-label">To (Team/Person) *</label>
          <select className="se-form-select">
            <option>Priya Ramesh — Architect</option>
            <option>Suresh Kumar — MEP Engineer</option>
            <option>Arun Tiwari — Project Coordinator</option>
          </select>
        </div>
        <div className="se-form-group">
          <label className="se-form-label">Response Needed By</label>
          <input className="se-form-input" type="date" />
        </div>
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Description *</label>
        <textarea className="se-form-textarea" placeholder="What do you need? Be specific with drawing references, grid lines, or dimensions." />
      </div>
      <div className="se-form-group">
        <label className="se-form-label">Attach Reference Drawing</label>
        <select className="se-form-select">
          <option>— None —</option>
          <option>Foundation Layout v4</option>
          <option>Column Schedule v3</option>
        </select>
      </div>
    </Modal>
  );
}

/* ============================================================
   PAGE: DASHBOARD
   ============================================================ */
function PageDashboard({ onNav, openUpload, openIncident, openVersionHistory }) {
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Good morning, Rajesh 👋</div>
            <div className="se-page-desc">Prestige Towers Phase 2 · Structural Engineering Overview · {today}</div>
          </div>
          <div className="se-flex se-gap-8">
            <button className="se-btn se-btn-secondary se-btn-sm" onClick={openUpload}>📤 Upload Drawing</button>
            <button className="se-btn se-btn-primary se-btn-sm" onClick={openIncident}>+ Raise Incident</button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="se-stats-grid">
        {[
          { color: 'blue',  icon: '📐', label: 'Total Drawings',  val: 47, sub: '12 updated this week' },
          { color: 'amber', icon: '⚠',  label: 'Open Incidents',  val: 3,  sub: '1 P1 · 1 P2 · 1 P3' },
          { color: 'green', icon: '☑',  label: 'Tasks Pending',   val: 5,  sub: '2 due today' },
          { color: 'red',   icon: '🔔', label: 'Unread Alerts',   val: 7,  sub: '2 version updates' },
        ].map(s => (
          <div key={s.label} className={`se-stat-card ${s.color}`}>
            <div className={`se-stat-icon ${s.color}`}>{s.icon}</div>
            <div className="se-stat-label">{s.label}</div>
            <div className="se-stat-value">{s.val}</div>
            <div className="se-stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="se-grid-2">
        {/* Timeline */}
        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Recent Activity</div><div className="se-card-subtitle">Latest actions across all modules</div></div>
          </div>
          <div className="se-timeline">
            {[
              { dot: 'blue',  icon: '📐', title: 'Foundation Layout v4 uploaded',       meta: 'By you · 2 hours ago',                    desc: 'Revised pile cap dimensions per soil report SR-07.' },
              { dot: 'red',   icon: '⚠',  title: 'P1 Incident raised by MEP team',      meta: 'Assigned to you · 4 hours ago',           desc: 'Structural beam conflict with MEP duct routing on Level 3.' },
              { dot: 'green', icon: '✓',  title: 'Column Schedule v3 acknowledged',     meta: 'Architect confirmed · Yesterday',          desc: 'Architect confirmed they are working on updated version.' },
              { dot: 'amber', icon: '📋', title: 'Task: Review shear wall calculations', meta: 'Assigned by Project Coordinator · Yesterday', desc: 'Deadline: Today EOD. Priority: P2.' },
              { dot: 'blue',  icon: '🔗', title: 'MEP coordination request received',   meta: 'From Suresh (MEP) · 2 days ago',          desc: 'Request to review slab opening positions for plumbing shafts.' },
            ].map((item, i, arr) => (
              <div key={i} className="se-tl-item">
                <div className="se-tl-dot-wrap">
                  <div className={`se-tl-dot ${item.dot}`}>{item.icon}</div>
                  {i < arr.length - 1 && <div className="se-tl-line" />}
                </div>
                <div className="se-tl-content">
                  <div className="se-tl-title">{item.title}</div>
                  <div className="se-tl-meta">{item.meta}</div>
                  <div className="se-tl-desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Version Tracker */}
        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Latest Drawing Versions</div><div className="se-card-subtitle">Click a drawing to view full history</div></div>
            <button className="se-btn se-btn-secondary se-btn-xs" onClick={() => onNav('documents')}>View All</button>
          </div>
          {[
            { ver: 'v4', name: 'Foundation Layout', meta: 'Updated 2h ago · By Rajesh S.', latest: true },
            { ver: 'v3', name: 'Column Schedule — Levels 1–6', meta: 'Updated yesterday · By Rajesh S.' },
            { ver: 'v2', name: 'Beam Layout — Typical Floor', meta: 'Updated 3 days ago · By Rajesh S.' },
            { ver: 'v5', name: 'Shear Wall Reinforcement Plan', meta: 'Updated 4 days ago · By Rajesh S.' },
            { ver: 'v2', name: 'Slab Reinforcement Detail', meta: 'Updated 5 days ago · By Rajesh S.' },
          ].map((d) => (
            <div key={d.name} className={`se-ver-row ${d.latest ? 'latest' : ''}`} onClick={() => openVersionHistory(d.name)}>
              <div className="se-ver-num">{d.ver}</div>
              <div className="se-ver-body">
                <div className="se-ver-title">{d.name} {d.latest && <Badge variant="latest">Latest</Badge>}</div>
                <div className="se-ver-meta">{d.meta}</div>
              </div>
              <div className="se-ver-actions">
                <button className="se-btn se-btn-xs se-btn-secondary" onClick={e => e.stopPropagation()}>👁 View</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incidents + Coordination */}
      <div className="se-grid-2 se-mt-16">
        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Open Incidents</div><div className="se-card-subtitle">Assigned to you or raised by you</div></div>
            <button className="se-btn se-btn-secondary se-btn-xs" onClick={() => onNav('incidents')}>View All</button>
          </div>
          <div className="se-table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {INCIDENTS_DATA.filter(i => i.status !== 'closed').slice(0, 3).map(inc => (
                  <tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => onNav('incidents')}>
                    <td className="se-td-mono">{inc.id}</td>
                    <td><span className="se-fw-600">{inc.title}</span></td>
                    <td><PriorityBadge priority={inc.priority} /></td>
                    <td><StatusBadge status={inc.status} /></td>
                    <td className="se-text-sm" style={{ color: inc.priority === 'p1' ? 'var(--red)' : undefined }}>{inc.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Team Coordination Status</div><div className="se-card-subtitle">Shared design work with other teams</div></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { dot: 'open',     who: 'Architect · Priya M.',           badge: <Badge variant="blue">2 open queries</Badge>,   pct: 70, color: 'blue',  desc: 'Waiting for: Revised column grids for Floors 7–10' },
              { dot: 'pending',  who: 'MEP Engineer · Suresh K.',        badge: <Badge variant="p1">P1 Conflict</Badge>,        pct: 30, color: 'amber', desc: 'Beam vs Duct conflict on Level 3 — pending resolution' },
              { dot: 'resolved', who: 'Project Coordinator · Arun T.',   badge: <Badge variant="closed">All Clear</Badge>,      pct: 100, color: 'green', desc: 'Schedule aligned. No structural delays reported.', border: true },
            ].map((item, i) => (
              <div key={i} className="se-coord-item" style={item.border ? { borderColor: 'var(--green)' } : {}}>
                <div className={`se-coord-dot ${item.dot}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="se-flex se-items-center se-gap-8 se-justify-bet" style={{ flexWrap: 'wrap' }}>
                    <div className="se-text-sm se-fw-600">{item.who}</div>
                    {item.badge}
                  </div>
                  <div className="se-text-sm se-text-muted se-mt-4">{item.desc}</div>
                  <div className="se-mt-8"><ProgressBar pct={item.pct} color={item.color} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="se-card se-mt-16">
        <div className="se-card-header">
          <div><div className="se-card-title">Project Milestone — Structural Deliverables</div><div className="se-card-subtitle">Prestige Towers Phase 2</div></div>
        </div>
        <div className="se-table-wrap">
          <table>
            <thead><tr><th>Milestone</th><th>Structural Deliverable</th><th>Target Date</th><th>Status</th><th>Drawings</th><th>Progress</th></tr></thead>
            <tbody>
              {[
                { ms: 'M1 – Foundation',    del: 'Foundation Layout, Pile Cap Details',     dt: 'Nov 30, 2024', st: 'closed',     drw: '8',     pct: 100, c: 'green' },
                { ms: 'M2 – Podium',        del: 'Podium Column Schedule, Beam Layout',     dt: 'Dec 20, 2024', st: 'inprogress', drw: '12/15', pct: 75,  c: 'blue' },
                { ms: 'M3 – Typical Floors', del: 'Typical Floor Slab, Shear Walls',        dt: 'Jan 25, 2025', st: 'open',       drw: '0/18',  pct: 0,   c: 'blue' },
                { ms: 'M4 – Top Floors',    del: 'Refuge Floor Structure, Terrace Slab',    dt: 'Mar 10, 2025', st: 'gray',       drw: '—',     pct: 0,   c: 'blue' },
              ].map(row => (
                <tr key={row.ms}>
                  <td className="se-fw-600">{row.ms}</td>
                  <td>{row.del}</td>
                  <td className="se-text-sm">{row.dt}</td>
                  <td><StatusBadge status={row.st} /></td>
                  <td className="se-text-sm">{row.drw}</td>
                  <td><ProgressBar pct={row.pct} color={row.c} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: DOCUMENTS
   ============================================================ */
function PageDocuments({ openUpload, openVersionHistory }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const filtered = DOCS_DATA.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Drawings &amp; Documents</div>
            <div className="se-page-desc">All structural drawings with full version history. Team always sees latest version on open.</div>
          </div>
          <div className="se-flex se-gap-8">
            <button className="se-btn se-btn-secondary se-btn-sm">📁 New Folder</button>
            <button className="se-btn se-btn-primary se-btn-sm" onClick={openUpload}>📤 Upload Drawing</button>
          </div>
        </div>
      </div>
      <div className="se-tab-bar">
        {['All Documents', 'Structural', 'Coordination', 'Reports'].map(t => (
          <button key={t} className={`se-tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <div className="se-filter-bar">
        <input className="se-search-input" placeholder="Search drawings…" value={search} onChange={e => setSearch(e.target.value)} />
        {['All Types', 'DWG', 'PDF', 'Calculations'].map(c => (
          <div key={c} className={`se-filter-chip ${c === 'All Types' ? 'active' : ''}`}>{c}</div>
        ))}
        <span className="se-text-xs se-text-muted" style={{ marginLeft: 'auto' }}>{filtered.length} documents</span>
      </div>
      <div className="se-info-banner">
        <span style={{ fontSize: 16 }}>ℹ</span>
        <div><strong style={{ color: 'var(--blue)' }}>Version Control Active:</strong> All teammates automatically receive the latest version when they open any document.</div>
      </div>
      <div className="se-table-wrap">
        <table>
          <thead>
            <tr><th>Drawing / Document</th><th>Type</th><th>Version</th><th>Modified</th><th>By</th><th>Shared With</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.name}>
                <td>
                  <div className="se-flex se-items-center se-gap-8">
                    <FileIcon type={d.type} />
                    <div>
                      <div className="se-fw-600" style={{ fontSize: 13 }}>{d.name}</div>
                      <div className="se-text-xs se-text-muted">{d.milestone}</div>
                    </div>
                  </div>
                </td>
                <td><Badge variant="gray">{d.type.toUpperCase()}</Badge></td>
                <td><Badge variant="latest">{d.ver}</Badge></td>
                <td className="se-text-sm se-text-muted">{d.date}</td>
                <td className="se-text-sm">{d.by}</td>
                <td className="se-text-xs se-text-muted">{d.shared}</td>
                <td>
                  <div className="se-td-actions">
                    <button className="se-btn se-btn-xs se-btn-secondary" onClick={() => openVersionHistory(d.name)}>🕐 History</button>
                    <button className="se-btn se-btn-xs se-btn-secondary">👁 View</button>
                    <button className="se-btn se-btn-xs se-btn-primary" onClick={openUpload}>📤 Update</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: INCIDENTS
   ============================================================ */
function PageIncidents({ incidents, setIncidents, openIncidentModal, openDetailFor, toast }) {
  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState('all');
  const visible = incidents.filter(i => {
    if (tab === 'open')       return i.status === 'open';
    if (tab === 'inprogress') return i.status === 'inprogress';
    if (tab === 'closed')     return i.status === 'closed';
    return true;
  });

  const resolve = (idx) => {
    const updated = [...incidents];
    updated[idx] = { ...updated[idx], status: 'closed' };
    setIncidents(updated);
    toast('Incident closed.', 'success');
  };

  const tabCounts = { all: incidents.length, open: incidents.filter(i => i.status === 'open').length, inprogress: incidents.filter(i => i.status === 'inprogress').length, closed: incidents.filter(i => i.status === 'closed').length };

  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Incident Queue</div>
            <div className="se-page-desc">P1 must close in 4h · P2 in 24h · P3 in 72h. All structural and cross-team incidents.</div>
          </div>
          <button className="se-btn se-btn-primary se-btn-sm" onClick={openIncidentModal}>+ Raise Incident</button>
        </div>
      </div>
      <div className="se-tab-bar">
        {[['all', 'All'], ['open', 'Open'], ['inprogress', 'In Progress'], ['closed', 'Closed']].map(([k, label]) => (
          <button key={k} className={`se-tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>
            {label} <span className="se-pill">{tabCounts[k]}</span>
          </button>
        ))}
      </div>
      <div className="se-filter-bar">
        <input className="se-search-input" placeholder="Search incidents…" />
        {['All Priority', 'P1', 'P2', 'P3', 'Assigned to Me', 'Raised by Me'].map(c => (
          <div key={c} className={`se-filter-chip ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</div>
        ))}
      </div>
      <div className="se-table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Title</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Assigned To</th><th>Due By</th><th>Actions</th></tr></thead>
          <tbody>
            {visible.map((inc, i) => (
              <tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => openDetailFor(i)}>
                <td className="se-td-mono">{inc.id}</td>
                <td className="se-fw-600">{inc.title}</td>
                <td><PriorityBadge priority={inc.priority} /></td>
                <td><StatusBadge status={inc.status} /></td>
                <td className="se-text-sm">{inc.by}</td>
                <td className="se-text-sm">{inc.assigned}</td>
                <td className="se-text-sm" style={{ color: inc.status === 'closed' ? 'var(--green)' : inc.priority === 'p1' ? 'var(--red)' : undefined }}>{inc.due}</td>
                <td onClick={e => e.stopPropagation()}>
                  <div className="se-td-actions">
                    {inc.status !== 'closed' && <button className="se-btn se-btn-xs se-btn-primary" onClick={() => openDetailFor(i)}>View</button>}
                    {inc.status !== 'closed' && <button className="se-btn se-btn-xs se-btn-secondary" onClick={() => resolve(i)}>✓ Close</button>}
                    {inc.status === 'closed' && <span className="se-text-xs se-text-muted">Closed</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: TASKS
   ============================================================ */
function PageTasks({ tasks, setTasks, openTaskModal, toast }) {
  const [tab, setTab] = useState('my');
  const mine     = tasks.filter(t => t.mine && !t.done);
  const assigned = tasks.filter(t => !t.mine && !t.done);
  const done     = tasks.filter(t => t.done);

  const complete = (idx) => {
    const updated = [...tasks];
    updated[idx] = { ...updated[idx], done: true };
    setTasks(updated);
    toast('Task marked complete.', 'success');
  };

  const list = tab === 'my' ? mine : tab === 'assigned' ? assigned : done;

  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Task Queue</div>
            <div className="se-page-desc">Tasks assigned to you or by you. Track progress and close on completion.</div>
          </div>
          <button className="se-btn se-btn-primary se-btn-sm" onClick={openTaskModal}>+ Create Task</button>
        </div>
      </div>
      <div className="se-tab-bar">
        {[['my', 'My Tasks'], ['assigned', 'Assigned by Me'], ['done', 'Completed']].map(([k, label]) => (
          <button key={k} className={`se-tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <div className="se-filter-bar">
        <input className="se-search-input" placeholder="Search tasks…" />
        {['All', 'Today', 'This Week', 'Overdue'].map(c => (
          <div key={c} className={`se-filter-chip ${c === 'All' ? 'active' : ''}`}>{c}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>No tasks in this view</div>}
        {list.map((t, i) => {
          const realIdx = tasks.indexOf(t);
          return (
            <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <input type="checkbox" checked={t.done} onChange={() => complete(realIdx)} style={{ marginTop: 2, cursor: 'pointer' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="se-flex se-items-center se-gap-8" style={{ flexWrap: 'wrap', marginBottom: 4 }}>
                  <span className="se-fw-600" style={{ fontSize: 13, textDecoration: t.done ? 'line-through' : undefined }}>{t.title}</span>
                  <PriorityBadge priority={t.priority} />
                  {t.due === 'Today' && !t.done && <Badge variant="p1">Due Today</Badge>}
                </div>
                <div className="se-text-xs se-text-muted">{t.id} · {t.mine ? `Assigned by: ${t.by}` : `Assigned to: ${t.assigned}`} · Due: {t.due}</div>
              </div>
              <button className="se-btn se-btn-xs se-btn-secondary" onClick={openTaskModal}>Edit</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: COORDINATION
   ============================================================ */
function PageCoordination({ openCoordModal }) {
  const teams = [
    { initials: 'PR', color: '#8b5cf6', name: 'Priya Ramesh',  role: 'Architect',           queries: 2, docs: 8, alert: { bg: 'var(--purple-bg)', color: 'var(--purple-text)', msg: '⏳ Waiting: Revised column grid Floors 7–10' } },
    { initials: 'SK', color: '#0891b2', name: 'Suresh Kumar',  role: 'MEP Engineer',         queries: 1, docs: 5, alert: { bg: 'var(--red-bg)',    color: 'var(--red-text)',    msg: '🔴 P1: Beam conflict Level 3 — needs resolution today' } },
    { initials: 'AT', color: '#059669', name: 'Arun Tiwari',   role: 'Project Coordinator',  queries: 0, docs: 3, alert: { bg: 'var(--green-bg)', color: 'var(--green-text)', msg: '✓ All structural targets on schedule' } },
  ];
  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Team Coordination</div>
            <div className="se-page-desc">Coordinate with Architect, MEP, and Project Coordinator. Manage cross-team queries and shared design items.</div>
          </div>
          <button className="se-btn se-btn-primary se-btn-sm" onClick={openCoordModal}>+ Send Coordination Request</button>
        </div>
      </div>

      <div className="se-team-grid" style={{ marginBottom: 20 }}>
        {teams.map(t => (
          <div key={t.name} className="se-team-card">
            <div className="se-team-card-header">
              <div className="se-team-avatar" style={{ background: t.color }}>{t.initials}</div>
              <div>
                <div className="se-team-name">{t.name}</div>
                <div className="se-team-role"><span className="se-online-dot" /> {t.role}</div>
              </div>
            </div>
            <div className="se-team-stats">
              <div className="se-team-stat"><div className="se-team-stat-val">{t.queries}</div><div className="se-team-stat-label">Open Queries</div></div>
              <div className="se-team-stat"><div className="se-team-stat-val">{t.docs}</div><div className="se-team-stat-label">Shared Docs</div></div>
            </div>
            <div style={{ marginTop: 10, padding: 8, background: t.alert.bg, borderRadius: 6, fontSize: 12, color: t.alert.color }}>{t.alert.msg}</div>
          </div>
        ))}
      </div>

      <div className="se-grid-2">
        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Cross-team Design Queries</div><div className="se-card-subtitle">Active coordination items between structural and other teams</div></div>
          </div>
          {COORD_DATA.map((c, i) => (
            <div key={i} className="se-coord-item">
              <div className={`se-coord-dot ${c.status}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="se-flex se-items-center se-justify-bet" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div className="se-text-sm se-fw-600">{c.title}</div>
                  <StatusBadge status={c.status === 'resolved' ? 'closed' : c.status === 'pending' ? 'inprogress' : 'open'} />
                </div>
                <div className="se-text-xs se-text-muted se-mt-4">From {c.person} ({c.from}) · {c.date}</div>
                <div className="se-text-xs se-mt-4" style={{ color: 'var(--text2)' }}>{c.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="se-card">
          <div className="se-card-header">
            <div><div className="se-card-title">Documents Shared With Teams</div><div className="se-card-subtitle">Auto-notifies teams on every new version</div></div>
          </div>
          {[
            { type: 'dwg', name: 'Foundation Layout v4',          shared: 'Architect, MEP, Site Engineer', badge: <Badge variant="latest">Latest</Badge> },
            { type: 'dwg', name: 'Column Schedule v3',            shared: 'Architect, Project Coordinator', badge: <Badge variant="ver">v3</Badge> },
            { type: 'pdf', name: 'Structural Calculation Report v2', shared: 'Project Coordinator, Client', badge: <Badge variant="ver">v2</Badge> },
            { type: 'dwg', name: 'Shear Wall Plan v5',            shared: 'Architect, MEP, QS',            badge: <Badge variant="ver">v5</Badge> },
            { type: 'xlsx', name: 'Steel Quantity Schedule v1',   shared: 'Quantity Surveyor',              badge: <Badge variant="ver">v1</Badge> },
          ].map(d => (
            <div key={d.name} className="se-shared-doc">
              <FileIcon type={d.type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="se-text-sm se-fw-600">{d.name}</div>
                <div className="se-text-xs se-text-muted">Shared with: {d.shared}</div>
              </div>
              {d.badge}
            </div>
          ))}
        </div>
      </div>

      <div className="se-card se-mt-16">
        <div className="se-card-header">
          <div><div className="se-card-title">Version Update Notifications Sent</div><div className="se-card-subtitle">Auto-notified when you upload — team always on latest</div></div>
        </div>
        <div className="se-table-wrap">
          <table>
            <thead><tr><th>Drawing</th><th>Version</th><th>Uploaded</th><th>Teams Notified</th><th>Opened By</th></tr></thead>
            <tbody>
              {[
                { name: 'Foundation Layout', ver: 'v4', when: 'Today, 10:30 AM', teams: 'Architect · MEP · Site Eng', opened: '3 / 3', ok: true },
                { name: 'Column Schedule',   ver: 'v3', when: 'Yesterday',       teams: 'Architect · Project Coord', opened: '1 / 2', ok: false },
                { name: 'Shear Wall Plan',   ver: 'v5', when: 'Dec 18',          teams: 'Architect · MEP · QS',      opened: '3 / 3', ok: true },
                { name: 'Beam Layout',       ver: 'v2', when: 'Dec 17',          teams: 'Architect · MEP',           opened: '2 / 2', ok: true },
              ].map(row => (
                <tr key={row.name}>
                  <td className="se-fw-600">{row.name}</td>
                  <td><Badge variant="ver">{row.ver}</Badge></td>
                  <td className="se-text-sm">{row.when}</td>
                  <td className="se-text-sm se-text-muted">{row.teams}</td>
                  <td><Badge variant={row.ok ? 'closed' : 'prog'}>{row.opened} opened</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: DAILY LOGS
   ============================================================ */
function PageDailyLogs({ openLogModal }) {
  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Daily Progress Logs</div>
            <div className="se-page-desc">Post end-of-day progress. View other teams' logs for coordination.</div>
          </div>
          <button className="se-btn se-btn-primary se-btn-sm" onClick={openLogModal}>+ Post Today's Log</button>
        </div>
      </div>
      <div className="se-grid-12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {LOG_DATA.map((log, i) => (
            <div key={i} className="se-card">
              <div className="se-flex se-items-center se-justify-bet" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div className="se-text-sm se-fw-600">{log.date}</div>
                  <div className="se-text-xs se-text-muted">{log.who}</div>
                </div>
                <Badge variant={log.badge === 'badge-closed' ? 'closed' : log.badge === 'badge-open' ? 'open' : 'blue'}>{log.label}</Badge>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>{log.body}</div>
              <div className="se-flex se-gap-6" style={{ flexWrap: 'wrap' }}>
                {Array.from({ length: log.photos }).map((_, pi) => (
                  <div key={pi} style={{ width: 60, height: 45, background: 'var(--bg2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid var(--border)', cursor: 'pointer' }}>📷</div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="se-card">
            <div className="se-card-header"><div className="se-card-title">Today's Log Completion</div></div>
            {[['Structural (You)', 'closed'], ['Architect', 'closed'], ['MEP Engineer', 'prog'], ['Site Engineer', 'closed'], ['QS', 'open']].map(([who, v]) => (
              <div key={who} className="se-flex se-items-center se-justify-bet" style={{ marginBottom: 10, fontSize: 13 }}>
                <span>{who}</span>
                <Badge variant={v}>{v === 'closed' ? '✓ Posted' : v === 'prog' ? 'Pending' : 'Not Posted'}</Badge>
              </div>
            ))}
          </div>
          <div className="se-card">
            <div className="se-card-header"><div className="se-card-title">This Week</div></div>
            {[['Mon Dec 18', 'closed'], ['Tue Dec 19', 'closed'], ['Wed Dec 20', 'closed'], ['Thu Dec 21', 'prog'], ['Fri Dec 22', 'gray']].map(([day, v]) => (
              <div key={day} className="se-flex se-justify-bet se-items-center" style={{ marginBottom: 8, fontSize: 12, color: 'var(--text2)' }}>
                <span>{day}</span>
                <Badge variant={v}>{v === 'closed' ? 'Posted' : v === 'prog' ? 'Today' : '—'}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: NOTIFICATIONS
   ============================================================ */
function PageNotifications({ notifs, setNotifs, toast }) {
  const markAll = () => {
    setNotifs(notifs.map(n => ({ ...n, read: true })));
    toast('All notifications marked as read', 'success');
  };
  const markOne = (i) => {
    const updated = [...notifs];
    updated[i] = { ...updated[i], read: true };
    setNotifs(updated);
  };
  const unread = notifs.filter(n => !n.read).length;
  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-header-row">
          <div>
            <div className="se-page-title">Notifications</div>
            <div className="se-page-desc">{unread} unread · All alerts for incidents, version updates, tasks, and coordination</div>
          </div>
          <button className="se-btn se-btn-secondary se-btn-sm" onClick={markAll}>Mark All Read</button>
        </div>
      </div>
      <div className="se-card" style={{ padding: 0 }}>
        {notifs.map((n, i) => (
          <div key={i} className={`se-notif-item ${n.read ? '' : 'unread'}`} onClick={() => markOne(i)}>
            <div className={`se-notif-icon ${n.type}`}>{n.icon}</div>
            <div className="se-notif-content">
              <div className="se-notif-title">{n.title}</div>
              <div className="se-notif-desc">{n.desc}</div>
              <div className="se-notif-time">{n.time}</div>
            </div>
            {!n.read && <div className="se-notif-dot-unread" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   PAGE: PROFILE
   ============================================================ */
function PageProfile() {
  return (
    <div>
      <div className="se-page-header">
        <div className="se-page-title">My Profile</div>
        <div className="se-page-desc">Account settings and role information</div>
      </div>
      <div className="se-grid-2">
        <div className="se-card">
          <div className="se-flex se-items-center se-gap-10" style={{ marginBottom: 20, gap: 16 }}>
            <div className="se-avatar-lg">RS</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Rajesh Sharma</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Structural Engineer · ID: SE-004</div>
              <div style={{ marginTop: 6 }}><Badge variant="blue">Active</Badge></div>
            </div>
          </div>
          <hr className="se-divider" />
          {[['Email', 'rajesh.sharma@firm.in'], ['Phone', '+91 98765 43210'], ['Role', 'Structural Engineer'], ['Department', 'Design & Engineering'], ['Experience', '9 Years'], ['Joined', 'March 2021']].map(([k, v]) => (
            <div key={k} className="se-flex se-justify-bet" style={{ fontSize: 13, marginBottom: 10 }}>
              <span className="se-text-muted">{k}</span>
              <span className={k === 'Role' ? 'se-fw-600' : ''}>{v}</span>
            </div>
          ))}
          <hr className="se-divider" />
          <button className="se-btn se-btn-secondary se-btn-sm" style={{ width: '100%' }}>Edit Profile</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="se-card">
            <div className="se-card-title" style={{ marginBottom: 12 }}>Module Access</div>
            {[['Drawings & Version Control', 'closed'], ['Incident Queue', 'closed'], ['Task Queue', 'closed'], ['Team Coordination', 'closed'], ['Daily Logs', 'closed'], ['Client Portal', 'gray'], ['BOQ / QS', 'gray']].map(([mod, v]) => (
              <div key={mod} className="se-flex se-justify-bet se-items-center" style={{ fontSize: 13, marginBottom: 8 }}>
                <span>{mod}</span>
                <Badge variant={v}>{v === 'closed' ? 'Full Access' : 'View Only'}</Badge>
              </div>
            ))}
          </div>
          <div className="se-card">
            <div className="se-card-title" style={{ marginBottom: 12 }}>Active Projects</div>
            {[['Prestige Towers Phase 2', 'blue', 'Lead'], ['Brigade Residency Block C', 'purple', 'Support'], ['Sobha Metro Homes', 'gray', 'Review']].map(([p, v, role]) => (
              <div key={p} className="se-flex se-justify-bet se-items-center" style={{ fontSize: 13, marginBottom: 8 }}>
                <span>{p}</span><Badge variant={v}>{role}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function StructuralEngineerDashboard() {
  const [activePage, setActivePage]   = useState('dashboard');
  const [incidents, setIncidents]     = useState(INCIDENTS_DATA);
  const [tasks, setTasks]             = useState(TASKS_DATA);
  const [notifs, setNotifs]           = useState(NOTIFS_DATA);
  const [toasts, setToasts]           = useState([]);
  const [selectedDoc, setSelectedDoc] = useState('');
  const [detailInc, setDetailInc]     = useState(null);

  // Modals
  const [uploadOpen, setUploadOpen]   = useState(false);
  const [incOpen, setIncOpen]         = useState(false);
  const [taskOpen, setTaskOpen]       = useState(false);
  const [verOpen, setVerOpen]         = useState(false);
  const [logOpen, setLogOpen]         = useState(false);
  const [coordOpen, setCoordOpen]     = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);

  // Toast system
  const addToast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const openVersionHistory = (name) => { setSelectedDoc(name); setVerOpen(true); };
  const openDetail = (idx) => { setDetailInc(idx); setDetailOpen(true); };

  const unread = notifs.filter(n => !n.read).length;

  const NAV_ITEMS = [
    { id: 'dashboard',    icon: '⬡',  label: 'Dashboard',         section: 'main' },
    { id: 'documents',    icon: '📐', label: 'Drawings & Docs',    section: 'main', badge: null },
    { id: 'incidents',    icon: '⚠',  label: 'Incident Queue',     section: 'main', badge: incidents.filter(i => i.status !== 'closed').length, badgeClass: '' },
    { id: 'tasks',        icon: '☑',  label: 'Task Queue',         section: 'main', badge: tasks.filter(t => !t.done).length, badgeClass: 'amber' },
    { id: 'coordination', icon: '🔗', label: 'Team Coordination',  section: 'coord' },
    { id: 'dailylogs',    icon: '📋', label: 'Daily Logs',         section: 'coord' },
    { id: 'notifications',icon: '🔔', label: 'Notifications',      section: 'coord', badge: unread, badgeClass: '' },
  ];

  const pageMap = {
    dashboard:    <PageDashboard onNav={setActivePage} openUpload={() => setUploadOpen(true)} openIncident={() => setIncOpen(true)} openVersionHistory={openVersionHistory} />,
    documents:    <PageDocuments openUpload={() => setUploadOpen(true)} openVersionHistory={openVersionHistory} />,
    incidents:    <PageIncidents incidents={incidents} setIncidents={setIncidents} openIncidentModal={() => setIncOpen(true)} openDetailFor={openDetail} toast={addToast} />,
    tasks:        <PageTasks tasks={tasks} setTasks={setTasks} openTaskModal={() => setTaskOpen(true)} toast={addToast} />,
    coordination: <PageCoordination openCoordModal={() => setCoordOpen(true)} />,
    dailylogs:    <PageDailyLogs openLogModal={() => setLogOpen(true)} />,
    notifications:<PageNotifications notifs={notifs} setNotifs={setNotifs} toast={addToast} />,
    profile:      <PageProfile />,
  };

  const titles = { dashboard: 'Dashboard', documents: 'Drawings & Documents', incidents: 'Incident Queue', tasks: 'Task Queue', coordination: 'Team Coordination', dailylogs: 'Daily Logs', notifications: 'Notifications', profile: 'My Profile' };
  const crumbs = { dashboard: 'Overview', documents: 'All Documents', incidents: 'Queue', tasks: 'My Tasks', coordination: 'Cross-team', dailylogs: 'Progress Logs', notifications: 'All Alerts', profile: 'Account' };

  return (
    <div >
      

      {/* ── MAIN ── */}
      <div className="se-main">
        {/* Header */}
        <div className="se-header">
          <div className="se-header-left">
            <span className="se-header-title">{titles[activePage] || activePage}</span>
            <span className="se-header-sep">›</span>
            <span className="se-header-crumb">{crumbs[activePage] || ''}</span>
          </div>
          <div className="se-header-actions">
            <select className="se-project-select">
              <option>🏗 Prestige Towers — Phase 2</option>
              <option>🏗 Brigade Residency Block C</option>
              <option>🏗 Sobha Metro Homes</option>
            </select>
            <button className="se-btn-icon" onClick={() => setActivePage('notifications')}>
              🔔 {unread > 0 && <span className="se-notif-dot" />}
            </button>
            <button className="se-btn-icon">⚙</button>
            <div className="se-avatar" style={{ cursor: 'pointer' }} onClick={() => setActivePage('profile')}>RS</div>
          </div>
        </div>

        {/* Content */}
        <div className="se-content">
          {pageMap[activePage] || pageMap.dashboard}
        </div>
      </div>

      {/* ── MODALS ── */}
      <UploadModal
        open={uploadOpen} onClose={() => setUploadOpen(false)}
        onSubmit={() => addToast('Drawing uploaded. Team notified of latest version.', 'success')}
      />
      <IncidentModal
        open={incOpen} onClose={() => setIncOpen(false)}
        onSubmit={() => addToast('Incident raised. Assignee notified immediately.', 'success')}
      />
      <TaskModal
        open={taskOpen} onClose={() => setTaskOpen(false)}
        onSubmit={() => addToast('Task created and assigned.', 'success')}
      />
      <VersionModal
        open={verOpen} onClose={() => setVerOpen(false)}
        docName={selectedDoc}
        onUpload={() => setUploadOpen(true)}
      />
      <DailyLogModal
        open={logOpen} onClose={() => setLogOpen(false)}
        onSubmit={() => addToast('Daily log posted successfully.', 'success')}
      />
      <CoordModal
        open={coordOpen} onClose={() => setCoordOpen(false)}
        onSubmit={() => addToast('Coordination request sent to team.', 'success')}
      />
      <IncidentDetailModal
        open={detailOpen} onClose={() => setDetailOpen(false)}
        incident={detailInc !== null ? incidents[detailInc] : null}
        onResolve={() => {
          const updated = [...incidents];
          if (detailInc !== null) updated[detailInc] = { ...updated[detailInc], status: 'closed' };
          setIncidents(updated);
          addToast('Incident marked as resolved.', 'success');
        }}
        onComment={() => addToast('Comment added to incident.', 'info')}
      />

      {/* ── TOASTS ── */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}