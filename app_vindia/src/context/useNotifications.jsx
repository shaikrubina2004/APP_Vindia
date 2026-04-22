import { createContext, useContext, useState } from "react";

const NotificationContext = createContext(null);

const ALL_NOTIFICATIONS = [
  { id: 1,  type: "incident", severity: "critical", title: "Critical Incident",   desc: "Worker injury reported on Block B – Eiffel Tower",         time: "30m ago", read: false },
  { id: 2,  type: "payment",  severity: "critical", title: "Payment Overdue",      desc: "NH-66 Road Base Layer – ₹1.2Cr overdue by 45 days",        time: "2h ago",  read: false },
  { id: 3,  type: "payment",  severity: "warn",     title: "Payment Due Soon",      desc: "Eiffel Tower – Milestone 2 payment due in 5 days",         time: "4h ago",  read: false },
  { id: 4,  type: "payment",  severity: "ok",       title: "Payment Received",      desc: "Eiffel Tower – Advance ₹42L received from XBC Developers", time: "1d ago",  read: false },
  { id: 5,  type: "incident", severity: "warn",     title: "Incident Raised",       desc: "NH-66 – Scaffolding collapse reported by site engineer",   time: "3h ago",  read: false },
  { id: 6,  type: "work",     severity: "warn",     title: "Pending Work Alert",    desc: "Eiffel Tower – Block A concrete pouring pending 3 days",   time: "1d ago",  read: true  },
  { id: 7,  type: "work",     severity: "warn",     title: "Daily Update Due",      desc: "Today's site update not yet submitted",                    time: "Today",   read: false },
  { id: 8,  type: "approval", severity: "info",     title: "Approval Pending",      desc: "Block C start awaiting Project Manager approval",          time: "2d ago",  read: true  },
  { id: 9,  type: "payment",  severity: "warn",     title: "Invoice Not Raised",    desc: "Tajmahal Advance – invoice not yet submitted",             time: "3d ago",  read: true  },
  { id: 10, type: "work",     severity: "ok",       title: "Milestone Completed",   desc: "Eiffel Tower – Foundation milestone marked complete",      time: "2d ago",  read: true  },
];

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(ALL_NOTIFICATIONS);
  const [showPanel, setShowPanel]         = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;
  const markRead    = (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = ()   => setNotifications(p => p.map(n => ({ ...n, read: true })));

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, showPanel, setShowPanel, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
