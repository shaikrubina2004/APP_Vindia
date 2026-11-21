import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../context/useAuth";
import "./CoverAlertPopup.css";

/* Role codes that are a BDA (same list as the backend) */
const BDA_ROLES = ["bda", "bda1", "bda2", "business_development", "business_development_analyst"];

const seenKey  = (l) => `cover_seen:${l.id}:${l.cover_since}`;   // "I opened Follow-ups for this"
const laterKey = (l) => `cover_later:${l.id}:${l.cover_since}`;  // "remind me later" (this session)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

function daysLate(d) {
  if (!d) return 0;
  const due = new Date(d); due.setHours(0, 0, 0, 0);
  const now = new Date();  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - due) / 86400000));
}

/* Pop-up shown to a BDA when another BDA's lead was handed to them
   because its follow-up date was missed. Mounted once in BDALayout. */
export default function CoverAlertPopup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = String(user?.role || "").trim().toLowerCase().replace(/\s+/g, "_");
  const isBda = BDA_ROLES.includes(role);

  const [leads, setLeads] = useState([]);
  const [, bump] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/lead-cover/mine");
      setLeads(res.data.data || []);
    } catch { /* not a BDA / offline — stay silent */ }
  }, []);

  useEffect(() => {
    if (!isBda) return undefined;
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [isBda, load]);

  // leads the BDA hasn't acknowledged yet
  const pending = useMemo(
    () => leads.filter((l) => !localStorage.getItem(seenKey(l)) && !sessionStorage.getItem(laterKey(l))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leads, bump]
  );

  if (!isBda || pending.length === 0 || pathname === "/bda/follow-up") return null;

  const later = () => {
    pending.forEach((l) => sessionStorage.setItem(laterKey(l), "1"));
    bump((n) => n + 1);
  };
  const open = () => {
    pending.forEach((l) => localStorage.setItem(seenKey(l), "1"));
    bump((n) => n + 1);
    navigate("/bda/follow-up");
  };

  return (
    <div className="cvr-overlay" role="dialog" aria-modal="true">
      <div className="cvr-modal">
        <div className="cvr-head">
          <span className="cvr-head__icon">⚠️</span>
          <div>
            <h2 className="cvr-head__title">
              Follow-up needed{pending.length > 1 ? ` (${pending.length})` : ""}
            </h2>
            <p className="cvr-head__sub">
              {pending.length > 1 ? "These leads belong" : "This lead belongs"} to other BDAs and
              weren't followed up on time. Please call the client now.
            </p>
          </div>
        </div>

        <ul className="cvr-list">
          {pending.slice(0, 5).map((l) => (
            <li key={l.id} className="cvr-item">
              <div className="cvr-item__main">
                <strong>{l.name}</strong>
                {l.phone && <a className="cvr-item__phone" href={`tel:${l.phone}`}>📞 {l.phone}</a>}
              </div>
              <div className="cvr-item__meta">
                <span className="cvr-chip">{l.owner_name ? `${l.owner_name.trim()}'s lead` : "Another BDA's lead"}</span>
                <span>Due {fmtDate(l.next_followup)}</span>
                {daysLate(l.next_followup) > 0 && (
                  <span className="cvr-late">
                    {daysLate(l.next_followup)} day{daysLate(l.next_followup) !== 1 ? "s" : ""} late
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        {pending.length > 5 && <p className="cvr-more">+ {pending.length - 5} more on your Follow-ups page</p>}

        <p className="cvr-hint">
          Log a follow-up and the lead becomes yours.
        </p>

        <div className="cvr-actions">
          <button className="cvr-btn cvr-btn--ghost" onClick={later}>Remind me later</button>
          <button className="cvr-btn cvr-btn--primary" onClick={open}>Open Follow-ups</button>
        </div>
      </div>
    </div>
  );
}