import { useEffect, useState, useCallback } from "react";
import * as teamApi from "../api/teamApi";

// Compact "who is on my project" card for role dashboards. Read-only: the API only returns projects
// you belong to and never sends wages, ID documents or incident/task notes.
const STATUS_COLOR = { Active: "#16a34a", "On Leave": "#d97706", Suspended: "#d97706" };
const PREVIEW = 5;

const S = {
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, margin: "0 0 16px", color: "#0f172a", boxSizing: "border-box" },
  head: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 },
  title: { margin: 0, fontSize: 16, fontWeight: 700 },
  muted: { color: "#64748b", fontSize: 12.5 },
  tabs: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 },
  groupTitle: { fontSize: 11.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", color: "#475569", marginBottom: 6 },
  row: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid #f1f5f9" },
  you: { fontSize: 10.5, padding: "1px 7px", borderRadius: 999, background: "#eff6ff", color: "#1d4ed8", fontWeight: 700 },
  link: { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 12.5, padding: "6px 0", fontWeight: 600 },
};
const tab = (active) => ({ border: "1px solid " + (active ? "#2563eb" : "#cbd5e1"), background: active ? "#eff6ff" : "#fff",
  color: active ? "#1d4ed8" : "#334155", borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" });

function Group({ title, people }) {
  const [all, setAll] = useState(false);
  if (!people.length) return null;
  const shown = all ? people : people.slice(0, PREVIEW);
  return (
    <div>
      <div style={S.groupTitle}>{title} ({people.length})</div>
      {shown.map((p) => {
        const note = p.detail && p.detail !== p.role ? ` · ${p.detail}` : "";
        return (
          <div style={S.row} key={p.key}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{p.name} {p.is_me && <span style={S.you}>You</span>}</div>
              <div style={S.muted}>{p.role}{note}</div>
            </div>
            {p.status !== "Active" && <span style={{ fontSize: 11.5, fontWeight: 600, color: STATUS_COLOR[p.status] || "#64748b" }}>{p.status}</span>}
          </div>
        );
      })}
      {people.length > PREVIEW && (
        <button type="button" style={S.link} onClick={() => setAll((v) => !v)}>
          {all ? "Show fewer" : `Show all ${people.length}`}
        </button>
      )}
    </div>
  );
}

export default function ProjectTeamCard({ title = "My Project Team" }) {
  const [projects, setProjects] = useState(null); // null = loading
  const [error, setError] = useState("");
  const [active, setActive] = useState(0);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await teamApi.fetchMyProjectTeams();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      // Show why it failed: auth replies use "message", the controller uses "error".
      const status = e?.response?.status;
      const detail = e?.response?.data?.error || e?.response?.data?.message;
      setError(
        detail ? `${detail}${status ? ` (HTTP ${status})` : ""}`
        : status ? `Could not load your project team (HTTP ${status}).`
        : "Could not reach the server. Check that the backend is running."
      );
      setProjects([]);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (projects === null) return <div style={{ ...S.card, ...S.muted }}>Loading your project team…</div>;
  if (error) return <div style={{ ...S.card, ...S.muted }}>{error} <button type="button" style={S.link} onClick={load}>Retry</button></div>;
  if (!projects.length)
    return (
      <div style={S.card}>
        <h3 style={S.title}>{title}</h3>
        <div style={S.muted}>You are not on a project team yet. Once you are assigned to a project or your Project Manager adds you, your teammates will appear here.</div>
      </div>
    );

  const p = projects[Math.min(active, projects.length - 1)];
  const staff = p.people.filter((x) => x.type === "Staff");
  const labour = p.people.filter((x) => x.type === "Labour");
  return (
    <div style={S.card}>
      <div style={S.head}>
        <h3 style={S.title}>{title}</h3>
        <span style={S.muted}>Project Manager: {p.project_manager || "Not assigned"} · {staff.length} staff · {labour.length} labour</span>
      </div>
      {projects.length > 1 && (
        <div style={S.tabs}>
          {projects.map((x, i) => (
            <button type="button" key={x.project_id} style={tab(i === active)} onClick={() => setActive(i)}>{x.project_name}</button>
          ))}
        </div>
      )}
      {projects.length === 1 && <div style={{ ...S.muted, marginBottom: 8 }}>{p.project_name}</div>}
      <div style={S.grid}>
        <Group title="Staff" people={staff} />
        <Group title="Labour" people={labour} />
      </div>
    </div>
  );
}
