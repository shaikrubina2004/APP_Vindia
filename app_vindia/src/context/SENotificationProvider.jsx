import { useState, useEffect, useCallback } from "react";
import { SENotificationContext } from "./SENotificationContext";
import { fetchSENotifications } from "../services/seNotificationService";

const STATIC_FALLBACK = [
  { id: "s1",  type: "drawing",  severity: "critical", title: "Drawing Review Pending",  description: "Eiffel Tower – Revised structural drawings awaiting your review",   created_at: new Date(), is_read: false },
  { id: "s2",  type: "incident", severity: "critical", title: "Structural Issue Alert",  description: "Beam deflection exceeded tolerance on Block B – check needed",       created_at: new Date(), is_read: false },
  { id: "s3",  type: "rfi",      severity: "warn",     title: "RFI #14 Response Due",    description: "Slab thickness clarification – response due today EOD",              created_at: new Date(), is_read: false },
  { id: "s4",  type: "drawing",  severity: "warn",     title: "Drawing Version Updated", description: "NH-66 – Foundation drawing updated to v2.3 by site team",           created_at: new Date(), is_read: false },
  { id: "s5",  type: "work",     severity: "warn",     title: "Daily Update Due",        description: "Today's structural site update not yet submitted",                   created_at: new Date(), is_read: false },
  { id: "s6",  type: "incident", severity: "warn",     title: "Crack Observed",          description: "NH-66 – Hairline crack in retaining wall, Block D",                 created_at: new Date(), is_read: false },
  { id: "s7",  type: "work",     severity: "warn",     title: "Rework Required",         description: "Block C – Footing layout deviates from structural drawing",         created_at: new Date(), is_read: false },
  { id: "s8",  type: "approval", severity: "warn",     title: "Approval Pending",        description: "Block C structural start awaiting PM sign-off",                     created_at: new Date(), is_read: false },
  { id: "s9",  type: "work",     severity: "warn",     title: "Inspection Due",          description: "Tajmahal – Column reinforcement inspection scheduled for tomorrow",  created_at: new Date(), is_read: true  },
  { id: "s10", type: "drawing",  severity: "ok",       title: "Drawing Approved",        description: "Eiffel Tower – Block A structural drawings approved by PM",         created_at: new Date(), is_read: true  },
  { id: "s11", type: "rfi",      severity: "ok",       title: "RFI Closed",              description: "RFI #12 – Steel grade clarification resolved and closed",           created_at: new Date(), is_read: true  },
  { id: "s12", type: "approval", severity: "info",     title: "Material Test Report",    description: "Concrete cube test report uploaded for your review – Eiffel Tower",  created_at: new Date(), is_read: true  },
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

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const markRead    = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, is_read: true } : n));
  const markAllRead = ()   => setNotifications(p => p.map(n => ({ ...n, is_read: true })));

  return (
    <SENotificationContext.Provider value={{ notifications, unreadCount, loading, markRead, markAllRead, refresh: load }}>
      {children}
    </SENotificationContext.Provider>
  );
}