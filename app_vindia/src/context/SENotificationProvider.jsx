import { useState, useEffect, useCallback } from "react";
import { SENotificationContext } from "./SENotificationContext";
import { fetchSENotifications } from "../services/seNotificationService";

const STATIC_FALLBACK = [
  { id: "s1",  type: "drawing",  severity: "critical", title: "Drawing Review Pending",   description: "Eiffel Tower – Revised structural drawings awaiting your review",   created_at: new Date(), is_read: false, link: "/structural-engineer/drawings"            },
  { id: "s2",  type: "incident", severity: "critical", title: "Structural Issue Alert",   description: "Beam deflection exceeded tolerance on Block B – check needed",       created_at: new Date(), is_read: false, link: "/structural-engineer/incidents"           },
  { id: "s3",  type: "rfi",      severity: "warn",     title: "RFI Response Due",         description: "Slab thickness clarification – response due today EOD",              created_at: new Date(), is_read: false, link: "/structural-engineer/rfi"                 },
  { id: "s4",  type: "task",     severity: "critical", title: "Task Overdue",             description: "Column layout verification task is past deadline",                   created_at: new Date(), is_read: false, link: "/structural-engineer/incidents?page=tasks" },
  { id: "s5",  type: "work",     severity: "warn",     title: "Daily Update Due",         description: "Today's structural site update not yet submitted",                   created_at: new Date(), is_read: false, link: "/structural-engineer/daily-updates"        },
  { id: "s6",  type: "boq",      severity: "info",     title: "BOQ Updated",              description: "Bill of Quantities updated – review required",                       created_at: new Date(), is_read: false, link: "/structural-engineer/boq"                 },
  { id: "s7",  type: "handover", severity: "warn",     title: "Handover Pending",         description: "NH-66 structural handover to QS not yet completed",                  created_at: new Date(), is_read: false, link: "/structural-engineer/handover"            },
  { id: "s8",  type: "approval", severity: "warn",     title: "Approval Pending",         description: "Block C structural start awaiting PM sign-off",                     created_at: new Date(), is_read: false, link: "/structural-engineer/approvals"           },
  { id: "s9",  type: "analysis", severity: "warn",     title: "Progress At Risk",         description: "Structural progress behind schedule – review analysis",              created_at: new Date(), is_read: false, link: "/structural-engineer/analysis"            },
  { id: "s10", type: "drawing",  severity: "ok",       title: "Drawing Approved",         description: "Eiffel Tower – Block A structural drawings approved by PM",         created_at: new Date(), is_read: true,  link: "/structural-engineer/drawings"            },
  { id: "s11", type: "rfi",      severity: "ok",       title: "RFI Closed",               description: "RFI #12 – Steel grade clarification resolved and closed",           created_at: new Date(), is_read: true,  link: "/structural-engineer/rfi"                 },
  { id: "s12", type: "incident", severity: "warn",     title: "Crack Observed",           description: "NH-66 – Hairline crack in retaining wall, Block D",                 created_at: new Date(), is_read: true,  link: "/structural-engineer/incidents"           },
];

export function SENotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(STATIC_FALLBACK);
  const [loading, setLoading]             = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchSENotifications();
      if (data && data.length > 0) setNotifications(data);
    } catch {
      // keep fallback silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount        = notifications.filter(n => !n.is_read).length;
  const markRead           = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  const markAllRead        = ()   => setNotifications(p => p.map(n => ({ ...n, is_read: true })));
  const removeNotification = (id) => setNotifications(p => p.filter(n => n.id !== id)); // ✅ INSIDE component

  return (
    <SENotificationContext.Provider value={{ notifications, unreadCount, loading, markRead, markAllRead, removeNotification, refresh: load }}>
      {children}
    </SENotificationContext.Provider>
  );
}