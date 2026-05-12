import { useState, useEffect } from "react";
import "../../../styles/TeamManagement.css";
import { useProject } from "../../../context/ProjectContext";
import * as teamApi from "../../../api/teamApi";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const todayLabel = () => { const d = new Date(); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };

const AVATAR_PALETTES = [
  ["#fde68a","#92400e"], ["#bbf7d0","#14532d"], ["#bfdbfe","#1e3a8a"],
  ["#fecaca","#7f1d1d"], ["#e9d5ff","#581c87"], ["#fed7aa","#7c2d12"],
];
const palette = (name) => AVATAR_PALETTES[(name || "A").charCodeAt(0) % AVATAR_PALETTES.length];

export default function TeamManagement() {
  const { activeProject, PROJECTS, loading: projectsLoading } = useProject();
  const projectId = activeProject?.id ? String(activeProject.id) : null;

  const [team, setTeam]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [apiError, setApiError]     = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter]         = useState("All");
  const [search, setSearch]         = useState("");
  const [sortKey, setSortKey]       = useState("name");
  const [sortDir, setSortDir]       = useState(1);
  const [modal, setModal]           = useState(null);
  const [form, setForm]             = useState({});
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);

  const projectOptions = (PROJECTS || []).filter(p => p.id !== null);

  useEffect(() => {
    if (projectsLoading) return;
    if (activeProject === undefined) return;

    if (!projectId) {
      setTeam([]);
      setLoading(false);
      setApiError("No active project selected. Please select a project first.");
      return;
    }

    setLoading(true);
    setApiError(null);
    setSelectedId(null);

    teamApi.fetchTeam(projectId)
      .then((data) => {
        const enriched = data.map((m) => ({
          ...m,
          project_name:
            m.project_name ||
            projectOptions.find((p) => String(p.id) === String(m.project_id))?.name ||
            "",
          incidents: m.incidents || [],
        }));
        setTeam(enriched);
      })
      .catch((err) => {
        console.error("Failed to load team:", err);
        setApiError("Failed to load team members. Please check your connection.");
      })
      .finally(() => setLoading(false));
  }, [projectId, projectsLoading, activeProject]);

  const totalIncidents = team.reduce((a, t) => a + (t.incidents?.length || 0), 0);

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  }

  const visible = team
    .filter(t =>
      (filter === "All" || t.type === filter) &&
      (t.name || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const keyMap = { project: "project_name" };
      const k = keyMap[sortKey] || sortKey;
      const av = (a[k] || "").toString().toLowerCase();
      const bv = (b[k] || "").toString().toLowerCase();
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });

  const selected = team.find(t => t.id === selectedId) || null;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2600); }

  function openModal(type, memberId) {
    const member = team.find(t => t.id === memberId);
    if (type === "edit" && member) {
      setForm({
        name:       member.name,
        role:       member.role,
        status:     member.status,
        projectId:  String(member.project_id || projectId || ""),
        wage:       member.wage        || "",
        daysWorked: member.days_worked || "",
        tasks:      member.tasks_count || "",
      });
    } else {
      setForm({
        type:      "Staff",
        status:    "Active",
        priority:  "Normal",
        severity:  "Low",
        projectId: String(projectId || ""),
      });
    }
    setModal({ type, memberId });
  }

  function closeModal() { if (saving) return; setModal(null); setForm({}); }
  function setF(k, v)   { setForm(f => ({ ...f, [k]: v })); }

  async function submitAdd() {
    if (!form.name?.trim() || !form.role?.trim()) {
      showToast("Please fill Name and Role"); return;
    }
    if (!form.projectId) { showToast("Please select a project"); return; }

    setSaving(true);
    try {
      const newMember = await teamApi.addMember({
        name:        form.name.trim(),
        role:        form.role.trim(),
        type:        form.type     || "Staff",
        status:      form.status   || "Active",
        project_id:  form.projectId,
        wage:        form.type === "Labour" ? parseInt(form.wage)       || 0 : null,
        days_worked: form.type === "Labour" ? parseInt(form.daysWorked) || 0 : 0,
      });

      const matchedProject = projectOptions.find(
        p => String(p.id) === String(form.projectId)
      );
      const memberWithProject = {
        ...newMember,
        incidents:    newMember.incidents || [],
        project_name: newMember.project_name || matchedProject?.name || "",
      };

      setTeam(p => [...p, memberWithProject]);
      setSelectedId(newMember.id);
      closeModal();
      showToast(`${newMember.name} added to the team`);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to add member");
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(id) {
    const member = team.find(t => t.id === id);
    if (!form.projectId) { showToast("Please select a project"); return; }

    setSaving(true);
    try {
      const updated = await teamApi.updateMember(id, {
        name:        form.name?.trim()  || member.name,
        role:        form.role?.trim()  || member.role,
        status:      form.status        || member.status,
        project_id:  form.projectId,
        wage:        member.type === "Labour" ? parseInt(form.wage)       || 0 : null,
        days_worked: member.type === "Labour" ? parseInt(form.daysWorked) || 0 : 0,
        tasks_count: member.type !== "Labour" ? parseInt(form.tasks)      || 0 : 0,
      });

      const matchedProject = projectOptions.find(
        p => String(p.id) === String(form.projectId)
      );
      const updatedWithProject = {
        ...updated,
        project_name:
          updated.project_name ||
          matchedProject?.name ||
          member.project_name || "",
      };

      setTeam(p => p.map(t => t.id === id
        ? { ...t, ...updatedWithProject, incidents: t.incidents }
        : t
      ));
      closeModal();
      showToast("Changes saved");
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function submitDelete(id) {
    const m = team.find(t => t.id === id);
    setSaving(true);
    try {
      await teamApi.deleteMember(id);
      setTeam(p => p.filter(t => t.id !== id));
      if (selectedId === id) setSelectedId(null);
      closeModal();
      showToast(`${m?.name || "Member"} removed`);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to remove member");
    } finally {
      setSaving(false);
    }
  }

  async function submitTask(id) {
    if (!form.task?.trim()) { showToast("Please enter a task description"); return; }
    setSaving(true);
    try {
      const res = await teamApi.assignTask(id, {
        description: form.task.trim(),
        priority:    form.priority || "Normal",
        due_date:    form.due      || null,
      });
      setTeam(p => p.map(t => t.id === id
        ? { ...t, tasks_count: res.tasks_count ?? (t.tasks_count || 0) + 1 }
        : t
      ));
      closeModal();
      showToast(`Task assigned to ${team.find(t => t.id === id)?.name}`);
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to assign task");
    } finally {
      setSaving(false);
    }
  }

  async function submitIncident(id) {
    if (!form.incident?.trim()) { showToast("Please describe the incident"); return; }
    setSaving(true);
    try {
      await teamApi.logIncident(id, {
        text:     form.incident.trim(),
        severity: form.severity || "Low",
      });
      setTeam(p => p.map(t => t.id === id
        ? { ...t, incidents: [{ text: form.incident.trim(), date: todayLabel() }, ...(t.incidents || [])] }
        : t
      ));
      closeModal();
      showToast("Incident logged");
    } catch (err) {
      console.error(err);
      showToast(err?.response?.data?.error || "Failed to log incident");
    } finally {
      setSaving(false);
    }
  }

  const SortArrow = ({ k }) => (
    <span className={`sort-arrow ${sortKey === k ? "sa-on" : ""}`}>
      {sortKey === k ? (sortDir === 1 ? "↑" : "↓") : "⇅"}
    </span>
  );

  const ProjectDropdown = () => (
    <div className="fg">
      <label>Project *</label>
      <select
        className="fi"
        value={form.projectId || ""}
        onChange={e => setF("projectId", e.target.value)}
      >
        <option value="">-- Select Project --</option>
        {projectOptions.map(p => (
          <option key={p.id} value={String(p.id)}>{p.name}</option>
        ))}
      </select>
    </div>
  );

  if (projectsLoading || loading) {
    return (
      <div className="tm">
        <div className="tm-header">
          <div>
            <h1 className="tm-title">Team Management</h1>
            <p className="tm-subtitle">Manage workforce, roles, incidents &amp; assignments</p>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:300, flexDirection:"column", gap:12 }}>
          <div className="tm-spinner" />
          <p style={{ color:"#6b7280", fontSize:14 }}>Loading team members…</p>
        </div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="tm">
        <div className="tm-header">
          <div>
            <h1 className="tm-title">Team Management</h1>
            <p className="tm-subtitle">Manage workforce, roles, incidents &amp; assignments</p>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:300, flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:36 }}>⚠️</div>
          <p style={{ color:"#ef4444", fontSize:14, textAlign:"center" }}>{apiError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tm">
      <div className="tm-header">
        <div>
          <h1 className="tm-title">Team Management</h1>
          <p className="tm-subtitle">Manage workforce, roles, incidents &amp; assignments</p>
        </div>
        <button className="btn-add" onClick={() => openModal("add")}>＋ Add Member</button>
      </div>

      <div className="tm-stats">
        {[
          { val: team.length,                                  label: "Total",     color: "#3b82f6", bg: "#eff6ff" },
          { val: team.filter(t => t.type === "Labour").length, label: "Labour",    color: "#f59e0b", bg: "#fffbeb" },
          { val: team.filter(t => t.type === "Staff").length,  label: "Staff",     color: "#8b5cf6", bg: "#f5f3ff" },
          { val: totalIncidents,                               label: "Incidents", color: "#ef4444", bg: "#fef2f2" },
        ].map(s => (
          <div className="stat-card" key={s.label} style={{"--sc": s.color, "--sb": s.bg}}>
            <div className="stat-num">{s.val}</div>
            <div className="stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="tm-controls">
        <div className="search-box">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" className="search-ico">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            className="search-in"
            placeholder="Search employee…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="search-clr" onClick={() => setSearch("")}>×</button>}
        </div>
        <div className="filter-tabs">
          {["All","Labour","Staff"].map(f => (
            <button key={f} className={`ftab ${filter === f ? "ftab-on" : ""}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </div>

      <div className="tm-body">
        <div className="tm-table-card">
          <table className="tm-table">
            <thead>
              <tr>
                {[["name","Name"],["role","Role"],["type","Type"],["project","Project"],["status","Status"]].map(([k,l]) => (
                  <th key={k} onClick={() => handleSort(k)} className={k === "project" ? "col-hide" : ""}>
                    {l}<SortArrow k={k}/>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="no-results">
                    <div>🔍</div>
                    <div>{team.length === 0 ? "No team members yet. Add one to get started." : "No members match your search"}</div>
                  </td>
                </tr>
              ) : visible.map(t => {
                const [bg, fg] = palette(t.name);
                return (
                  <tr
                    key={t.id}
                    className={`tr-row ${t.id === selectedId ? "tr-sel" : ""}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <td>
                      <div className="name-cell">
                        <span className="mini-av" style={{background: bg, color: fg}}>
                          {(t.name || "?").split(" ").map(w => w[0]).join("").slice(0,2)}
                        </span>
                        <span className="name-str">{t.name}</span>
                      </div>
                    </td>
                    <td className="td-dim">{t.role}</td>
                    <td><span className={`pill pill-${(t.type || "").toLowerCase()}`}>{t.type}</span></td>
                    <td className="td-dim col-hide">{t.project_name || "—"}</td>
                    <td>
                      <span className={`chip chip-${t.status === "Active" ? "active" : "leave"}`}>
                        <i className="pip"/>{t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="table-foot">{visible.length} of {team.length} members shown</div>
        </div>

        <div className="tm-panel">
          {!selected ? (
            <div className="panel-empty">
              <div className="pe-icon">👥</div>
              <div className="pe-text">Select a member<br/>to view details</div>
            </div>
          ) : (() => {
            const [bg, fg] = palette(selected.name);
            const incs = selected.incidents || [];
            return (
              <div className="panel-scroll">
                <div className="p-profile">
                  <div className="p-av" style={{background: bg, color: fg}}>
                    {(selected.name || "?").split(" ").map(w => w[0]).join("").slice(0,2)}
                  </div>
                  <div className="p-info">
                    <div className="p-name">{selected.name}</div>
                    <div className="p-role">{selected.role}</div>
                    <span className={`pill pill-${(selected.type || "").toLowerCase()}`} style={{marginTop:6, display:"inline-block"}}>
                      {selected.type}
                    </span>
                  </div>
                </div>

                <div className="p-divider"/>

                <div className="p-sec-label">Assignment</div>
                <div className="p-kv"><span>Project</span><b>{selected.project_name || "—"}</b></div>
                <div className="p-kv">
                  <span>Status</span>
                  <span className={`chip chip-${selected.status === "Active" ? "active" : "leave"}`}>
                    <i className="pip"/>{selected.status}
                  </span>
                </div>

                <div className="p-divider"/>

                {selected.type === "Labour" ? (
                  <>
                    <div className="p-sec-label">Wage Details</div>
                    <div className="p-kv"><span>Daily Wage</span><b>₹{selected.wage || 0}</b></div>
                    <div className="p-kv"><span>Days Worked</span><b>{selected.days_worked || 0}</b></div>
                    <div className="wage-box">
                      <span>Total Earned</span>
                      <span className="wage-val">
                        ₹{((selected.wage || 0) * (selected.days_worked || 0)).toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-sec-label">Work Summary</div>
                    <div className="metrics">
                      <div className="met met-blue">
                        <div className="met-n">{selected.tasks_count || 0}</div>
                        <div className="met-l">Tasks</div>
                      </div>
                      <div className="met met-red">
                        <div className="met-n">{incs.length}</div>
                        <div className="met-l">Incidents</div>
                      </div>
                      {selected.hours ? (
                        <div className="met met-purple">
                          <div className="met-n">{selected.hours}</div>
                          <div className="met-l">Hours</div>
                        </div>
                      ) : null}
                    </div>
                  </>
                )}

                {incs.length > 0 && (
                  <>
                    <div className="p-divider"/>
                    <div className="p-sec-label">Incident Log</div>
                    {incs.map((inc, i) => (
                      <div className="inc-row" key={i}>
                        <span className="inc-pip"/>
                        <div>
                          <div className="inc-txt">{inc.text}</div>
                          <div className="inc-date">{inc.date}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="p-divider"/>

                <div className="p-sec-label">Actions</div>
                <div className="act-grid">
                  {selected.type !== "Labour" && (
                    <button className="act act-blue" onClick={() => openModal("task", selected.id)}>📋 Assign Task</button>
                  )}
                  <button className="act act-amber" onClick={() => openModal("incident", selected.id)}>⚠ Incident</button>
                  <button className="act act-ghost" onClick={() => openModal("edit", selected.id)}>✏ Edit</button>
                  <button className="act act-red"   onClick={() => openModal("delete", selected.id)}>🗑 Remove</button>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {modal && (
        <div className="mo-backdrop" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="mo-box">
            <div className="mo-head">
              <div>
                <div className="mo-title">
                  {modal.type === "add"      && "Add New Member"}
                  {modal.type === "edit"     && "Edit Member"}
                  {modal.type === "delete"   && "Remove Member"}
                  {modal.type === "task"     && "Assign Task"}
                  {modal.type === "incident" && "Raise Incident"}
                </div>
                {modal.type !== "delete" && (
                  <div className="mo-sub">
                    {modal.type === "add"      && "Fill in the new team member's details"}
                    {modal.type === "edit"     && `Editing ${team.find(t => t.id === modal.memberId)?.name}`}
                    {modal.type === "task"     && `For ${team.find(t => t.id === modal.memberId)?.name}`}
                    {modal.type === "incident" && `For ${team.find(t => t.id === modal.memberId)?.name}`}
                  </div>
                )}
              </div>
              <button className="mo-close" onClick={closeModal}>✕</button>
            </div>

            <div className="mo-body">
              {modal.type === "add" && (
                <>
                  <div className="frow">
                    <div className="fg">
                      <label>Full Name *</label>
                      <input className="fi" placeholder="e.g. Arjun Nair" value={form.name || ""} onChange={e => setF("name", e.target.value)}/>
                    </div>
                    <div className="fg">
                      <label>Role *</label>
                      <input className="fi" placeholder="e.g. Electrician" value={form.role || ""} onChange={e => setF("role", e.target.value)}/>
                    </div>
                  </div>
                  <div className="frow">
                    <div className="fg">
                      <label>Type</label>
                      <select className="fi" value={form.type || "Staff"} onChange={e => setF("type", e.target.value)}>
                        <option>Staff</option>
                        <option>Labour</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label>Status</label>
                      <select className="fi" value={form.status || "Active"} onChange={e => setF("status", e.target.value)}>
                        <option>Active</option>
                        <option>On Leave</option>
                      </select>
                    </div>
                  </div>
                  <ProjectDropdown />
                  {form.type === "Labour" && (
                    <div className="frow">
                      <div className="fg">
                        <label>Daily Wage (₹)</label>
                        <input className="fi" type="number" min="0" value={form.wage || ""} onChange={e => setF("wage", e.target.value)}/>
                      </div>
                      <div className="fg">
                        <label>Days Worked</label>
                        <input className="fi" type="number" min="0" value={form.daysWorked || ""} onChange={e => setF("daysWorked", e.target.value)}/>
                      </div>
                    </div>
                  )}
                </>
              )}

              {modal.type === "edit" && (() => {
                const t = team.find(m => m.id === modal.memberId);
                return (
                  <>
                    <div className="frow">
                      <div className="fg">
                        <label>Full Name</label>
                        <input className="fi" value={form.name || ""} onChange={e => setF("name", e.target.value)}/>
                      </div>
                      <div className="fg">
                        <label>Role</label>
                        <input className="fi" value={form.role || ""} onChange={e => setF("role", e.target.value)}/>
                      </div>
                    </div>
                    <div className="fg">
                      <label>Status</label>
                      <select className="fi" value={form.status || "Active"} onChange={e => setF("status", e.target.value)}>
                        <option>Active</option>
                        <option>On Leave</option>
                      </select>
                    </div>
                    <ProjectDropdown />
                    {t?.type === "Labour" ? (
                      <div className="frow">
                        <div className="fg">
                          <label>Daily Wage (₹)</label>
                          <input className="fi" type="number" min="0" value={form.wage || ""} onChange={e => setF("wage", e.target.value)}/>
                        </div>
                        <div className="fg">
                          <label>Days Worked</label>
                          <input className="fi" type="number" min="0" value={form.daysWorked || ""} onChange={e => setF("daysWorked", e.target.value)}/>
                        </div>
                      </div>
                    ) : (
                      <div className="fg">
                        <label>Tasks Assigned</label>
                        <input className="fi" type="number" min="0" value={form.tasks || ""} onChange={e => setF("tasks", e.target.value)}/>
                      </div>
                    )}
                  </>
                );
              })()}

              {modal.type === "delete" && (
                <div className="del-confirm">
                  <div className="del-ico">🗑</div>
                  <p>Remove <strong>{team.find(t => t.id === modal.memberId)?.name}</strong> from the team?</p>
                  <p className="del-note">This cannot be undone.</p>
                </div>
              )}

              {modal.type === "task" && (
                <>
                  <div className="fg">
                    <label>Task Description</label>
                    <input className="fi" placeholder="e.g. Inspect foundation rebar" value={form.task || ""} onChange={e => setF("task", e.target.value)}/>
                  </div>
                  <div className="frow">
                    <div className="fg">
                      <label>Priority</label>
                      <select className="fi" value={form.priority || "Normal"} onChange={e => setF("priority", e.target.value)}>
                        <option>Normal</option>
                        <option>High</option>
                        <option>Urgent</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label>Due Date</label>
                      <input className="fi" type="date" value={form.due || ""} onChange={e => setF("due", e.target.value)}/>
                    </div>
                  </div>
                </>
              )}

              {modal.type === "incident" && (
                <>
                  <div className="fg">
                    <label>Incident Description</label>
                    <input className="fi" placeholder="e.g. PPE not worn at site" value={form.incident || ""} onChange={e => setF("incident", e.target.value)}/>
                  </div>
                  <div className="fg">
                    <label>Severity</label>
                    <select className="fi" value={form.severity || "Low"} onChange={e => setF("severity", e.target.value)}>
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="mo-foot">
              <button className="mo-cancel" onClick={closeModal} disabled={saving}>Cancel</button>
              {modal.type === "add"      && <button className="mo-ok"           onClick={submitAdd}                           disabled={saving}>{saving ? "Adding…"    : "Add Member"  }</button>}
              {modal.type === "edit"     && <button className="mo-ok"           onClick={() => submitEdit(modal.memberId)}     disabled={saving}>{saving ? "Saving…"    : "Save Changes"}</button>}
              {modal.type === "delete"   && <button className="mo-ok mo-ok-red" onClick={() => submitDelete(modal.memberId)}   disabled={saving}>{saving ? "Removing…"  : "Yes, Remove"  }</button>}
              {modal.type === "task"     && <button className="mo-ok"           onClick={() => submitTask(modal.memberId)}     disabled={saving}>{saving ? "Assigning…" : "Assign Task"  }</button>}
              {modal.type === "incident" && <button className="mo-ok mo-ok-red" onClick={() => submitIncident(modal.memberId)} disabled={saving}>{saving ? "Logging…"   : "Log Incident" }</button>}
            </div>
          </div>
        </div>
      )}

      {toast && <div className="tm-toast">{toast}</div>}
    </div>
  );
}