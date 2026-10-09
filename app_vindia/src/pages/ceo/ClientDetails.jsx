// src/pages/ceo/ClientDetails.jsx
// CEO-only detail view for one client: profile, every associated project,
// project team, financial summary and recent project activity.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Mail,
  Phone,
  CalendarDays,
  Hash,
  FolderOpen,
  Users,
  Wallet,
  Activity,
  ExternalLink,
  Info,
  CircleAlert,
} from "lucide-react";
import {
  fetchClientDetails,
  fetchClientActivity,
  getApiErrorMessage,
} from "../../services/ceoClientService";
import "./ClientManagement.css";

/* ── helpers ─────────────────────────────────────────────── */
const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const titleCase = (s) =>
  s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).toLowerCase() : "—";

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";

const projectStatusClass = (status) => {
  const s = String(status || "").trim().toLowerCase();
  if (s === "active" || s === "in progress" || s === "in_progress")
    return "cm-pill cm-pill--info";
  if (s === "completed") return "cm-pill cm-pill--success";
  if (s === "pending") return "cm-pill cm-pill--warning";
  if (s === "rejected" || s === "cancelled") return "cm-pill cm-pill--danger";
  return "cm-pill cm-pill--neutral";
};

const accountStatusClass = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "cm-pill cm-pill--success";
  if (s === "pending") return "cm-pill cm-pill--warning";
  if (["inactive", "suspended", "blocked", "disabled"].includes(s))
    return "cm-pill cm-pill--danger";
  return "cm-pill cm-pill--neutral";
};

const priorityClass = (p) => {
  const s = String(p || "").toLowerCase();
  if (["critical", "high", "urgent"].includes(s)) return "cm-pill cm-pill--danger";
  if (s === "medium") return "cm-pill cm-pill--warning";
  return "cm-pill cm-pill--neutral";
};

const TABS = [
  { key: "projects", label: "Projects", icon: FolderOpen },
  { key: "team", label: "Project Team", icon: Users },
  { key: "finance", label: "Financials", icon: Wallet },
  { key: "activity", label: "Activity", icon: Activity },
];

/* ── small building blocks ───────────────────────────────── */
const Stat = ({ label, value, sub, tone = "blue" }) => (
  <div className={`cm-stat cm-stat--${tone}`}>
    <span className="cm-stat__label">{label}</span>
    <span className="cm-stat__value">{value}</span>
    {sub && <span className="cm-stat__sub">{sub}</span>}
  </div>
);

const ProgressBar = ({ value }) => {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="cm-progress" title={`${v}%`}>
      <div className="cm-progress__track">
        <div className="cm-progress__fill" style={{ width: `${v}%` }} />
      </div>
      <span className="cm-progress__label">{v}%</span>
    </div>
  );
};

const SectionError = ({ message }) => (
  <div className="cm-inline-note cm-inline-note--warn">
    <CircleAlert size={15} />
    <span>{message || "This section could not be loaded."}</span>
  </div>
);

const Empty = ({ children }) => <p className="cm-empty">{children}</p>;

