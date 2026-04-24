import { useContext } from "react";
import { SENotificationContext } from "./SENotificationContext";

export function useSENotifications() {
  const ctx = useContext(SENotificationContext);
  if (!ctx) throw new Error("useSENotifications must be inside SENotificationProvider");
  return ctx;
}