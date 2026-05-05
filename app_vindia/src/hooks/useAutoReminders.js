// src/hooks/useAutoReminders.js
// Call this once in SiteEngineerDashboard or a top-level layout component.
// It runs checks every hour and pushes notifications via NotificationContext.
import { useEffect, useRef } from "react";
import api from "../services/api";
import { useNotifications } from "../context/NotificationContext";

const CHECKED_KEY = "se:reminders:checked:v1";
const ls = {
  load: k => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } },
  save: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysAgo(iso, n) {
  return (Date.now() - new Date(iso).getTime()) > n * 86_400_000;
}
function isTomorrow(iso) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return iso?.slice(0, 10) === tomorrow.toISOString().slice(0, 10);
}
function isToday(iso) { return iso?.slice(0, 10) === todayISO(); }
function isPast(iso) { return iso && iso.slice(0, 10) < todayISO(); }

export function useAutoReminders() {
  const { push } = useNotifications();
  const running  = useRef(false);

  async function check() {
    if (running.current) return;
    running.current = true;

    // Throttle: only run once per hour per session
    const last = ls.load(CHECKED_KEY);
    const now  = Date.now();
    if (last && now - last < 3_600_000) { running.current = false; return; }
    ls.save(CHECKED_KEY, now);

    try {
      const [taskRes, rfiRes, matRes] = await Promise.allSettled([
        api.get("/tasks"),
        api.get("/site-engineer/rfi"),
        api.get("/material-request"),
      ]);

      /* ── Tasks ── */
      const tasks = taskRes.status === "fulfilled" && Array.isArray(taskRes.value?.data)
        ? taskRes.value.data : [];

      tasks.forEach(t => {
        if (t.status === "completed" || t.status === "done") return;
        if (isToday(t.due_date)) {
          push(`Task due today: "${t.title || t.name}"`, "deadline", { linked_ref: t.refNo || `TASK-${t.id}` });
        } else if (isTomorrow(t.due_date)) {
          push(`Reminder: "${t.title || t.name}" is due tomorrow`, "task", { linked_ref: t.refNo || `TASK-${t.id}` });
        } else if (isPast(t.due_date)) {
          push(`Overdue task: "${t.title || t.name}" — was due ${t.due_date}`, "deadline", { linked_ref: t.refNo || `TASK-${t.id}` });
        }
      });

      /* ── RFIs pending > 3 days ── */
      const rfis = rfiRes.status === "fulfilled" && Array.isArray(rfiRes.value?.data)
        ? rfiRes.value.data : [];

      rfis.forEach(r => {
        if (r.status === "closed" || r.status === "responded") return;
        if (daysAgo(r.createdAt, 3)) {
          push(`RFI pending for 3+ days: "${r.title}"`, "rfi", { linked_ref: r.refNo || `RFI-${r.id}` });
        }
        if (r.response_required_by && isPast(r.response_required_by)) {
          push(`RFI response overdue: "${r.title}" — required by ${r.response_required_by}`, "deadline", { linked_ref: r.refNo || `RFI-${r.id}` });
        }
      });

      /* ── Material requests approved but not delivered ── */
      const mats = matRes.status === "fulfilled" && Array.isArray(matRes.value?.data)
        ? matRes.value.data : [];

      mats.forEach(m => {
        if (m.status !== "approved") return;
        if (isToday(m.required_by)) {
          push(`Material delivery due today: "${m.purpose}"`, "material", { linked_ref: m.refNo || `MR-${m.id}` });
        } else if (isPast(m.required_by)) {
          push(`Material overdue: "${m.purpose}" was required by ${m.required_by}`, "deadline", { linked_ref: m.refNo || `MR-${m.id}` });
        }
      });

    } catch { /* offline — skip */ }
    finally { running.current = false; }
  }

  useEffect(() => {
    check();
    const interval = setInterval(check, 3_600_000); // re-check every hour
    return () => clearInterval(interval);
  }, []);
}

export default useAutoReminders;