/* ── component ───────────────────────────────────────────── */
function ClientDetails() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState(null);
  const [activity, setActivity] = useState(null);
  const [activityError, setActivityError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("projects");

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      setActivityError("");
      try {
        const [d, a] = await Promise.allSettled([
          fetchClientDetails(clientId, signal),
          fetchClientActivity(clientId, signal),
        ]);

        if (d.status === "rejected") throw d.reason;
        setDetail(d.value);

        if (a.status === "fulfilled") setActivity(a.value);
        else {
          setActivity(null);
          setActivityError(
            getApiErrorMessage(a.reason, "Project activity could not be loaded."),
          );
        }
      } catch (err) {
        if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
        setDetail(null);
        setError(getApiErrorMessage(err, "Failed to load client details."));
      } finally {
        setLoading(false);
      }
    },
    [clientId],
  );

  useEffect(() => {
    const controller = new AbortController();
    setTab("projects");
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const back = () => navigate("/ceo/clients");

  /* ── loading / error ── */
  if (loading && !detail) {
    return (
      <div className="cm-page">
        <button type="button" className="cm-back" onClick={back}>
          <ArrowLeft size={16} /> Back to Client Directory
        </button>
        <div className="cm-panel cm-panel--pad">
          <span className="cm-skeleton cm-skeleton--title" />
          <span className="cm-skeleton cm-skeleton--row" />
          <span className="cm-skeleton cm-skeleton--row" />
          <span className="cm-skeleton cm-skeleton--row" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="cm-page">
        <button type="button" className="cm-back" onClick={back}>
          <ArrowLeft size={16} /> Back to Client Directory
        </button>
        <div className="cm-panel">
          <div className="cm-state cm-state--error" role="alert">
            <AlertTriangle size={28} />
            <h3>Unable to load this client</h3>
            <p>{error || "Client details are unavailable."}</p>
            <div className="cm-state__actions">
              <button type="button" className="cm-btn cm-btn--primary" onClick={() => load()}>
                <RefreshCw size={15} /> Try again
              </button>
              <button type="button" className="cm-btn cm-btn--outline" onClick={back}>
                Back to directory
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { profile, counts, financial_summary: fin, projects } = detail;

  /* ── tab panels ── */
  const projectsPanel = projects.length === 0 ? (
    <Empty>
      No project has been assigned to this client yet. Projects are linked when
      a client account is selected during project creation.
    </Empty>
  ) : (
    <div className="cm-table-wrap">
      <table className="cm-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Project</th>
            <th>Location</th>
            <th>Type</th>
            <th>Start</th>
            <th>Expected end</th>
            <th className="cm-num">Budget</th>
            <th>Progress</th>
            <th>Status</th>
            <th className="cm-actions-col">Open</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id}>
              <td data-label="ID"><span className="cm-code">PRJ-{String(p.id).padStart(4, "0")}</span></td>
              <td data-label="Project"><strong>{p.name}</strong></td>
              <td data-label="Location">{p.location || "—"}</td>
              <td data-label="Type">{p.building_type || "—"}</td>
              <td data-label="Start">{fmtDate(p.start_date)}</td>
              <td data-label="Expected end">{fmtDate(p.end_date)}</td>
              <td data-label="Budget" className="cm-num">{inr(p.budget)}</td>
              <td data-label="Progress"><ProgressBar value={p.progress} /></td>
              <td data-label="Status">
                <span className={projectStatusClass(p.status)}>{p.status || "—"}</span>
              </td>
              <td data-label="Open" className="cm-actions-col">
                <Link
                  to="/project-manager/dashboard"
                  state={{ projectId: p.id }}
                  className="cm-btn cm-btn--outline cm-btn--sm"
                >
                  <ExternalLink size={13} /> Project
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const teamPanel = projects.length === 0 ? (
    <Empty>No projects, so there is no project team to show.</Empty>
  ) : (
    <div className="cm-team-grid">
      {projects.map((p) => {
        const people = [...p.team.core, ...p.team.members];
        return (
          <article className="cm-team-card" key={p.id}>
            <header className="cm-team-card__head">
              <h4>{p.name}</h4>
              <span className={projectStatusClass(p.status)}>{p.status || "—"}</span>
            </header>
            {people.length === 0 ? (
              <Empty>No team members are assigned to this project.</Empty>
            ) : (
              <ul className="cm-team-list">
                {people.map((m, i) => (
                  <li key={`${m.role}-${m.name}-${i}`}>
                    <span className="cm-avatar cm-avatar--sm">{initials(m.name)}</span>
                    <span className="cm-team-list__text">
                      <span className="cm-team-list__name">{m.name}</span>
                      <span className="cm-team-list__role">{m.role || "Team member"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </div>
  );

  const ledgerDiffers =
    fin.payments_ledger !== fin.payments_project_record ||
    fin.expenditure_ledger !== fin.expenditure_project_record;

  const financePanel = projects.length === 0 ? (
    <Empty>No projects, so there are no financial records to show.</Empty>
  ) : (
    <>
      <div className="cm-stats">
        <Stat label="Total project budget" value={inr(fin.total_budget)} tone="blue" />
        <Stat
          label="Recorded expenditure"
          value={inr(fin.expenditure_ledger)}
          sub="Approved / paid expenses"
          tone="amber"
        />
        <Stat
          label="Client payments received"
          value={inr(fin.payments_ledger)}
          sub="Completed incoming payments"
          tone="green"
        />
        <Stat
          label="Outstanding invoices"
          value={inr(fin.outstanding_invoices)}
          sub={`${fin.open_invoices} open${
            fin.overdue_invoices ? ` · ${fin.overdue_invoices} overdue` : ""
          }`}
          tone={fin.overdue_invoices ? "red" : "indigo"}
        />
      </div>

      <div className="cm-table-wrap">
        <table className="cm-table">
          <thead>
            <tr>
              <th>Project</th>
              <th className="cm-num">Budget</th>
              <th className="cm-num">Expenditure</th>
              <th className="cm-num">Payments received</th>
              <th className="cm-num">Outstanding invoices</th>
              <th className="cm-num">Project record: spent</th>
              <th className="cm-num">Project record: client paid</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td data-label="Project"><strong>{p.name}</strong></td>
                <td data-label="Budget" className="cm-num">{inr(p.financials.budget)}</td>
                <td data-label="Expenditure" className="cm-num">{inr(p.financials.expenditure_ledger)}</td>
                <td data-label="Payments received" className="cm-num">{inr(p.financials.payments_ledger)}</td>
                <td data-label="Outstanding invoices" className="cm-num">
                  {inr(p.financials.outstanding_invoices)}
                  {p.financials.overdue_invoices > 0 && (
                    <span className="cm-pill cm-pill--danger cm-pill--inline">
                      {p.financials.overdue_invoices} overdue
                    </span>
                  )}
                </td>
                <td data-label="Project record: spent" className="cm-num cm-muted">
                  {inr(p.financials.expenditure_project_record)}
                </td>
                <td data-label="Project record: client paid" className="cm-num cm-muted">
                  {inr(p.financials.payments_project_record)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td data-label="Total"><strong>Total</strong></td>
              <td data-label="Budget" className="cm-num"><strong>{inr(fin.total_budget)}</strong></td>
              <td data-label="Expenditure" className="cm-num"><strong>{inr(fin.expenditure_ledger)}</strong></td>
              <td data-label="Payments received" className="cm-num"><strong>{inr(fin.payments_ledger)}</strong></td>
              <td data-label="Outstanding invoices" className="cm-num"><strong>{inr(fin.outstanding_invoices)}</strong></td>
              <td data-label="Project record: spent" className="cm-num cm-muted">{inr(fin.expenditure_project_record)}</td>
              <td data-label="Project record: client paid" className="cm-num cm-muted">{inr(fin.payments_project_record)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="cm-inline-note">
        <Info size={15} />
        <span>
          Expenditure comes from approved/paid expenses; payments from completed
          incoming payments; outstanding is the unpaid balance of open invoices
          (not budget minus expenditure). The two “Project record” columns are
          the values stored on the project itself and are shown for comparison.
          {ledgerDiffers && (
            <strong> They currently differ from the Finance records.</strong>
          )}
        </span>
      </div>
      <div className="cm-link-row">
        <Link to="/finance-manager/invoices" className="cm-btn cm-btn--outline cm-btn--sm">
          <ExternalLink size={13} /> Invoices
        </Link>
        <Link to="/finance-manager/payments" className="cm-btn cm-btn--outline cm-btn--sm">
          <ExternalLink size={13} /> Payments
        </Link>
        <Link to="/pm/cost-reports" className="cm-btn cm-btn--outline cm-btn--sm">
          <ExternalLink size={13} /> Cost reports
        </Link>
      </div>
    </>
  );

  const renderActivity = () => {
    if (activityError) return <SectionError message={activityError} />;
    if (!activity) return <Empty>No activity information is available.</Empty>;
    if (!activity.has_projects)
      return <Empty>No projects yet, so there is no project activity.</Empty>;

    const { recent_updates, milestones, outstanding_invoices, incidents, rfis, pending_approvals } =
      activity;
    const ov = milestones?.overview;

    return (
      <div className="cm-activity">
        {/* Milestones */}
        <section className="cm-block">
          <h4 className="cm-block__title">Milestone progress</h4>
          {!milestones.ok ? (
            <SectionError message={milestones.error} />
          ) : ov.total === 0 ? (
            <Empty>No milestones have been created for these projects.</Empty>
          ) : (
            <>
              <div className="cm-chips">
                <span className="cm-chip">Total <strong>{ov.total}</strong></span>
                <span className="cm-chip cm-chip--green">Done <strong>{ov.done}</strong></span>
                <span className="cm-chip cm-chip--blue">In progress <strong>{ov.in_progress}</strong></span>
                <span className="cm-chip cm-chip--red">Delayed <strong>{ov.delayed}</strong></span>
                <span className="cm-chip">Not started <strong>{ov.pending}</strong></span>
              </div>
              {milestones.attention.length === 0 ? (
                <Empty>No delayed milestones or milestones due in the next 30 days.</Empty>
              ) : (
                <ul className="cm-list">
                  {milestones.attention.map((m) => (
                    <li key={m.id}>
                      <div>
                        <strong>{m.name}</strong>
                        <span className="cm-list__meta">
                          {m.project_name} · due {fmtDate(m.due_date)} · {Number(m.progress) || 0}% complete
                        </span>
                      </div>
                      <span
                        className={
                          m.kind === "delayed"
                            ? "cm-pill cm-pill--danger"
                            : "cm-pill cm-pill--warning"
                        }
                      >
                        {m.kind === "delayed" ? "Delayed" : "Due soon"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>

        {/* Recent updates */}
        <section className="cm-block">
          <h4 className="cm-block__title">Recent project updates</h4>
          {!recent_updates.ok ? (
            <SectionError message={recent_updates.error} />
          ) : recent_updates.items.length === 0 ? (
            <Empty>No site updates have been submitted yet.</Empty>
          ) : (
            <ul className="cm-list">
              {recent_updates.items.map((u) => (
                <li key={u.id}>
                  <div>
                    <strong>{u.project_name}</strong>
                    <span className="cm-list__text">{u.work_done || "No summary provided."}</span>
                    <span className="cm-list__meta">
                      {fmtDate(u.report_date)}
                      {u.submitted_by_name ? ` · ${u.submitted_by_name}` : ""}
                      {u.issues ? ` · Issue: ${u.issues}` : ""}
                    </span>
                  </div>
                  {u.delay_type && (
                    <span className="cm-pill cm-pill--warning">{u.delay_type}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="cm-link-row">
            <Link to="/pm/daily-updates" className="cm-btn cm-btn--outline cm-btn--sm">
              <ExternalLink size={13} /> All daily updates
            </Link>
          </div>
        </section>

        {/* Outstanding invoices */}
        <section className="cm-block">
          <h4 className="cm-block__title">Outstanding invoices</h4>
          {!outstanding_invoices.ok ? (
            <SectionError message={outstanding_invoices.error} />
          ) : outstanding_invoices.items.length === 0 ? (
            <Empty>No outstanding invoices.</Empty>
          ) : (
            <ul className="cm-list">
              {outstanding_invoices.items.map((i) => (
                <li key={i.id}>
                  <div>
                    <strong>{i.invoice_number || `Invoice #${i.id}`}</strong>
                    <span className="cm-list__meta">
                      {i.project_name} · due {fmtDate(i.due_date)} · balance {inr(i.balance)}
                    </span>
                  </div>
                  <span
                    className={
                      i.is_overdue ? "cm-pill cm-pill--danger" : "cm-pill cm-pill--warning"
                    }
                  >
                    {i.is_overdue ? "Overdue" : titleCase(i.status)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Incidents */}
        <section className="cm-block">
          <h4 className="cm-block__title">
            Incidents{incidents.ok && ` · ${incidents.open_count} open`}
          </h4>
          {!incidents.ok ? (
            <SectionError message={incidents.error} />
          ) : incidents.items.length === 0 ? (
            <Empty>No incidents recorded.</Empty>
          ) : (
            <ul className="cm-list">
              {incidents.items.map((i) => (
                <li key={i.id}>
                  <div>
                    <strong>{i.incident_no ? `${i.incident_no} · ` : ""}{i.title}</strong>
                    <span className="cm-list__meta">
                      {i.project_name} · {fmtDate(i.created_at)} · {titleCase(i.status)}
                    </span>
                  </div>
                  <span className={priorityClass(i.priority)}>{titleCase(i.priority)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="cm-link-row">
            <Link to="/pm/incidents" className="cm-btn cm-btn--outline cm-btn--sm">
              <ExternalLink size={13} /> Incident management
            </Link>
          </div>
        </section>

        {/* RFIs */}
        <section className="cm-block">
          <h4 className="cm-block__title">
            RFIs{rfis.ok && ` · ${rfis.open_count} open`}
          </h4>
          {!rfis.ok ? (
            <SectionError message={rfis.error} />
          ) : rfis.items.length === 0 ? (
            <Empty>No RFIs raised.</Empty>
          ) : (
            <ul className="cm-list">
              {rfis.items.map((r) => (
                <li key={r.id}>
                  <div>
                    <strong>{r.subject}</strong>
                    <span className="cm-list__meta">
                      {r.project_name} · {fmtDate(r.created_at)} · {titleCase(r.status)}
                    </span>
                  </div>
                  <span className={priorityClass(r.priority)}>{titleCase(r.priority)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Approvals */}
        <section className="cm-block">
          <h4 className="cm-block__title">Pending approvals</h4>
          <div className="cm-inline-note">
            <Info size={15} />
            <span>{pending_approvals?.error}</span>
          </div>
        </section>
      </div>
    );
  };

  /* ── render ── */
  return (
    <div className="cm-page">
      <button type="button" className="cm-back" onClick={back}>
        <ArrowLeft size={16} /> Back to Client Directory
      </button>

      {/* Profile */}
      <section className="cm-profile">
        <div className="cm-profile__main">
          <span className="cm-avatar cm-avatar--lg">{initials(profile.name)}</span>
          <div className="cm-profile__id">
            <h1 className="cm-title">{profile.name}</h1>
            <span className="cm-profile__sub">
              <span className="cm-code">{profile.client_code}</span>
              <span className={accountStatusClass(profile.status)}>
                {titleCase(profile.status)}
              </span>
            </span>
          </div>
        </div>
        <dl className="cm-profile__grid">
          <div>
            <dt><Hash size={14} /> Client ID</dt>
            <dd>{profile.client_code}</dd>
          </div>
          <div>
            <dt><Mail size={14} /> Email</dt>
            <dd>{profile.email || "—"}</dd>
          </div>
          <div>
            <dt><Phone size={14} /> Phone</dt>
            <dd>
              {profile.phone || "—"}
              {profile.phone_source === "project_contact" && (
                <span className="cm-dd-note">from project contact</span>
              )}
            </dd>
          </div>
          <div>
            <dt><CalendarDays size={14} /> Created</dt>
            <dd>{profile.created_at ? fmtDate(profile.created_at) : "Not recorded"}</dd>
          </div>
        </dl>
      </section>

      {/* KPI strip */}
      <section className="cm-stats cm-stats--tight">
        <Stat label="Total projects" value={counts.total_projects} tone="blue" />
        <Stat label="Active" value={counts.active_projects} tone="indigo" />
        <Stat label="Completed" value={counts.completed_projects} tone="green" />
        <Stat label="Combined budget" value={inr(fin.total_budget)} tone="amber" />
      </section>

      {/* Tabs */}
      <section className="cm-panel">
        <div className="cm-tabs" role="tablist">
          {TABS.map((t) => {
            const { key, label } = t;
            const Icon = t.icon;
            return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`cm-tab ${tab === key ? "is-active" : ""}`}
              onClick={() => setTab(key)}
            >
              <Icon size={15} /> {label}
            </button>
            );
          })}
        </div>
        <div className="cm-panel__body" role="tabpanel">
          {tab === "projects" && projectsPanel}
          {tab === "team" && teamPanel}
          {tab === "finance" && financePanel}
          {tab === "activity" && renderActivity()}
        </div>
      </section>
    </div>
  );
}

export default ClientDetails;