// FILE PATH: src/context/useSENotifications.js

import { useContext } from "react";
import { SENotificationContext } from "./SENotificationContext";

export function useSENotifications() {
  const ctx = useContext(SENotificationContext);
  if (!ctx) {
    throw new Error(
      "useSENotifications must be used inside <SENotificationProvider>.\n" +
      "Make sure your StructuralEngineerLayout wraps children with <SENotificationProvider>."
    );
  }
  return ctx;
}