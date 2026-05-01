// FILE PATH: src/context/useSENotifications.js
// ─────────────────────────────────────────────────────────────────────────────
// Convenience hook — throws a clear error if used outside the provider.
// ─────────────────────────────────────────────────────────────────────────────

import { useContext } from "react";
import { SENotificationContext } from "./SENotificationContext";

export function useSENotifications() {
  const ctx = useContext(SENotificationContext);

  if (!ctx) {
    throw new Error(
      "useSENotifications() must be used inside <SENotificationProvider>.\n" +
      "Make sure StructuralEngineerLayout wraps its children with <SENotificationProvider>."
    );
  }

  return ctx;
}